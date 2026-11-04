import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { cents } from "../../packages/core/money.mjs";
import { processor } from "../commerce/processor.mjs";

// Procesa el reembolso de una devolución previamente recibida.
export async function refund(key) {
  const [returnRecord] = await query(
    `
      SELECT
        d.*,
        dv.precio_unitario,
        pg.referencia_proveedor
      FROM devoluciones_venta AS d
      INNER JOIN detalle_ventas AS dv
        ON dv.id_venta = d.id_venta
        AND dv.id_producto = d.id_producto
      INNER JOIN ventas AS v
        ON v.id = d.id_venta
      INNER JOIN pagos AS pg
        ON pg.id_pedido = v.id_pedido
        AND pg.estado = 'capturado'
      WHERE d.id = ?
    `,
    [key],
  );

  ensure(
    returnRecord,
    404,
    "Devolución no encontrada",
  );

  ensure(
    returnRecord.estado === "recibida" ||
      returnRecord.estado === "reembolsada",
    409,
    "Primero recibe la devolución",
  );

  if (returnRecord.estado === "reembolsada") {
    return { completed: true };
  }

  ensure(
    returnRecord.referencia_proveedor,
    409,
    "No se encontró la referencia del pago original",
  );

  const stripe = processor();

  const session = await stripe.checkout.sessions.retrieve(
    returnRecord.referencia_proveedor,
  );

  ensure(
    typeof session.payment_intent === "string",
    409,
    "El pago no permite reembolso",
  );

  const paymentIntent = session.payment_intent;

  const expectedAmount =
    cents(returnRecord.precio_unitario) * returnRecord.cantidad;

  let stripeRefund;

  if (returnRecord.referencia_reembolso) {
    stripeRefund = await stripe.refunds.retrieve(
      returnRecord.referencia_reembolso,
    );
  } else {
    // Busca reembolsos previos antes de solicitar uno nuevo.
    for await (const previous of stripe.refunds.list({
      payment_intent: paymentIntent,
      limit: 100,
    })) {
      if (previous.metadata?.devolucion_id === String(key)) {
        stripeRefund = previous;
        break;
      }
    }

    stripeRefund ??= await stripe.refunds.create(
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

  // Valida que el reembolso corresponda al pago y al importe esperado.
  ensure(
    stripeRefund.payment_intent === paymentIntent &&
      stripeRefund.currency === "mxn",
    409,
    "El reembolso no corresponde al pago original",
  );

  ensure(
    stripeRefund.amount === expectedAmount,
    409,
    "El reembolso confirmado no coincide con la devolución",
  );

  await transaction(async (connection) => {
    await query(
      `
        UPDATE devoluciones_venta
        SET
          referencia_reembolso = ?,
          estado_reembolso = ?,
          estado = IF(
            ? = 'succeeded',
            'reembolsada',
            estado
          )
        WHERE id = ?
          AND estado IN ('recibida', 'reembolsada')
      `,
      [
        stripeRefund.id,
        stripeRefund.status,
        stripeRefund.status,
        key,
      ],
      connection,
    );
  });

  return {
    completed: stripeRefund.status === "succeeded",
    status: stripeRefund.status,
  };
}

