import { query } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { processor } from "./processor.mjs";
import { settleSession } from "./payments.mjs";

// Nunca liberar una reserva sólo por el botón del navegador o por el reloj local.
// Stripe debe confirmar que la sesión expiró; un cobro concurrente se concilia.
export async function cancelOrder(user, orderId) {
  const [order] = await query(
    "SELECT p.id,p.estado,pg.referencia_proveedor FROM pedidos p JOIN pagos pg ON pg.id_pedido=p.id WHERE p.id=? AND p.id_cliente=?",
    [orderId, user.clienteId],
  );
  ensure(order, 404, "Pedido no encontrado");
  if (order.estado === "cancelado") return { completed: true };
  ensure(
    order.estado === "pendiente",
    409,
    "Este pedido ya no puede cancelarse antes del pago",
  );
  ensure(
    order.referencia_proveedor,
    409,
    "La sesión de pago requiere conciliación antes de liberar la reserva",
  );
  let session = await processor().checkout.sessions.retrieve(
    order.referencia_proveedor,
  );
  if (session.status === "open") {
    try {
      session = await processor().checkout.sessions.expire(session.id);
    } catch {
      session = await processor().checkout.sessions.retrieve(session.id);
    }
  }
  if (session.payment_status === "paid" || session.status === "expired")
    await settleSession(
      session,
      `cancel-${session.id}-${session.status}-${session.payment_status}`,
    );
  ensure(
    session.status === "expired" && session.payment_status !== "paid",
    409,
    session.payment_status === "paid"
      ? "El pago ya fue confirmado; consulta las opciones de posventa"
      : "El pago sigue en procesamiento; no se liberaron existencias",
  );
  return { completed: true };
}
