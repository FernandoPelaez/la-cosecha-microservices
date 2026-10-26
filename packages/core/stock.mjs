
import { query } from "./db.mjs";
import { ensure } from "./errors.mjs";

// Gestionar movimientos de inventario dentro de una transacción.
export async function moveStock(
  c,
  productId,
  delta,
  userId,
  reason,
  links = {},
) {
  // Validar que la cantidad sea un entero distinto de cero.
  ensure(
    Number.isInteger(delta) && delta !== 0,
    422,
    "Cantidad inválida",
  );

  // Consultar y bloquear el inventario del producto.
  const [s] = await query(
    `
      SELECT *
      FROM stock
      WHERE id_producto = ?
      FOR UPDATE
    `,
    [productId],
    c,
  );

  // Verificar que exista el registro de inventario.
  ensure(s, 404, "Inventario no encontrado");

  // Calcular las existencias posteriores al movimiento.
  const after = s.stock_actual + delta;

  // Evitar movimientos que generen existencias negativas.
  ensure(
    after >= 0,
    409,
    "Existencias insuficientes",
  );

  // Validar el límite máximo permitido por el inventario.
  ensure(
    after <= 4294967295,
    422,
    "La cantidad excede el rango del inventario",
  );

  // Actualizar las existencias del producto.
  await query(
    `
      UPDATE stock
      SET stock_actual = ?
      WHERE id_producto = ?
    `,
    [after, productId],
    c,
  );

  // Registrar el movimiento para mantener la trazabilidad.
  await query(
    `
      INSERT INTO movimientos_inventario (
        id_producto,
        id_usuario,
        tipo,
        cantidad,
        stock_anterior,
        stock_posterior,
        id_compra,
        id_venta,
        id_empaquetado,
        motivo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      productId,
      userId,
      delta > 0 ? "entrada" : "salida",
      Math.abs(delta),
      s.stock_actual,
      after,
      links.compra || null,
      links.venta || null,
      links.empaquetado || null,
      reason,
    ],
    c,
  );

  // Devolver las existencias actualizadas.
  return after;
}

