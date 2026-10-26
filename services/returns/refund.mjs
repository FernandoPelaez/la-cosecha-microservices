import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { cents } from "../../packages/core/money.mjs";
import { processor } from "../commerce/processor.mjs";
export async function refund(key) {
  const [r] = await query(
    "SELECT d.*,dv.precio_unitario,pg.referencia_proveedor FROM devoluciones_venta d JOIN detalle_ventas dv ON dv.id_venta=d.id_venta AND dv.id_producto=d.id_producto JOIN ventas v ON v.id=d.id_venta JOIN pagos pg ON pg.id_pedido=v.id_pedido AND pg.estado='capturado' WHERE d.id=?",
    [key],
  );
  ensure(r, 404, "Devolución no encontrada");
  ensure(
    r.estado === "recibida" || r.estado === "reembolsada",
    409,
    "Primero recibe la devolución",
  );
  if (r.estado === "reembolsada") return { completed: true };
  const session = await processor().checkout.sessions.retrieve(
    r.referencia_proveedor,
  );
  ensure(
    typeof session.payment_intent === "string",
    409,
    "El pago no permite reembolso",
  );
  const stripe = processor();
  let result;
  if (r.referencia_reembolso) {
    result = await stripe.refunds.retrieve(r.referencia_reembolso);
  } else {
    // Recuperar un cobro revertido aunque el proceso cayera antes de guardar su ID.
    // La búsqueda por metadata también cubre reintentos después de la ventana de idempotencia.
    for await (const previous of stripe.refunds.list({
      payment_intent: session.payment_intent,
      limit: 100,
    })) {
      if (previous.metadata?.devolucion_id === String(key)) {
        result = previous;
        break;
      }
    }
    result ??= await stripe.refunds.create(
      {
        payment_intent: session.payment_intent,
        amount: cents(r.precio_unitario) * r.cantidad,
        metadata: { devolucion_id: String(key) },
      },
      { idempotencyKey: `lc-return-${key}` },
    );
  }
  ensure(
    result.amount === cents(r.precio_unitario) * r.cantidad,
    409,
    "El reembolso confirmado no coincide con la devolución",
  );
  await transaction(async (c) => {
    await query(
      "UPDATE devoluciones_venta SET referencia_reembolso=?,estado_reembolso=?,estado=IF(?='succeeded','reembolsada',estado) WHERE id=? AND estado IN ('recibida','reembolsada')",
      [result.id, result.status, result.status, key],
      c,
    );
  });

  return { completed: result.status === "succeeded", status: result.status };
}
