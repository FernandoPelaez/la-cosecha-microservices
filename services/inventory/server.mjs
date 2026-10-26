import express from "express";
import { z } from "zod";
import { application, finish, ok } from "../../packages/core/http.mjs";
import { auth, roles, internal } from "../../packages/core/security.mjs";
import { query, transaction } from "../../packages/core/db.mjs";
import { id, text } from "../../packages/core/validation.mjs";
import { moveStock } from "../../packages/core/stock.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { productSchema, offerSchema } from "./schemas.mjs";
import { listProducts, getProduct, saveProduct, removeProduct,} from "./repository.mjs";

const app = application("inventory-alexander");
app.use(internal, express.json({ limit: "60kb" }));

// Catálogo público de productos.
app.get("/products", async (req, res) =>
  ok(
    res,
    await listProducts({
      q: String(req.query.q || ""),
      category: String(req.query.category || ""),
    }),
  ),
);

app.get("/products/:id", async (req, res) =>
  ok(res, await getProduct(id.parse(req.params.id))),
);

// Rutas administrativas.
app.use(auth, roles("ADMIN", "INVENTARIO"));
app.get("/inventory", async (_req, res) =>
  ok(res, await listProducts({ admin: true })),
);

app.post("/products", async (req, res) =>
  ok(res, await saveProduct(productSchema.parse(req.body)), 201),
);

app.put("/products/:id", async (req, res) =>
  ok(
    res,
    await saveProduct(
      productSchema.parse(req.body),
      id.parse(req.params.id),
    ),
  ),
);

app.delete("/products/:id", async (req, res) =>
  ok(res, await removeProduct(id.parse(req.params.id))),
);

// Registrar entradas y salidas de inventario.
app.post("/stock/:id", async (req, res) => {
  const data = z
    .object({
      cantidad: z.coerce
        .number()
        .int()
        .min(-10000)
        .max(10000)
        .refine((value) => value !== 0),
      motivo: text(255),
    })
    .parse(req.body);

  const productId = id.parse(req.params.id);
  const result = await transaction((connection) =>
    moveStock(
      connection,
      productId,
      data.cantidad,
      req.user.id,
      data.motivo,
    ),
  );

  ok(res, result);
});

app.get("/movements", async (_req, res) =>
  ok(
    res,
    await query(
      `
        SELECT m.*, p.nombre
        FROM movimientos_inventario m
        JOIN productos p ON p.id = m.id_producto
        ORDER BY m.id DESC
        LIMIT 500
      `,
    ),
  ),
);

// Administración de promociones.
app.get("/offers", async (_req, res) =>
  ok(
    res,
    await query(
      `
        SELECT
          p.*,
          GROUP_CONCAT(pp.id_producto) AS productos
        FROM promociones p
        LEFT JOIN promociones_productos pp
          ON pp.id_promocion = p.id
        GROUP BY p.id
        ORDER BY p.id DESC
      `,
    ),
  ),
);

async function saveOffer(req, res) {
  const data = offerSchema.parse(req.body);

  const result = await transaction(async (connection) => {
    let promotionId = req.params.id
      ? id.parse(req.params.id)
      : null;

    const values = [
      data.nombre,
      data.descripcion,
      data.tipo_descuento,
      data.valor,
      new Date(data.fecha_inicio),
      new Date(data.fecha_fin),
      data.activa,
    ];

    if (promotionId) {
      const updated = await query(
        `
          UPDATE promociones
          SET
            nombre = ?,
            descripcion = ?,
            tipo_descuento = ?,
            valor = ?,
            fecha_inicio = ?,
            fecha_fin = ?,
            activa = ?
          WHERE id = ?
        `,
        [...values, promotionId],
        connection,
      );

      ensure(
        updated.affectedRows,
        404,
        "Oferta no encontrada",
      );

      await query(
        `
          DELETE FROM promociones_productos
          WHERE id_promocion = ?
        `,
        [promotionId],
        connection,
      );
    } else {
      const created = await query(
        `
          INSERT INTO promociones (
            nombre,
            descripcion,
            tipo_descuento,
            valor,
            fecha_inicio,
            fecha_fin,
            activa
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        values,
        connection,
      );

      promotionId = created.insertId;
    }

    for (const productId of new Set(data.productos)) {
      await query(
        `
          INSERT INTO promociones_productos
          VALUES (?, ?)
        `,
        [promotionId, productId],
        connection,
      );
    }

    return { id: promotionId };
  });

  ok(res, result);
}

app.post("/offers", saveOffer);
app.put("/offers/:id", saveOffer);

app.delete("/offers/:id", async (req, res) => {
  await query(
    "DELETE FROM promociones WHERE id = ?",
    [id.parse(req.params.id)],
  );

  ok(res, { completed: true });
});

export default finish(app, 4002);

