import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { discounted, decimal } from "../../packages/core/money.mjs";

// Consulta base de productos, calificaciones, inventario e imágenes.
const select = `
  SELECT
    p.*,
    (
      SELECT COUNT(*)
      FROM resenas r
      WHERE r.id_producto = p.id
    ) AS review_count,
    (
      SELECT AVG(r.calificacion)
      FROM resenas r
      WHERE r.id_producto = p.id
    ) AS rating,
    s.stock_actual,
    s.stock_minimo,
    s.stock_maximo,
    (
      SELECT i.url_imagen
      FROM imagenes_producto i
      WHERE i.id_producto = p.id
      ORDER BY i.es_principal DESC, i.orden
      LIMIT 1
    ) AS imagen
  FROM productos p
  JOIN stock s ON s.id_producto = p.id
`;

// Obtener el catálogo de productos.
export async function listProducts({
  q = "",
  category = "",
  admin = false,
} = {}) {
  const products = await query(
    `
      ${select}
      WHERE (
        ? OR (
          p.activo = TRUE
          AND (
            p.caducidad IS NULL
            OR p.caducidad >= UTC_DATE()
          )
        )
      )
      AND (
        p.nombre LIKE ?
        OR p.descripcion LIKE ?
      )
      AND (
        ? = ''
        OR p.categoria = ?
      )
      ORDER BY p.id
      LIMIT 500
    `,
    [
      admin,
      `%${q.slice(0, 100)}%`,
      `%${q.slice(0, 100)}%`,
      category,
      category,
    ],
  );

  const offers = await query(
    `
      SELECT
        pp.id_producto,
        p.*
      FROM promociones p
      JOIN promociones_productos pp
        ON pp.id_promocion = p.id
      WHERE p.activa = TRUE
        AND UTC_TIMESTAMP()
          BETWEEN p.fecha_inicio AND p.fecha_fin
    `,
  );

  return products.map((p) => withPrice(p, offers, admin));
}

// Calcular el precio final considerando promociones.
function withPrice(product, offers, admin = false) {
  const { costo, id_proveedor, ...publicProduct } = product;

  return {
    ...(admin
      ? { ...publicProduct, costo, id_proveedor }
      : publicProduct),

    precio_final: decimal(
      discounted(
        product.precio,
        offers.filter(
          (offer) => offer.id_producto === product.id,
        ),
      ),
    ),
  };
}

// Obtener un producto por su identificador.
export async function getProduct(id) {
  const [product] = await query(
    `
      ${select}
      WHERE p.id = ?
        AND p.activo = TRUE
        AND (
          p.caducidad IS NULL
          OR p.caducidad >= UTC_DATE()
        )
    `,
    [id],
  );

  ensure(product, 404, "Producto no encontrado");

  const offers = await query(
    `
      SELECT
        pp.id_producto,
        p.*
      FROM promociones p
      JOIN promociones_productos pp
        ON pp.id_promocion = p.id
      WHERE pp.id_producto = ?
        AND p.activa = TRUE
        AND UTC_TIMESTAMP()
          BETWEEN p.fecha_inicio AND p.fecha_fin
    `,
    [id],
  );

  return withPrice(product, offers);
}

// Crear o actualizar un producto mediante una transacción.
export async function saveProduct(d, id) {
  return transaction(async (c) => {
    const values = [
      d.nombre,
      d.descripcion,
      d.lote,
      d.serie,
      d.caducidad,
      d.id_proveedor,
      d.costo,
      d.precio,
      d.categoria,
    ];

    if (id) {
      // Actualizar los datos del producto.
      const result = await query(
        `
          UPDATE productos
          SET
            nombre = ?,
            descripcion = ?,
            lote = ?,
            serie = ?,
            caducidad = ?,
            id_proveedor = ?,
            costo = ?,
            precio = ?,
            categoria = ?
          WHERE id = ?
        `,
        [...values, id],
        c,
      );

      ensure(
        result.affectedRows,
        404,
        "Producto no encontrado",
      );

      // Actualizar los límites del inventario.
      await query(
        `
          UPDATE stock
          SET
            stock_minimo = ?,
            stock_maximo = ?
          WHERE id_producto = ?
        `,
        [d.stock_minimo, d.stock_maximo, id],
        c,
      );
    } else {
      // Registrar un producto nuevo.
      const result = await query(
        `
          INSERT INTO productos (
            nombre,
            descripcion,
            lote,
            serie,
            caducidad,
            id_proveedor,
            costo,
            precio,
            categoria
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        values,
        c,
      );

      id = result.insertId;

      // Crear el registro de inventario del producto.
      await query(
        `
          INSERT INTO stock (
            id_producto,
            stock_minimo,
            stock_maximo
          )
          VALUES (?, ?, ?)
        `,
        [id, d.stock_minimo, d.stock_maximo],
        c,
      );
    }

    // Registrar o actualizar la imagen principal.
    await query(
      `
        INSERT INTO imagenes_producto (
          id_producto,
          url_imagen,
          orden,
          es_principal
        )
        VALUES (?, ?, 0, TRUE)
        ON DUPLICATE KEY UPDATE
          url_imagen = VALUES(url_imagen)
      `,
      [id, d.imagen],
      c,
    );

    return { id };
  });
}

// Eliminar un producto sin existencias.
export async function removeProduct(id) {
  return transaction(async (c) => {
    // Bloquear el producto durante la transacción.
    const [product] = await query(
      `
        SELECT id
        FROM productos
        WHERE id = ?
        FOR UPDATE
      `,
      [id],
      c,
    );

    ensure(product, 404, "Producto no encontrado");

    // Consultar y bloquear su inventario.
    const [stock] = await query(
      `
        SELECT stock_actual
        FROM stock
        WHERE id_producto = ?
        FOR UPDATE
      `,
      [id],
      c,
    );

    // Solo permitir eliminar productos sin existencias.
    ensure(
      stock.stock_actual === 0,
      409,
      "El producto debe tener existencias en cero para eliminarlo",
    );

    // Eliminar el registro de inventario.
    await query(
      "DELETE FROM stock WHERE id_producto = ?",
      [id],
      c,
    );

    // Eliminar el producto.
    await query(
      "DELETE FROM productos WHERE id = ?",
      [id],
      c,
    );

    return { id };
  });
}

