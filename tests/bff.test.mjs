import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { GET, POST } from "../apps/web/src/app/api/[...path]/route.ts";
const context = (path) => ({ params: Promise.resolve({ path }) });
process.env.APP_URL = "http://localhost:3000";
test("BFF rechaza modificaciones originadas fuera de la tienda y rutas arbitrarias", async () => {
  const bad = new NextRequest("http://localhost:3000/api/cart/1", {
    method: "POST",
    headers: { Origin: "https://otra.test" },
  });
  assert.equal((await POST(bad, context(["cart", "1"]))).status, 403);
  assert.equal(
    (
      await GET(
        new NextRequest("http://localhost:3000/api/otra"),
        context(["otra"]),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await GET(
        new NextRequest("http://localhost:3000/api/products"),
        context(["products", "..", "auth"]),
      )
    ).status,
    404,
  );
});
test("BFF guarda el token solo en cookie HttpOnly y envía el usuario al navegador", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      data: { token: "token-test-no-real", user: { id: 1, nombre: "Cliente" } },
    }),
  );
  const response = await POST(
    new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
    context(["auth", "login"]),
  );
  assert.deepEqual(await response.json(), {
    data: { id: 1, nombre: "Cliente" },
  });
  assert.match(response.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(response.headers.get("set-cookie"), /SameSite=lax/i);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("BFF traduce el error heredado de proveedores al contrato de la aplicación", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { success: false, message: "RFC ya registrado" },
      { status: 409 },
    ),
  );
  const response = await GET(
    new NextRequest("http://localhost:3000/api/suppliers"),
    context(["suppliers"]),
  );
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.message, "RFC ya registrado");
});

test("BFF no borra la cookie cuando el servicio rechaza cerrar la sesión", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: { message: "No disponible" } }, { status: 503 }),
  );
  const response = await POST(
    new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: { Origin: "http://localhost:3000", Cookie: "lc_session=prueba" },
    }),
    context(["auth", "logout"]),
  );
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("set-cookie"), null);
});
