import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { cents } from "../../packages/core/money.mjs";
import { processor } from "../commerce/processor.mjs";

export async function refund(key) {
  const [r] = await query(
    `SELECT
      d.*,
      dv.precio_unitario,
      pg.referencia_proveedor
    FROM devoluciones_venta d
    JOIN detalle_ventas dv
      ON dv.id_venta = d.id_venta
      AND dv.id_producto = d.id_producto
    JOIN ventas v
      ON v.id = d.id_venta
    JOIN pagos pg
      ON pg.id_pedido = v.id_pedido
      AND pg.estado = 'capturado'
    WHERE d.id = ?`,
    [key],
  );

  ensure(r, 404, "Devolución no encontrada");

  ensure(
    r.estado === "recibida" || r.estado === "reembolsada",
    409,
    "Primero recibe la devolución",
  );

  if (r.estado === "reembolsada") {
    return { completed: true };
  }

  ensure(
    r.referencia_proveedor,
    409,
    "No se encontró la referencia del pago original",
  );

  const stripe = processor();

  const session = await stripe.checkout.sessions.retrieve(
    r.referencia_proveedor,
  );

  ensure(
    typeof session.payment_intent === "string",
    409,
    "El pago no permite reembolso",
  );

  const paymentIntent = session.payment_intent;
  const expectedAmount = cents(r.precio_unitario) * r.cantidad;

  let result;

  if (r.referencia_reembolso) {
    result = await stripe.refunds.retrieve(r.referencia_reembolso);
  } else {
    // Recuperar reembolsos existentes para evitar duplicaciones.
    for await (const previous of stripe.refunds.list({
      payment_intent: paymentIntent,
      limit: 100,
    })) {
      if (previous.metadata?.devolucion_id === String(key)) {
        result = previous;
        break;
      }
    }

    result ??= await stripe.refunds.create(
      {
        payment_intent: paymentIntent,
        amount: expectedAmount,
        metadata: {
          devolucion_id: String(key),
        },
      },
      {
        idempotencyKey: `lc-return-${key}`,
      },
    );
  }

  ensure(
    result.payment_intent === paymentIntent &&
      result.currency === "mxn",
    409,
    "El reembolso no corresponde al pago original",
  );

  ensure(
    result.amount === expectedAmount,
    409,
    "El reembolso confirmado no coincide con la devolución",
  );

  await transaction(async (connection) => {
    await query(
      `UPDATE devoluciones_venta
       SET
         referencia_reembolso = ?,
         estado_reembolso = ?,
         estado = IF(? = 'succeeded', 'reembolsada', estado)
       WHERE id = ?
         AND estado IN ('recibida', 'reembolsada')`,
      [result.id, result.status, result.status, key],
      connection,
    );
  });

  return {
    completed: result.status === "succeeded",
    status: result.status,
  };
}
