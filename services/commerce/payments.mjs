import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { cents } from "../../packages/core/money.mjs";
import { moveStock } from "../../packages/core/stock.mjs";
// Solo lo invoca el webhook firmado o la reconciliación autenticada con Stripe.
export async function settleSession(session, eventId, eventType = "") {
  return transaction(async (c) => {
    // La clave única también serializa dos entregas simultáneas del mismo evento.
    const accepted = await query(
      "INSERT IGNORE INTO eventos_pago(id_evento) VALUES (?)",
      [eventId],
      c,
    );
    if (!accepted.affectedRows) return { duplicate: true };
    const orderId = Number(session.client_reference_id);
    ensure(
      Number.isSafeInteger(orderId) && orderId > 0,
      422,
      "Pedido inválido",
    );
    const [order] = await query(
      "SELECT p.*,cl.id_usuario FROM pedidos p JOIN clientes cl ON cl.id=p.id_cliente WHERE p.id=? FOR UPDATE",
      [orderId],
      c,
    );
    ensure(order, 404, "Pedido no encontrado");
    const [payment] = await query(
      "SELECT * FROM pagos WHERE id_pedido=? AND proveedor_pago='stripe' FOR UPDATE",
      [order.id],
      c,
    );
    ensure(
      payment &&
        (!payment.referencia_proveedor ||
          payment.referencia_proveedor === session.id),
      409,
      "Referencia de pago inválida",
    );
    ensure(
      session.currency === "mxn" && session.amount_total === cents(order.total),
      409,
      "El importe confirmado no coincide",
    );
    if (session.payment_status === "paid") {
      if (order.estado === "pendiente") {
        await query(
          "UPDATE pagos SET estado='capturado',referencia_proveedor=? WHERE id=?",
          [session.id, payment.id],
          c,
        );
        await query(
          "UPDATE pedidos SET estado='pagado',vence_reserva=NULL WHERE id=?",
          [order.id],
          c,
        );
        const sale = await query(
          "INSERT INTO ventas(id_pedido,id_cliente,total) VALUES (?,?,?)",
          [order.id, order.id_cliente, order.total],
          c,
        );
        await query(
          "INSERT INTO detalle_ventas(id_venta,id_producto,cantidad,precio_unitario) SELECT ?,id_producto,cantidad,precio_unitario-descuento_unitario FROM detalle_pedidos WHERE id_pedido=?",
          [sale.insertId, order.id],
          c,
        );
        await query(
          "INSERT INTO comprobantes(id_venta,folio) VALUES (?,?)",
          [sale.insertId, `LC-${String(sale.insertId).padStart(8, "0")}`],
          c,
        );
        await query(
          "INSERT INTO cola_comprobantes(id_venta) VALUES (?)",
          [sale.insertId],
          c,
        );
        await query(
          "INSERT INTO envios(id_venta,id_direccion) VALUES (?,?)",
          [sale.insertId, order.id_direccion],
          c,
        );
      } else
        ensure(
          order.estado !== "cancelado",
          409,
          "Pago recibido para pedido cancelado; requiere conciliación",
        );
    } else if (
      (session.status === "expired" ||
        eventType === "checkout.session.async_payment_failed") &&
      order.estado === "pendiente"
    ) {
      const details = await query(
        "SELECT * FROM detalle_pedidos WHERE id_pedido=? ORDER BY id_producto",
        [order.id],
        c,
      );
      for (const d of details)
        await moveStock(
          c,
          d.id_producto,
          d.cantidad,
          order.id_usuario,
          `Liberación de reserva ${order.id}`,
        );
      await query(
        "UPDATE pedidos SET estado='cancelado',vence_reserva=NULL WHERE id=?",
        [order.id],
        c,
      );
      await query(
        "UPDATE pagos SET estado=?,referencia_proveedor=? WHERE id=?",
        [
          eventType === "checkout.session.async_payment_failed"
            ? "rechazado"
            : "cancelado",
          session.id,
          payment.id,
        ],
        c,
      );
    }
    return { completed: true };
  });
}
