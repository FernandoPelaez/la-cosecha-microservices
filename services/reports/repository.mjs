import { query } from "../../packages/core/db.mjs";
import { serviceRequest } from "../../packages/core/service-client.mjs";
// Basado en el reporte recibido: una fila por compra evita multiplicar el total.
export async function purchaseReport({ desde, hasta }) {
  return query(
    `SELECT c.id,c.fecha,c.estado,p.nombre AS proveedor,c.total FROM compras c JOIN proveedores p ON p.id=c.id_proveedor WHERE c.fecha>=? AND c.fecha<DATE_ADD(?,INTERVAL 1 DAY) ORDER BY c.fecha DESC,c.id DESC LIMIT 5000`,
    [desde, hasta],
  );
}
export async function inventoryReport(token) {
  const [rows, alerts] = await Promise.all([
    query(
      "SELECT p.id,p.nombre,p.categoria,s.stock_actual,s.stock_minimo,s.stock_maximo FROM productos p JOIN stock s ON s.id_producto=p.id WHERE p.activo=TRUE ORDER BY p.nombre",
    ),
    serviceRequest(
      process.env.ALERTS_URL || "http://127.0.0.1:4013",
      "/api/alertas/stock",
      { token },
    ),
  ]);
  const states = new Map(alerts.map((item) => [item.id, item.alerta]));
  return rows.map((row) => ({
    ...row,
    alerta: states.get(row.id) || "Normal",
  }));
}

export function csv(rows) {
  if (!rows.length) return "\ufeffSin registros\r\n";
  const keys = Object.keys(rows[0]);
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[\s]*[=+@-]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  return (
    "\ufeff" +
    [keys, ...rows.map((r) => keys.map((k) => r[k]))]
      .map((r) => r.map(cell).join(","))
      .join("\r\n")
  );
}
