import { query } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { processor } from "./processor.mjs";
import { settleSession } from "./payments.mjs";

// El retorno del navegador sólo solicita una consulta: nunca acredita un pago.
// La respuesta autenticada del proveedor utiliza la misma transacción del webhook.
export async function orderResult(user, orderId) {
  const select = () =>
    query(
      `SELECT p.id,p.estado,p.total,v.id AS venta_id,
    pg.referencia_proveedor FROM pedidos p
    LEFT JOIN ventas v ON v.id_pedido=p.id
    LEFT JOIN pagos pg ON pg.id_pedido=p.id
    WHERE p.id=? AND p.id_cliente=?`,
      [orderId, user.clienteId],
    );
  let [order] = await select();
  ensure(order, 404, "Pedido no encontrado");
  if (order.estado === "pendiente" && order.referencia_proveedor) {
    const session = await processor().checkout.sessions.retrieve(
      order.referencia_proveedor,
    );
    ensure(
      String(session.client_reference_id) === String(orderId),
      409,
      "La sesión pertenece a otro pedido",
    );
    if (session.payment_status === "paid" || session.status === "expired") {
      await settleSession(
        session,
        `return-${session.id}-${session.status}-${session.payment_status}`,
      );
      [order] = await select();
    }
  }
  const { referencia_proveedor: _reference, ...result } = order;
  return result;
}
