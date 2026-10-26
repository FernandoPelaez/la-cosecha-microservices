import { query, pool } from "../packages/core/db.mjs";
import { processor } from "../services/commerce/processor.mjs";
import { settleSession } from "../services/commerce/payments.mjs";
// Ejecutar periódicamente para recuperar webhooks que no llegaron. Nunca inferir un pago por la URL del cliente.
try {
  const rows = await query(
    "SELECT pg.referencia_proveedor FROM pagos pg JOIN pedidos p ON p.id=pg.id_pedido WHERE p.estado='pendiente' AND pg.referencia_proveedor IS NOT NULL LIMIT 500",
  );
  for (const r of rows) {
    const session = await processor().checkout.sessions.retrieve(
      r.referencia_proveedor,
    );
    if (session.payment_status === "paid" || session.status === "expired")
      await settleSession(
        session,
        `reconcile-${session.id}-${session.status}-${session.payment_status}`,
      );
  }
  console.log("Conciliación terminada");
} finally {
  await pool.end();
}
