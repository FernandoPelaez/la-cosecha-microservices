import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { pool } from "../packages/core/db.mjs";
import { signSession } from "../packages/core/security.mjs";
process.env.NODE_ENV = "test";
process.env.SERVICE_KEY = randomBytes(48).toString("hex");
process.env.JWT_SECRET = randomBytes(48).toString("base64url");
const { default: inventory } = await import("../services/inventory/server.mjs");
const { default: commerce } = await import("../services/commerce/server.mjs");
const { default: auth } = await import("../services/auth/server.mjs");
const { default: reviews } = await import("../services/reviews/server.mjs");
const headers = { "X-Service-Key": process.env.SERVICE_KEY };
const client = {
  id: 3,
  rol: "CLIENTE",
  estado: "activo",
  sessionVersion: 1,
  clienteId: 2,
  correo_verificado: 1,
  correo: "cliente@example.test",
};
const token = await signSession(client);
const authorize = (t) =>
  t.mock.method(pool, "execute", async (sql) => {
    assert.match(sql, /FROM usuarios/);
    return [[client]];
  });
beforeEach((t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(new URL(url).pathname, "/me");
    const response = await request(auth).get("/me").set(options.headers);
    return Response.json(response.body, { status: response.status });
  });
});
test("servicios privados rechazan llamadas directas y sesiones manipuladas", async () => {
  await request(inventory).get("/products").expect(401);
  await request(inventory).get("/inventory").set(headers).expect(401);
  await request(commerce)
    .get("/cart")
    .set(headers)
    .set("Authorization", "Bearer manipulado")
    .expect(401);
});
test("cliente autenticado no puede modificar inventario ni acceder a compras", async (t) => {
  authorize(t);
  await request(inventory)
    .post("/products")
    .set(headers)
    .auth(token, { type: "bearer" })
    .send({})
    .expect(403);
  await request(commerce)
    .get("/purchases")
    .set(headers)
    .auth(token, { type: "bearer" })
    .expect(403);
});
test("registro exige correo, teléfono y contraseña válidos antes de contactar servicios", async () => {
  const response = await request(auth)
    .post("/register")
    .set(headers)
    .send({
      nombre: "A",
      correo: "invalido",
      telefono: "12",
      password: "123",
      botToken: "",
    })
    .expect(422);
  assert.ok(response.body.error.fields.telefono);
  assert.ok(response.body.error.fields.password);
});
test("sin configuración antibot no se permite un login", async () => {
  delete process.env.TURNSTILE_SECRET_KEY;
  await request(auth)
    .post("/login")
    .set(headers)
    .send({
      correo: "cliente@example.test",
      password: "contraseña",
      botToken: "mock",
    })
    .expect(503);
});
test("domicilio y carrito inválidos no escriben en la base", async (t) => {
  const sql = authorize(t);
  await request(commerce)
    .post("/addresses")
    .set(headers)
    .auth(token, { type: "bearer" })
    .send({
      calle_numero: "Calle 1",
      colonia: "Colonia",
      ciudad: "Ciudad",
      codigo_postal: "ABCDE",
    })
    .expect(422);
  await request(commerce)
    .put("/cart/1")
    .set(headers)
    .auth(token, { type: "bearer" })
    .send({ cantidad: -1 })
    .expect(422);
  assert.equal(sql.mock.callCount(), 2);
});
test("checkout rechaza SPEI en backend aunque se inyecte su id", async (t) => {
  process.env.PAYMENTS_ENABLED = "true";
  process.env.STRIPE_SECRET_KEY = "sk_test_not_real";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_not_real";
  t.mock.method(pool, "execute", async (sql) =>
    sql.includes("FROM usuarios")
      ? [[client]]
      : [
          [
            { id: 1, nombre: "Tarjeta" },
            { id: 2, nombre: "SPEI" },
          ],
        ],
  );
  const r = await request(commerce)
    .post("/checkout")
    .set(headers)
    .auth(token, { type: "bearer" })
    .send({ id_direccion: 1, id_tipo_pago: 2, key: crypto.randomUUID() })
    .expect(422);
  assert.match(r.body.error.message, /método/);
});
test("webhook sin firma válida no puede marcar una venta como pagada", async () => {
  await request(commerce)
    .post("/webhook")
    .send({
      type: "checkout.session.completed",
      data: { object: { payment_status: "paid" } },
    })
    .expect(400);
});
test("una reseña exige compra previa y no acepta al visitante", async (t) => {
  await request(reviews).post("/reviews").set(headers).send({}).expect(401);
  t.mock.method(pool, "execute", async (sql) =>
    sql.includes("FROM usuarios") ? [[client]] : [[]],
  );
  await request(reviews)
    .post("/reviews")
    .set(headers)
    .auth(token, { type: "bearer" })
    .send({ id_producto: 1, calificacion: 5, comentario: "Prueba sin compra" })
    .expect(403);
});

test("consultas internas de identidad no consumen el límite de formularios de acceso", async (t) => {
  authorize(t);
  for (let n = 0; n < 45; n++)
    await request(auth)
      .get("/me")
      .set(headers)
      .auth(token, { type: "bearer" })
      .expect(200);
});
