import { z } from "zod";

import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { cents, decimal } from "../../packages/core/money.mjs";
import { moveStock } from "../../packages/core/stock.mjs";
import { id, quantity, money, text } from "../../packages/core/validation.mjs";
import { ok } from "../../packages/core/http.mjs";
import { roles } from "../../packages/core/security.mjs";

export function purchaseRoutes(app) {
  app.get("/purchases", roles("ADMIN", "INVENTARIO"), async (_req, res) => {
    const purchases = await query(
      `SELECT
          c.*,
          p.nombre AS proveedor
        FROM compras c
        JOIN proveedores p ON p.id = c.id_proveedor
        ORDER BY c.id DESC
        LIMIT 500`,
    );

    ok(res, purchases);
  });

  app.get("/purchases/:id", roles("ADMIN", "INVENTARIO"), async (req, res) => {
    const purchaseId = id.parse(req.params.id);

    const details = await query(
      `SELECT
          d.*,
          p.nombre
        FROM detalle_compras d
        JOIN productos p ON p.id = d.id_producto
        WHERE d.id_compra = ?`,
      [purchaseId],
    );

    ok(res, details);
  });

  app.post("/purchases", roles("ADMIN", "INVENTARIO"), async (req, res) => {
    const data = z
      .object({
        id_proveedor: id,
        items: z
          .array(
            z.object({
              id_producto: id,
              cantidad: quantity,
              costo_unitario: money,
            }),
          )
          .min(1)
          .max(100),
      })
      .parse(req.body);

    const productIds = data.items.map((item) => item.id_producto);

    ensure(
      new Set(productIds).size === productIds.length,
      422,
      "No repitas productos",
    );

    const result = await transaction(async (connection) => {
      let total = 0;

      // Valida que cada producto pertenezca al proveedor.
      for (const item of data.items) {
        const [product] = await query(
          `SELECT id
             FROM productos
             WHERE id = ? AND id_proveedor = ?`,
          [item.id_producto, data.id_proveedor],
          connection,
        );

        ensure(product, 422, "El producto no corresponde al proveedor");

        total += cents(item.costo_unitario) * item.cantidad;
      }

      const purchase = await query(
        `INSERT INTO compras
            (id_proveedor, id_usuario, total)
           VALUES (?, ?, ?)`,
        [data.id_proveedor, req.user.id, decimal(total)],
        connection,
      );

      for (const item of data.items) {
        await query(
          `INSERT INTO detalle_compras
              (id_compra, id_producto, cantidad, costo_unitario)
             VALUES (?, ?, ?, ?)`,
          [
            purchase.insertId,
            item.id_producto,
            item.cantidad,
            item.costo_unitario,
          ],
          connection,
        );
      }

      return { id: purchase.insertId };
    });

    ok(res, result, 201);
  });

  app.patch(
    "/purchases/:id",
    roles("ADMIN", "INVENTARIO"),
    async (req, res) => {
      const purchaseId = id.parse(req.params.id);

      const status = z
        .enum(["confirmada", "recibida", "cancelada"])
        .parse(req.body.estado);

      const result = await transaction(async (connection) => {
        const [purchase] = await query(
          `SELECT *
           FROM compras
           WHERE id = ?
           FOR UPDATE`,
          [purchaseId],
          connection,
        );

        ensure(purchase, 404, "Compra no encontrada");

        const allowed = {
          borrador: ["confirmada", "cancelada"],
          confirmada: ["recibida", "cancelada"],
          recibida: [],
          cancelada: [],
        };

        ensure(
          allowed[purchase.estado]?.includes(status) ?? false,
          409,
          "Cambio de estado no permitido",
        );

        // Actualiza el inventario únicamente al recibir la compra.
        if (status === "recibida") {
          const lines = await query(
            `SELECT *
             FROM detalle_compras
             WHERE id_compra = ?
             ORDER BY id_producto`,
            [purchaseId],
            connection,
          );

          for (const line of lines) {
            await moveStock(
              connection,
              line.id_producto,
              line.cantidad,
              req.user.id,
              "Recepción de compra",
              { compra: purchaseId },
            );
          }
        }

        await query(
          `UPDATE compras
           SET estado = ?
           WHERE id = ?`,
          [status, purchaseId],
          connection,
        );

        return {
          id: purchaseId,
          estado: status,
        };
      });

      ok(res, result);
    },
  );

  app.get(
    "/supplier-returns",
    roles("ADMIN", "INVENTARIO"),
    async (_req, res) => {
      const returns = await query(
        `SELECT
          d.*,
          p.nombre
        FROM devoluciones_compra d
        JOIN productos p ON p.id = d.id_producto
        ORDER BY d.id DESC
        LIMIT 500`,
      );

      ok(res, returns);
    },
  );

  app.post(
    "/supplier-returns",
    roles("ADMIN", "INVENTARIO"),
    async (req, res) => {
      const data = z
        .object({
          id_compra: id,
          id_producto: id,
          cantidad: quantity,
          motivo: text(2000),
        })
        .parse(req.body);

      const result = await transaction(async (connection) => {
        const [purchase] = await query(
          `SELECT *
           FROM compras
           WHERE id = ?
           FOR UPDATE`,
          [data.id_compra],
          connection,
        );

        ensure(
          purchase?.estado === "recibida",
          409,
          "Solo puedes devolver compras recibidas",
        );

        const [detail] = await query(
          `SELECT cantidad
           FROM detalle_compras
           WHERE id_compra = ? AND id_producto = ?`,
          [data.id_compra, data.id_producto],
          connection,
        );

        ensure(detail, 404, "Producto no encontrado en la compra");

        const [returned] = await query(
          `SELECT
            COALESCE(SUM(cantidad), 0) AS total
           FROM devoluciones_compra
           WHERE id_compra = ? AND id_producto = ?`,
          [data.id_compra, data.id_producto],
          connection,
        );

        // Impide devolver más unidades de las adquiridas.
        ensure(
          Number(returned.total) + data.cantidad <= detail.cantidad,
          409,
          "La devolución excede las unidades compradas",
        );

        await moveStock(
          connection,
          data.id_producto,
          -data.cantidad,
          req.user.id,
          "Devolución a proveedor",
          { compra: data.id_compra },
        );

        const result = await query(
          `INSERT INTO devoluciones_compra
            (id_compra, id_producto, cantidad, motivo)
           VALUES (?, ?, ?, ?)`,
          [data.id_compra, data.id_producto, data.cantidad, data.motivo],
          connection,
        );

        return { id: result.insertId };
      });

      ok(res, result, 201);
    },
  );
}
