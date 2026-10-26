import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import request from "supertest";
import Stripe from "stripe";
// Esta suite ESCRIBE datos de prueba. Nunca apunta al MySQL de uso diario.
if (
  process.env.INTEGRATION_DB !== "isolated" ||
  process.env.DB_PORT !== "33306" ||
  !["localhost", "127.0.0.1"].includes(process.env.DB_HOST) ||
  process.env.NODE_ENV !== "test"
)
  throw new Error(
    "Usa exclusivamente .env.test y la instancia aislada de compose.qa.yml",
  );
process.env.STRIPE_SECRET_KEY = "sk_test_local_contract_only";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_contract_only";
const { pool, query } = await import("../../packages/core/db.mjs");
const { saveProduct } = await import("../../services/inventory/repository.mjs");
const { setCartItem } = await import("../../services/commerce/cart.mjs");
const { createOrder } = await import("../../services/commerce/checkout.mjs");
const { signSession } = await import("../../packages/core/security.mjs");
const { default: commerce } =
  await import("../../services/commerce/server.mjs");
const { default: reviews } = await import("../../services/reviews/server.mjs");
const { create, change } = await import("../../services/returns/service.mjs");
const suffix = randomUUID();
const users = [],
  clients = [],
  products = [],
  events = [];
let supplier;

