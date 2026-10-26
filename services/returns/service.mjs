import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { moveStock } from "../../packages/core/stock.mjs";
import { assertReturnCapacity } from "./domain/capacity.ts";
const tables = { returns: "devoluciones_venta", warranties: "garantias" };
export async function list(user, kind) {
  return query(
    `SELECT r.*,p.nombre FROM ${tables[kind]} r JOIN productos p ON p.id=r.id_producto JOIN ventas v ON v.id=r.id_venta WHERE (?='ADMIN' OR v.id_cliente=?) ORDER BY r.id DESC LIMIT 500`,
    [user.rol, user.clienteId],
  );
}
export async function create(user, kind, d) {
  return transaction(async (c) => {
    const [sale] = await query(
      "SELECT * FROM ventas WHERE id=? FOR UPDATE",
      [d.id_venta],
      c,
    );
    ensure(
      sale && (user.rol === "ADMIN" || sale.id_cliente === user.clienteId),
      404,
      "Venta no encontrada",
    );
    const [detail] = await query(
      "SELECT cantidad FROM detalle_ventas WHERE id_venta=? AND id_producto=?",
      [d.id_venta, d.id_producto],
      c,
    );
    ensure(detail, 404, "Producto no encontrado en la venta");
    if (kind === "returns") {
      const previous = await query(
        "SELECT cantidad,estado FROM devoluciones_venta WHERE id_venta=? AND id_producto=?",
        [d.id_venta, d.id_producto],
        c,
      );
      try {
        assertReturnCapacity(detail.cantidad, previous, d.cantidad);
      } catch (e) {
        ensure(false, 409, e.message);
      }
      return {
        id: (
          await query(
            "INSERT INTO devoluciones_venta(id_venta,id_producto,cantidad,motivo) VALUES (?,?,?,?)",
            [d.id_venta, d.id_producto, d.cantidad, d.motivo],
            c,
          )
        ).insertId,
      };
    }
    return {
      id: (
        await query(
          "INSERT INTO garantias(id_venta,id_producto,motivo) VALUES (?,?,?)",
          [d.id_venta, d.id_producto, d.motivo],
          c,
        )
      ).insertId,
    };
  });
}
export async function change(user, kind, key, data) {
  return transaction(async (c) => {
    const table = tables[kind];
    const [r] = await query(
      `SELECT * FROM ${table} WHERE id=? FOR UPDATE`,
      [key],
      c,
    );
    ensure(r, 404, "Solicitud no encontrada");
    const flow =
      kind === "returns"
        ? {
            solicitada: ["aprobada", "rechazada"],
            aprobada: ["recibida"],
            recibida: [],
            rechazada: [],
            reembolsada: [],
          }
        : {
            solicitada: ["revision", "rechazada"],
            revision: ["aprobada", "rechazada"],
            aprobada: ["resuelta"],
            resuelta: [],
            rechazada: [],
          };
    ensure(
      flow[r.estado]?.includes(data.estado),
      409,
      "Cambio de estado no permitido",
    );
    if (kind === "returns") {
      if (data.estado === "recibida" && data.reintegrar)
        await moveStock(
          c,
          r.id_producto,
          r.cantidad,
          user.id,
          "Devolución recibida y autorizada para reintegro",
          { venta: r.id_venta },
        );
      await query(
        "UPDATE devoluciones_venta SET estado=? WHERE id=?",
        [data.estado, key],
        c,
      );
    } else {
      ensure(
        data.estado !== "resuelta" || data.resolucion?.trim(),
        422,
        "Indica la resolución",
      );
      await query(
        "UPDATE garantias SET estado=?,resolucion=? WHERE id=?",
        [data.estado, data.resolucion || null, key],
        c,
      );
    }
    return { id: key, estado: data.estado };
  });
}
