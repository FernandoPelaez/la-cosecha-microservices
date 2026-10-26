import { query } from "../../packages/core/db.mjs";
import { roles } from "../../packages/core/security.mjs";
import { ok } from "../../packages/core/http.mjs";

// Consultas de ventas y pagos: la administración no puede declarar un cobro.
export function administrationRoutes(app) {
  app.get("/sales", roles("ADMIN", "VENTAS"), async (_req, res) =>
    ok(
      res,
      await query(
        `SELECT v.id,v.id_pedido,v.fecha,v.total,c.folio,
      COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p.cliente_snapshot,'$.nombre')),u.nombre) AS nombre,
      p.estado AS estado_pedido,pg.estado AS estado_pago
     FROM ventas v JOIN pedidos p ON p.id=v.id_pedido
     JOIN clientes cl ON cl.id=v.id_cliente JOIN usuarios u ON u.id=cl.id_usuario
     JOIN pagos pg ON pg.id_pedido=p.id LEFT JOIN comprobantes c ON c.id_venta=v.id
     ORDER BY v.id DESC LIMIT 500`,
      ),
    ),
  );
  app.get("/payments", roles("ADMIN", "VENTAS"), async (_req, res) =>
    ok(
      res,
      await query(
        `SELECT pg.id,pg.id_pedido,pg.fecha_creacion,pg.fecha_actualizacion,pg.monto,
      pg.estado,pg.proveedor_pago,pg.referencia_proveedor,t.nombre AS metodo
     FROM pagos pg JOIN tipos_pago t ON t.id=pg.id_tipo_pago ORDER BY pg.id DESC LIMIT 500`,
      ),
    ),
  );
}