test("MySQL real: carrito → pedido → webhook firmado local → venta → devolución", async (t) => {
  try {
    const [role] = await query(
      "SELECT id FROM roles WHERE nombre_rol='CLIENTE'",
    );
    assert.ok(role, "Ejecuta npm run db:migrate:test");
    for (let n = 0; n < 2; n++) {
      const u = await query(
        "INSERT INTO usuarios(nombre,correo,password_hash,id_rol,correo_verificado) VALUES (?,?,?,?,TRUE)",
        [
          `Prueba ${suffix}`,
          `${n}-${suffix}@example.test`,
          "hash-no-utilizable-para-login",
          role.id,
        ],
      );
      users.push(u.insertId);
      const c = await query("INSERT INTO clientes(id_usuario) VALUES (?)", [
        u.insertId,
      ]);
      clients.push(c.insertId);
      await query(
        "INSERT INTO direcciones(id_cliente,calle_numero,colonia,ciudad,codigo_postal) VALUES (?,?,?,?,?)",
        [c.insertId, "Prueba 1", "Prueba", "Prueba", "81200"],
      );
    }
    supplier = (
      await query("INSERT INTO proveedores(nombre) VALUES (?)", [
        `Prueba ${suffix}`,
      ])
    ).insertId;
    const product = await saveProduct({
      nombre: `Prueba ${suffix}`,
      descripcion: null,
      lote: null,
      serie: null,
      caducidad: null,
      id_proveedor: supplier,
      costo: "5.00",
      precio: "15.00",
      categoria: "Prueba",
      stock_minimo: 1,
      stock_maximo: 100,
      imagen: "/images/la_cosecha_salsa_01.png",
    });
    products.push(product.id);
    await query("UPDATE stock SET stock_actual=50 WHERE id_producto=?", [
      product.id,
    ]);
    const user = {
      id: users[0],
      clienteId: clients[0],
      rol: "CLIENTE",
      sessionVersion: 1,
      correo_verificado: 1,
      correo: `0-${suffix}@example.test`,
    };
    const other = {
      ...user,
      id: users[1],
      clienteId: clients[1],
      correo: `1-${suffix}@example.test`,
    };
    const [method] = await query(
      "SELECT id FROM tipos_pago WHERE nombre='Tarjeta'",
    );
    const [address] = await query(
      "SELECT id FROM direcciones WHERE id_cliente=?",
      [user.clienteId],
    );
    const input = {
      id_direccion: address.id,
      id_tipo_pago: method.id,
      key: randomUUID(),
    };
    let order, sale;
    await t.test(
      "el carrito persiste y la conversión es idempotente",
      async () => {
        await setCartItem(user.clienteId, product.id, 2);
        order = await createOrder(user, input);
        assert.equal((await createOrder(user, input)).id, order.id);
        assert.equal(
          (
            await query("SELECT stock_actual FROM stock WHERE id_producto=?", [
              product.id,
            ])
          )[0].stock_actual,
          48,
        );
        assert.equal(
          (
            await query(
              "SELECT COUNT(*) AS n FROM pedidos WHERE id_carrito=?",
              [order.id_carrito],
            )
          )[0].n,
          1,
        );
      },
    );
    await t.test("no se admite domicilio ajeno", async () => {
      await setCartItem(other.clienteId, product.id, 1);
      await assert.rejects(
        () => createOrder(other, { ...input, key: randomUUID() }),
        { status: 422 },
      );
    });
    await t.test(
      "webhook firmado crea una sola venta y un solo ticket",
      async () => {
        const eventId = `evt_local_${suffix}`;
        events.push(eventId);
        const payload = JSON.stringify({
          id: eventId,
          type: "checkout.session.completed",
          data: {
            object: {
              id: `cs_local_${suffix}`,
              client_reference_id: String(order.id),
              currency: "mxn",
              amount_total: 3000,
              payment_status: "paid",
              status: "complete",
            },
          },
        });
        const header = Stripe.webhooks.generateTestHeaderString({
          payload,
          secret: process.env.STRIPE_WEBHOOK_SECRET,
        });
        for (let n = 0; n < 2; n++)
          await request(commerce)
            .post("/webhook")
            .set("Content-Type", "application/json")
            .set("stripe-signature", header)
            .send(payload)
            .expect(200);
        const sales = await query("SELECT * FROM ventas WHERE id_pedido=?", [
          order.id,
        ]);
        assert.equal(sales.length, 1);
        sale = sales[0];
        assert.equal(
          (
            await query(
              "SELECT COUNT(*) AS n FROM comprobantes WHERE id_venta=?",
              [sale.id],
            )
          )[0].n,
          1,
        );
        const token = await signSession(user);
        await request(commerce)
          .get(`/receipts/${sale.id}/pdf`)
          .set("X-Service-Key", process.env.SERVICE_KEY)
          .auth(token, { type: "bearer" })
          .expect("Content-Type", /pdf/)
          .expect(200);
        await request(commerce)
          .get(`/receipts/${sale.id}`)
          .set("X-Service-Key", process.env.SERVICE_KEY)
          .auth(await signSession(other), { type: "bearer" })
          .expect(404);
      },
    );
    await t.test(
      "reseña CRUD del comprador persiste y protege propiedad",
      async () => {
        const token = await signSession(user);
        const h = { "X-Service-Key": process.env.SERVICE_KEY };
        const result = await request(reviews)
          .post("/reviews")
          .set(h)
          .auth(token, { type: "bearer" })
          .send({
            id_producto: product.id,
            calificacion: 5,
            comentario: "Prueba de persistencia",
          })
          .expect(201);
        await request(reviews)
          .put(`/reviews/${result.body.data.id}`)
          .set(h)
          .auth(await signSession(other), { type: "bearer" })
          .send({ calificacion: 1, comentario: "Ajeno" })
          .expect(404);
        await request(reviews)
          .put(`/reviews/${result.body.data.id}`)
          .set(h)
          .auth(token, { type: "bearer" })
          .send({ calificacion: 4, comentario: "Actualizada" })
          .expect(200);
        await request(reviews)
          .delete(`/reviews/${result.body.data.id}`)
          .set(h)
          .auth(token, { type: "bearer" })
          .expect(200);
      },
    );
    await t.test(
      "una devolución recibida repone stock una sola vez",
      async () => {
        const d = await create(user, "returns", {
          id_venta: sale.id,
          id_producto: product.id,
          cantidad: 1,
          motivo: "Prueba",
        });
        await change(user, "returns", d.id, { estado: "aprobada" });
        await change(user, "returns", d.id, {
          estado: "recibida",
          reintegrar: true,
        });
        await assert.rejects(
          () =>
            change(user, "returns", d.id, {
              estado: "recibida",
              reintegrar: true,
            }),
          { status: 409 },
        );
        assert.equal(
          (
            await query("SELECT stock_actual FROM stock WHERE id_producto=?", [
              product.id,
            ])
          )[0].stock_actual,
          49,
        );
        await assert.rejects(
          () =>
            create(user, "returns", {
              id_venta: sale.id,
              id_producto: product.id,
              cantidad: 2,
              motivo: "Excede compra",
            }),
          { status: 409 },
        );
      },
    );
    await t.test(
      "dos compradores no pueden reservar las últimas unidades simultáneamente",
      async () => {
        await query("UPDATE stock SET stock_actual=2 WHERE id_producto=?", [
          product.id,
        ]);
        await setCartItem(user.clienteId, product.id, 2);
        await setCartItem(other.clienteId, product.id, 2);
        const [otherAddress] = await query(
          "SELECT id FROM direcciones WHERE id_cliente=?",
          [other.clienteId],
        );
        const outcomes = await Promise.allSettled([
          createOrder(user, { ...input, key: randomUUID() }),
          createOrder(other, {
            ...input,
            id_direccion: otherAddress.id,
            key: randomUUID(),
          }),
        ]);
        assert.equal(
          outcomes.filter((o) => o.status === "fulfilled").length,
          1,
        );
        assert.equal(
          (
            await query("SELECT stock_actual FROM stock WHERE id_producto=?", [
              product.id,
            ])
          )[0].stock_actual,
          0,
        );
      },
    );
  } finally {
    // Solo se limpian registros creados por esta ejecución, en orden de sus FK.
    for (const client of clients) {
      const sales = await query("SELECT id FROM ventas WHERE id_cliente=?", [
        client,
      ]);
      for (const { id } of sales) {
        for (const table of [
          "cola_comprobantes",
          "devoluciones_venta",
          "garantias",
          "comprobantes",
          "envios",
          "detalle_ventas",
        ])
          await query(`DELETE FROM ${table} WHERE id_venta=?`, [id]);
      }
      for (const { id } of sales)
        await query("DELETE FROM movimientos_inventario WHERE id_venta=?", [
          id,
        ]);
      await query("DELETE FROM ventas WHERE id_cliente=?", [client]);
      const orders = await query("SELECT id FROM pedidos WHERE id_cliente=?", [
        client,
      ]);
      for (const { id } of orders) {
        await query("DELETE FROM pagos WHERE id_pedido=?", [id]);
        await query("DELETE FROM detalle_pedidos WHERE id_pedido=?", [id]);
      }
      await query("DELETE FROM pedidos WHERE id_cliente=?", [client]);
      await query("DELETE FROM carrito WHERE id_cliente=?", [client]);
      await query("DELETE FROM direcciones WHERE id_cliente=?", [client]);
      await query("DELETE FROM resenas WHERE id_cliente=?", [client]);
      await query("DELETE FROM clientes WHERE id=?", [client]);
    }
    for (const id of products) {
      await query("DELETE FROM movimientos_inventario WHERE id_producto=?", [
        id,
      ]);
      await query("DELETE FROM stock WHERE id_producto=?", [id]);
      await query("DELETE FROM productos WHERE id=?", [id]);
    }
    if (supplier) await query("DELETE FROM proveedores WHERE id=?", [supplier]);
    for (const id of users)
      await query("DELETE FROM usuarios WHERE id=?", [id]);
    for (const id of events)
      await query("DELETE FROM eventos_pago WHERE id_evento=?", [id]);
    await pool.end();
  }
});
