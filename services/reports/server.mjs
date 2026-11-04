import { z } from "zod";

import { application, finish, ok } from "../../packages/core/http.mjs";
import { auth, roles, internal } from "../../packages/core/security.mjs";
import { query } from "../../packages/core/db.mjs";

import {
  dashboardMetrics,
  dashboardSales,
  purchaseReport,
  inventoryReport,
  csv,
} from "./repository.mjs";

const app = application("reports");

// Protege las rutas y restringe el acceso a los roles autorizados.
app.use(
  internal,
  auth,
  roles("ADMIN", "INVENTARIO", "VENTAS", "LOGISTICA"),
);

// DASHBOARD ADMINISTRATIVO

app.get("/dashboard", async (req, res) => {
  const role = req.user.rol;

  const canViewInventory = ["ADMIN", "INVENTARIO"].includes(role);
  const canViewSales = ["ADMIN", "VENTAS"].includes(role);

  const token = req.headers.authorization?.replace(/^Bearer /, "");

  // Consulta en paralelo las métricas, ventas y operaciones recientes.
  const [metrics, inventory, orders, activity, sales] =
    await Promise.all([
      dashboardMetrics(role),

      canViewInventory
        ? inventoryReport(token)
        : Promise.resolve([]),

      query(`
        SELECT
          id,
          fecha,
          total,
          estado
        FROM pedidos
        WHERE estado IN ('pagado', 'preparacion')
        ORDER BY id DESC
        LIMIT 8
      `),

      query(`
        SELECT
          m.id,
          m.fecha,
          m.tipo,
          m.cantidad,
          m.motivo,
          p.nombre
        FROM movimientos_inventario AS m
        INNER JOIN productos AS p
          ON p.id = m.id_producto
        ORDER BY m.id DESC
        LIMIT 8
      `),

      canViewSales
        ? dashboardSales()
        : Promise.resolve(null),
    ]);

  const alerts = inventory.filter(
    (item) => item.alerta !== "Normal",
  );

  // Conserva la respuesta anterior e incorpora las ventas históricas.
  ok(res, {
    metrics: {
      ...metrics,
      inventoryAlerts: canViewInventory ? alerts.length : null,
    },
    alerts,
    orders,
    activity,
    sales,
  });
});

// REPORTES DE INVENTARIO Y COMPRAS

app.get(
  "/reports/:kind",
  roles("ADMIN", "INVENTARIO"),
  async (req, res) => {
    const kind = z
      .enum(["inventory", "purchases"])
      .parse(req.params.kind);

    // Valida el intervalo de fechas solicitado.
    const range = z
      .object({
        desde: z.iso.date().default("2000-01-01"),
        hasta: z.iso.date().default(
          new Date().toISOString().slice(0, 10),
        ),
      })
      .refine(
        (data) => data.hasta >= data.desde,
        "Rango de fechas inválido",
      )
      .parse(req.query);

    const rows =
      kind === "inventory"
        ? await inventoryReport(
            req.headers.authorization?.replace(/^Bearer /, ""),
          )
        : await purchaseReport(range);

    // Permite descargar los reportes en formato CSV.
    if (req.query.format === "csv") {
      res
        .set({
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="reporte-${kind}.csv"`,
        })
        .send(csv(rows));

      return;
    }

    ok(res, rows);
  },
);

export default finish(app, 4008);

