import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
if (
  process.env.INTEGRATION_DB !== "isolated" ||
  process.env.DB_PORT !== "33306" ||
  process.env.NODE_ENV !== "test" ||
  !["localhost", "127.0.0.1"].includes(process.env.DB_HOST)
)
  throw new Error("Esta suite requiere .env.test e instancia MySQL aislada");
process.env.STRIPE_SECRET_KEY = "sk_test_local_contract_only";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_contract_only";
const { query, pool } = await import("../../packages/core/db.mjs");
const { signSession } = await import("../../packages/core/security.mjs");
const { createOrder } = await import("../../services/commerce/checkout.mjs");
const suffix = randomUUID();
const users = [];
let clientId, provider, product, purchase, sale, order, shipment;
async function call(port, path, token, method = "GET", body, status = 200) {
  const r = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Service-Key": process.env.SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const value = await r.json();
  assert.equal(
    r.status,
    status,
    `${method} ${port}${path}: ${JSON.stringify(value)}`,
  );
  return value.data;
}
test("SOA por HTTP: Node + Flask + FastAPI + .NET, con MySQL compartido", async (t) => {
  try {
    const roles = await query(
      "SELECT * FROM roles WHERE nombre_rol IN ('ADMIN','CLIENTE')",
    );
    for (const role of ["ADMIN", "CLIENTE"])
      users.push(
        (
          await query(
            "INSERT INTO usuarios(nombre,correo,password_hash,id_rol,correo_verificado) VALUES (?,?,?,?,TRUE)",
            [
              `QA ${role}`,
              `${role}-${suffix}@example.test`,
              "hash-no-utilizable",
              roles.find((r) => r.nombre_rol === role).id,
            ],
          )
        ).insertId,
      );
    clientId = (
      await query("INSERT INTO clientes(id_usuario) VALUES (?)", [users[1]])
    ).insertId;
    const admin = { id: users[0], rol: "ADMIN", sessionVersion: 1 };
    const client = {
      id: users[1],
      rol: "CLIENTE",
      clienteId: clientId,
      correo_verificado: 1,
      sessionVersion: 1,
      correo: `CLIENTE-${suffix}@example.test`,
    };
    const a = await signSession(admin),
      c = await signSession(client);
    await t.test(
      "proveedores Python: CRUD y permisos consultan identidad de auth",
      async () => {
        const disposable = await call(
          4004,
          "/api/proveedores",
          a,
          "POST",
          { nombre: `Temporal ${suffix}` },
          201,
        );
        await call(4004, `/api/proveedores/${disposable.id}`, a, "PUT", {
          nombre: "Actualizado",
        });
        await call(4004, `/api/proveedores/${disposable.id}`, a, "DELETE");
        await call(4004, "/api/proveedores", c, "GET", undefined, 403);
        provider = (
          await call(
            4004,
            "/api/proveedores",
            a,
            "POST",
            { nombre: `QA ${suffix}` },
            201,
          )
        ).id;
      },
    );
    const payload = {
      nombre: `QA ${suffix}`,
      id_proveedor: provider,
      costo: "10.00",
      precio: "20.00",
      stock_minimo: 3,
      stock_maximo: 4,
      imagen: "/images/la_cosecha_salsa_02.png",
    };
    await t.test(
      "productos: alta, modificación, borrado libre y catálogo sin costos",
      async () => {
        const temp = (await call(4002, "/products", a, "POST", payload, 201))
          .id;
        await call(4002, `/products/${temp}`, a, "PUT", {
          ...payload,
          nombre: "QA editado",
        });
        await call(4002, `/products/${temp}`, a, "DELETE");
        product = (await call(4002, "/products", a, "POST", payload, 201)).id;
        const detail = await call(4002, `/products/${product}`, c);
        assert.equal(detail.costo, undefined);
        assert.equal(detail.id_proveedor, undefined);
        await call(
          4004,
          `/api/proveedores/${provider}`,
          a,
          "DELETE",
          undefined,
          409,
        );
      },
    );
    await t.test(
      "ofertas persistentes recalculan el precio y pueden modificarse o eliminarse",
      async () => {
        const offer = {
          nombre: `QA ${suffix}`,
          tipo_descuento: "porcentaje",
          valor: "10.00",
          fecha_inicio: new Date(Date.now() - 3600000).toISOString(),
          fecha_fin: new Date(Date.now() + 3600000).toISOString(),
          activa: true,
          productos: [product],
        };
        const saved = await call(4002, "/offers", a, "POST", offer);
        try {
          assert.equal(
            (await call(4002, `/products/${product}`, c)).precio_final,
            "18.00",
          );
          await call(4002, `/offers/${saved.id}`, a, "PUT", {
            ...offer,
            tipo_descuento: "monto",
            valor: "3.00",
          });
          assert.equal(
            (await call(4002, `/products/${product}`, c)).precio_final,
            "17.00",
          );
        } finally {
          await call(4002, `/offers/${saved.id}`, a, "DELETE");
        }
      },
    );
    await t.test(
      "compras y devoluciones al proveedor actualizan stock una sola vez",
      async () => {
        purchase = (
          await call(
            4003,
            "/purchases",
            a,
            "POST",
            {
              id_proveedor: provider,
              items: [
                { id_producto: product, cantidad: 5, costo_unitario: "10.00" },
              ],
            },
            201,
          )
        ).id;
        await call(4003, `/purchases/${purchase}`, a, "PATCH", {
          estado: "confirmada",
        });
        await call(4003, `/purchases/${purchase}`, a, "PATCH", {
          estado: "recibida",
        });
        await call(
          4003,
          `/purchases/${purchase}`,
          a,
          "PATCH",
          { estado: "recibida" },
          409,
        );
        await call(
          4003,
          "/supplier-returns",
          a,
          "POST",
          {
            id_compra: purchase,
            id_producto: product,
            cantidad: 1,
            motivo: "Prueba",
          },
          201,
        );
        assert.equal(
          (await call(4002, `/products/${product}`, c)).stock_actual,
          4,
        );
      },
    );
    await t.test("envasado terminado no duplica existencias", async () => {
      await call(
        4006,
        "/bottling",
        a,
        "POST",
        {
          id_producto: product,
          tipo_envase: "Prueba",
          capacidad_ml: null,
          tipo_tapa: null,
          etiqueta_colocada: true,
          sello_colocado: true,
          cantidad: 4,
          estado: "completado",
          observaciones: "Fixture",
        },
        201,
      );
      assert.equal(
        (await call(4002, `/products/${product}`, c)).stock_actual,
        4,
      );
    });
    await t.test(
      "carrito, domicilio, pago firmado local y consulta .NET/FastAPI",
      async () => {
        const address = await call(
          4003,
          "/addresses",
          c,
          "POST",
          {
            calle_numero: "QA 1",
            colonia: "QA",
            ciudad: "QA",
            codigo_postal: "81200",
          },
          201,
        );
        await call(4003, `/cart/${product}`, c, "PUT", { cantidad: 1 });
        const [method] = await query(
          "SELECT id FROM tipos_pago WHERE nombre='Tarjeta'",
        );
        await call(
          4009,
          "/api/pedidos",
          c,
          "POST",
          { id_direccion: address.id, id_tipo_pago: 999999, key: randomUUID() },
          422,
        );
        order = await createOrder(client, {
          id_direccion: address.id,
          id_tipo_pago: method.id,
          key: randomUUID(),
        });
        const event = JSON.stringify({
          id: `evt_e2e_${suffix}`,
          type: "checkout.session.completed",
          data: {
            object: {
              id: `cs_e2e_${suffix}`,
              client_reference_id: String(order.id),
              currency: "mxn",
              amount_total: 2000,
              payment_status: "paid",
              status: "complete",
            },
          },
        });
        const signature = Stripe.webhooks.generateTestHeaderString({
          payload: event,
          secret: process.env.STRIPE_WEBHOOK_SECRET,
        });
        const r = await fetch("http://127.0.0.1:4003/webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "stripe-signature": signature,
          },
          body: event,
        });
        assert.equal(r.status, 200);
        const history = await call(4010, "/history", c);
        const item = history.find((o) => o.id_pedido === order.id);
        assert.equal(item.estado, "pagado");
        sale = item.id_venta;
        const orders = await call(4009, "/api/pedidos", a);
        assert.ok(orders.some((o) => o.id === order.id));
        await call(4009, `/api/pedidos/${order.id}/estado`, a, "PATCH", {
          estado: "preparacion",
        });
        await call(
          4003,
          `/addresses/${address.id}`,
          c,
          "PUT",
          {
            calle_numero: "Cambio indebido",
            colonia: "QA",
            ciudad: "QA",
            codigo_postal: "81200",
          },
          409,
        );
      },
    );
    await t.test(
      "empaque, envío y entrega actualizan el historial real",
      async () => {
        const shipments = await call(4011, "/shipping", a);
        shipment = shipments.find((s) => s.id_venta === sale).id;
        await call(4011, `/shipping/${shipment}`, a, "PATCH", {
          estado: "preparando",
        });
        await call(
          4011,
          `/shipping/${shipment}`,
          a,
          "PATCH",
          { estado: "enviado", num_guia: `QA-${suffix}`, paqueteria: "Prueba" },
          422,
        );
        await call(
          4006,
          "/packages",
          a,
          "POST",
          {
            id_envio: shipment,
            paquete: {
              peso: 1,
              tamano: "chico",
              tipoEmpacado: "caja",
              medidas: { largo: 10, ancho: 10, alto: 10 },
            },
          },
          201,
        );
        await call(4011, `/shipping/${shipment}`, a, "PATCH", {
          estado: "enviado",
          num_guia: `QA-${suffix}`,
          paqueteria: "Prueba",
        });
        await call(4011, `/deliveries/${shipment}`, a, "POST", {
          destinatario: "Destinatario QA",
          fecha_entrega_real: new Date().toISOString(),
          firma_evidencia: "https://example.test/evidencia/qa",
        });
        assert.equal(
          (await call(4010, "/history", c)).find(
            (o) => o.id_pedido === order.id,
          ).estado,
          "entregado",
        );
      },
    );
    await t.test(
      "garantías y devoluciones de Fernando recorren sus estados",
      async () => {
        const warranty = await call(
          4005,
          "/warranties",
          c,
          "POST",
          { id_venta: sale, id_producto: product, motivo: "Prueba" },
          201,
        );
        for (const estado of ["revision", "aprobada", "resuelta"])
          await call(4005, `/warranties/${warranty.id}`, a, "PATCH", {
            estado,
            resolucion: "Resolución de prueba",
          });
        const returned = await call(
          4005,
          "/returns",
          c,
          "POST",
          {
            id_venta: sale,
            id_producto: product,
            cantidad: 1,
            motivo: "Prueba",
          },
          201,
        );
        await call(4005, `/returns/${returned.id}`, a, "PATCH", {
          estado: "aprobada",
        });
        await call(4005, `/returns/${returned.id}`, a, "PATCH", {
          estado: "recibida",
          reintegrar: false,
        });
        assert.equal(
          (await call(4002, `/products/${product}`, c)).stock_actual,
          3,
        );
      },
    );
    await t.test(
      "roles y alerta mínima C# consultan identidad e inventario por HTTP",
      async () => {
        assert.equal(
          (await call(4012, "/roles/check?rol=ADMIN", a)).permitido,
          true,
        );
        await call(4012, "/roles/check?rol=ADMIN", c, "GET", undefined, 403);
        const alerts = await call(4013, "/api/alertas/stock", a);
        assert.equal(alerts.find((row) => row.id === product).alerta, "Mínimo");
        await call(4013, "/api/alertas/stock", c, "GET", undefined, 403);
      },
    );
    await t.test(
      "reportes recuperan compra y alertas desde MySQL",
      async () => {
        const rows = await call(
          4008,
          "/reports/purchases?desde=2000-01-01&hasta=2100-01-01",
          a,
        );
        assert.equal(Number(rows.find((r) => r.id === purchase).total), 50);
        const stock = await call(4008, "/reports/inventory", a);
        assert.equal(stock.find((r) => r.id === product).alerta, "Mínimo");
      },
    );
  } finally {
    if (sale) {
      if (shipment) {
        await query("DELETE FROM validacion_entrega WHERE id_envio=?", [
          shipment,
        ]);
        await query("DELETE FROM paquetes_logisticos WHERE id_envio=?", [
          shipment,
        ]);
      }
      for (const table of [
        "cola_comprobantes",
        "devoluciones_venta",
        "garantias",
        "comprobantes",
        "envios",
        "detalle_ventas",
      ])
        await query(`DELETE FROM ${table} WHERE id_venta=?`, [sale]);
    }
    if (product)
      await query("DELETE FROM movimientos_inventario WHERE id_producto=?", [
        product,
      ]);
    if (sale) await query("DELETE FROM ventas WHERE id=?", [sale]);
    if (order) {
      await query("DELETE FROM pagos WHERE id_pedido=?", [order.id]);
      await query("DELETE FROM detalle_pedidos WHERE id_pedido=?", [order.id]);
      await query("DELETE FROM pedidos WHERE id=?", [order.id]);
    }
    if (purchase) {
      for (const table of ["devoluciones_compra", "detalle_compras"])
        await query(`DELETE FROM ${table} WHERE id_compra=?`, [purchase]);
      await query("DELETE FROM compras WHERE id=?", [purchase]);
    }
    if (clientId) {
      for (const table of ["resenas", "direcciones", "carrito"])
        await query(`DELETE FROM ${table} WHERE id_cliente=?`, [clientId]);
      await query("DELETE FROM clientes WHERE id=?", [clientId]);
    }
    if (product) {
      await query("DELETE FROM empaquetado WHERE id_producto=?", [product]);
      await query("DELETE FROM stock WHERE id_producto=?", [product]);
      await query("DELETE FROM productos WHERE id=?", [product]);
    }
    if (provider) await query("DELETE FROM proveedores WHERE id=?", [provider]);
    for (const id of users)
      await query("DELETE FROM usuarios WHERE id=?", [id]);
    await query("DELETE FROM eventos_pago WHERE id_evento=?", [
      `evt_e2e_${suffix}`,
    ]);
    await pool.end();
  }
});
