import { z } from "zod";
import { application, finish, ok } from "../../packages/core/http.mjs";
import { auth, roles, internal } from "../../packages/core/security.mjs";
import { query } from "../../packages/core/db.mjs";
import { purchaseReport, inventoryReport, csv } from "./repository.mjs";
const app = application("reports");
app.use(internal, auth, roles("ADMIN", "INVENTARIO", "VENTAS", "LOGISTICA"));
app.get("/dashboard", async (req, res) => {
  const [alerts, orders, activity] = await Promise.all([
    ["ADMIN", "INVENTARIO"].includes(req.user.rol)
      ? inventoryReport(req.headers.authorization?.replace(/^Bearer /, ""))
      : Promise.resolve([]),
    query(
      "SELECT id,fecha,total,estado FROM pedidos WHERE estado IN ('pagado','preparacion') ORDER BY id DESC LIMIT 8",
    ),
    query(
      "SELECT m.id,m.fecha,m.tipo,m.cantidad,m.motivo,p.nombre FROM movimientos_inventario m JOIN productos p ON p.id=m.id_producto ORDER BY m.id DESC LIMIT 8",
    ),
  ]);
  ok(res, {
    alerts: alerts.filter((a) => a.alerta !== "Normal"),
    orders,
    activity,
  });
});
app.get("/reports/:kind", roles("ADMIN", "INVENTARIO"), async (req, res) => {
  const kind = z.enum(["inventory", "purchases"]).parse(req.params.kind);
  const range = z
    .object({
      desde: z.iso.date().default("2000-01-01"),
      hasta: z.iso.date().default(new Date().toISOString().slice(0, 10)),
    })
    .refine((d) => d.hasta >= d.desde, "Rango de fechas inválido")
    .parse(req.query);
  const rows =
    kind === "inventory"
      ? await inventoryReport(
          req.headers.authorization?.replace(/^Bearer /, ""),
        )
      : await purchaseReport(range);
  if (req.query.format === "csv")
    res
      .set({
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reporte-${kind}.csv"`,
      })
      .send(csv(rows));
  else ok(res, rows);
});
export default finish(app, 4008);
