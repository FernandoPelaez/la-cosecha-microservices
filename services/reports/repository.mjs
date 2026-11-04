import { query } from "../../packages/core/db.mjs";
import { serviceRequest } from "../../packages/core/service-client.mjs";

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

// Completa los periodos sin ventas para mantener continuas las gráficas.
function completeSalesPeriods(rows, start, count, unit) {
  const totals = new Map(
    rows.map((row) => [String(row.period), Number(row.total)]),
  );

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);

    if (unit === "month") {
      date.setUTCMonth(date.getUTCMonth() + index);
    } else {
      date.setUTCDate(
        date.getUTCDate() + index * (unit === "week" ? 7 : 1),
      );
    }

    const period = isoDate(date);

    return {
      period,
      total: totals.get(period) ?? 0,
    };
  });
}

// Obtiene ventas brutas por día, semana completa y mes completo.
export async function dashboardSales() {
  // Utiliza la fecha de MySQL, igual que los indicadores existentes.
  const [clock] = await query(
    "SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today",
  );

  const today = new Date(`${clock.today}T00:00:00.000Z`);
  const dayStart = new Date(today);
  dayStart.setUTCDate(today.getUTCDate() - 6);

  const dayEnd = new Date(today);
  dayEnd.setUTCDate(today.getUTCDate() + 1);

  const weekEnd = new Date(today);
  weekEnd.setUTCDate(
    today.getUTCDate() - ((today.getUTCDay() + 6) % 7),
  );

  const weekStart = new Date(weekEnd);
  weekStart.setUTCDate(weekEnd.getUTCDate() - 28);

  const monthEnd = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
  );

  const monthStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 3, 1),
  );

  // Agrupa en SQL para obtener únicamente los totales necesarios.
  const [daily, weekly, monthly] = await Promise.all([
    query(
      `
        SELECT
          DATE_FORMAT(v.fecha, '%Y-%m-%d') AS period,
          SUM(v.total) AS total
        FROM ventas AS v
        WHERE v.fecha >= ?
          AND v.fecha < ?
        GROUP BY period
        ORDER BY period
      `,
      [isoDate(dayStart), isoDate(dayEnd)],
    ),

    query(
      `
        SELECT
          DATE_FORMAT(
            DATE_SUB(
              DATE(v.fecha),
              INTERVAL WEEKDAY(v.fecha) DAY
            ),
            '%Y-%m-%d'
          ) AS period,
          SUM(v.total) AS total
        FROM ventas AS v
        WHERE v.fecha >= ?
          AND v.fecha < ?
        GROUP BY period
        ORDER BY period
      `,
      [isoDate(weekStart), isoDate(weekEnd)],
    ),

    query(
      `
        SELECT
          DATE_FORMAT(v.fecha, '%Y-%m-01') AS period,
          SUM(v.total) AS total
        FROM ventas AS v
        WHERE v.fecha >= ?
          AND v.fecha < ?
        GROUP BY period
        ORDER BY period
      `,
      [isoDate(monthStart), isoDate(monthEnd)],
    ),
  ]);

  return {
    daily: completeSalesPeriods(daily, dayStart, 7, "day"),
    weekly: completeSalesPeriods(weekly, weekStart, 4, "week"),
    monthly: completeSalesPeriods(monthly, monthStart, 3, "month"),
  };
}

// Obtiene los indicadores operativos sin consultar listados completos.
export async function dashboardMetrics(role) {
  const canViewInventory = ["ADMIN", "INVENTARIO"].includes(role);
  const canViewPurchases = ["ADMIN", "INVENTARIO"].includes(role);
  const canViewSales = ["ADMIN", "VENTAS"].includes(role);
  const [metrics] = await query(
    `
      SELECT
        (
          SELECT COUNT(*)
          FROM pedidos
          WHERE estado IN ('pagado', 'preparacion')
        ) AS ordersToPrepare,

        CASE WHEN ? THEN (
          SELECT COUNT(*)
          FROM movimientos_inventario
          WHERE fecha >= CURDATE()
            AND fecha < CURDATE() + INTERVAL 1 DAY
        ) ELSE NULL END AS movementsToday,

        CASE WHEN ? THEN (
          SELECT COUNT(*)
          FROM compras
          WHERE estado IN ('borrador', 'confirmada')
        ) ELSE NULL END AS purchasesInProcess,

        CASE WHEN ? THEN (
          SELECT COALESCE(SUM(total), 0)
          FROM ventas
          WHERE fecha >= CURDATE()
            AND fecha < CURDATE() + INTERVAL 1 DAY
        ) ELSE NULL END AS salesToday
    `,
    [
      Number(canViewInventory),
      Number(canViewPurchases),
      Number(canViewSales),
    ],
  );

  return {
    ordersToPrepare: Number(metrics.ordersToPrepare),

    movementsToday: canViewInventory
      ? Number(metrics.movementsToday)
      : null,

    purchasesInProcess: canViewPurchases
      ? Number(metrics.purchasesInProcess)
      : null,

    salesToday: canViewSales
      ? Number(metrics.salesToday)
      : null,
  };
}

// Obtiene una fila por compra para evitar duplicar los importes.
export async function purchaseReport({ desde, hasta }) {
  return query(
    `
      SELECT
        c.id,
        c.fecha,
        c.estado,
        p.nombre AS proveedor,
        c.total
      FROM compras AS c
      INNER JOIN proveedores AS p
        ON p.id = c.id_proveedor
      WHERE c.fecha >= ?
        AND c.fecha < DATE_ADD(?, INTERVAL 1 DAY)
      ORDER BY
        c.fecha DESC,
        c.id DESC
      LIMIT 5000
    `,
    [desde, hasta],
  );
}

// Consulta las existencias y sus alertas de inventario.
export async function inventoryReport(token) {
  const [rows, alerts] = await Promise.all([
    query(`
      SELECT
        p.id,
        p.nombre,
        p.categoria,
        s.stock_actual,
        s.stock_minimo,
        s.stock_maximo
      FROM productos AS p
      INNER JOIN stock AS s
        ON s.id_producto = p.id
      WHERE p.activo = TRUE
      ORDER BY p.nombre
    `),

    serviceRequest(
      process.env.ALERTS_URL || "http://127.0.0.1:4013",
      "/api/alertas/stock",
      { token },
    ),
  ]);

  // Relaciona las alertas con los productos mediante su identificador.
  const alertStates = new Map(
    alerts.map((item) => [String(item.id), item.alerta]),
  );

  return rows.map((row) => ({
    ...row,
    alerta: alertStates.get(String(row.id)) || "Normal",
  }));
}

// Genera un archivo CSV compatible con hojas de cálculo.
export function csv(rows) {
  if (!rows.length) {
    return "\ufeffSin registros\r\n";
  }

  const keys = Object.keys(rows[0]);
  const cell = (value) => {
    const text = String(value ?? "");

    // Evita que una celda se interprete como una fórmula.
    const safeText = text.replace(/^\s*[=+@-]/, "'$&");
    
    return `"${safeText.replace(/"/g, '""')}"`;
  };

  const records = [
    keys,
    ...rows.map((row) => keys.map((key) => row[key])),
  ];

  return (
    "\ufeff" +
    records
      .map((record) => record.map(cell).join(","))
      .join("\r\n")
  );
}

