import { readFile } from "node:fs/promises";
import { query, transaction, pool } from "../packages/core/db.mjs";
import { PROJECT } from "./migration-plan.mjs";
import { decimal } from "../packages/core/money.mjs";

try {
  const [marker] = await query(
    "SELECT valor FROM project_metadata WHERE clave='proyecto'",
  );
  if (marker?.valor !== PROJECT)
    throw new Error(
      "Ejecuta primero las migraciones sobre una base exclusiva de esta entrega",
    );
  const catalog = JSON.parse(
    await readFile(
      new URL("../database/catalogo.json", import.meta.url),
      "utf8",
    ),
  );
  let inserted = 0;
  await transaction(async (c) => {
    for (const product of catalog) {
      const reference = `dump20261021:${product.legacy_id}`;
      const [existing] = await query(
        "SELECT id FROM productos WHERE referencia_catalogo=?",
        [reference],
        c,
      );
      if (existing) continue;
      const saved = await query(
        `INSERT INTO productos(nombre,precio,costo,id_proveedor,categoria,referencia_catalogo) VALUES (?,?,NULL,NULL,'Salsas',?)`,
        [product.name, decimal(product.price_cents), reference],
        c,
      );
      await query(
        "INSERT INTO stock(id_producto,stock_actual,stock_minimo,stock_maximo) VALUES (?,0,5,100)",
        [saved.insertId],
        c,
      );
      await query(
        "INSERT INTO imagenes_producto(id_producto,url_imagen,orden,es_principal) VALUES (?,?,0,TRUE)",
        [saved.insertId, product.image],
        c,
      );
      inserted++;
    }
  });
  console.log(
    `Catálogo: ${inserted} productos nuevos. Los existentes se conservaron. Existencias iniciales: cero; registra entradas reales.`,
  );
} catch (error) {
  console.error(error.code ? `MySQL: ${error.code}` : error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
