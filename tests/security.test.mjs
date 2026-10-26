import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { pool } from "../packages/core/db.mjs";
import {
  signSession,
  identify,
  internal,
  roles,
  digest,
} from "../packages/core/security.mjs";
import { generarHash, verificarPassword } from "../services/auth/passwords.mjs";
import { verifyBot } from "../services/auth/bot.mjs";
process.env.JWT_SECRET = randomBytes(48).toString("base64url");
process.env.SERVICE_KEY = randomBytes(48).toString("hex");
test("bcrypt almacena un hash con sal y no admite una contraseña distinta", async () => {
  const hash = await generarHash("Prueba-solamente-2026");
  assert.notEqual(hash, "Prueba-solamente-2026");
  assert.equal(await verificarPassword("Prueba-solamente-2026", hash), true);
  assert.equal(await verificarPassword("otra", hash), false);
});
test("tokens de recuperación se transforman en hash irreversible de longitud fija", () => {
  const token = randomBytes(32).toString("hex");
  assert.notEqual(digest(token), token);
  assert.equal(digest(token).length, 64);
});
test("sesión firmada: duración, emisor y revocación consultada en cada petición", async (t) => {
  const user = { id: 4, rol: "CLIENTE", estado: "activo", sessionVersion: 2 };
  const token = await signSession(user);
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(process.env.JWT_SECRET),
  );
  assert.equal(payload.exp - payload.iat, 7200);
  assert.equal(payload.iss, "la-cosecha");
  const lookup = t.mock.method(pool, "execute", async () => [[user]]);
  assert.equal((await identify(token)).id, 4);
  lookup.mock.mockImplementation(async () => [
    [{ ...user, sessionVersion: 3 }],
  ]);
  await assert.rejects(() => identify(token), { status: 401 });
  await assert.rejects(() => identify(token.slice(0, -8) + "tampered"), {
    status: 401,
  });
});
test("una firma correcta con audiencia incorrecta no obtiene acceso", async () => {
  const token = await new SignJWT({ sid: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("1")
    .setIssuer("la-cosecha")
    .setAudience("otro")
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  await assert.rejects(() => identify(token), { status: 401 });
});
test("clave interna y roles se validan en backend, incluso con entrada Unicode", () => {
  assert.throws(() => internal({ headers: {} }, null, () => {}), {
    status: 401,
  });
  assert.throws(
    () =>
      internal(
        {
          headers: {
            "x-service-key": "é".repeat(process.env.SERVICE_KEY.length),
          },
        },
        null,
        () => {},
      ),
    { status: 401 },
  );
  let calls = 0;
  internal(
    { headers: { "x-service-key": process.env.SERVICE_KEY } },
    null,
    () => calls++,
  );
  assert.equal(calls, 1);
  assert.throws(
    () => roles("ADMIN")({ user: { rol: "CLIENTE" } }, null, () => {}),
    { status: 403 },
  );
  roles("ADMIN", "INVENTARIO")(
    { user: { rol: "INVENTARIO" } },
    null,
    () => calls++,
  );
  assert.equal(calls, 2);
});
test("Turnstile verifica éxito, acción y hostname en el servidor", async (t) => {
  process.env.TURNSTILE_SECRET_KEY = "test-not-a-real-secret";
  process.env.TURNSTILE_HOSTNAME = "localhost";
  const response = { success: true, action: "login", hostname: "localhost" };
  const fetcher = t.mock.method(globalThis, "fetch", async () =>
    Response.json(response),
  );
  await verifyBot("respuesta-prueba", "login");
  assert.match(fetcher.mock.calls[0].arguments[0], /siteverify$/);
  for (const invalid of [
    { ...response, success: false },
    { ...response, action: "register" },
    { ...response, hostname: "otro.test" },
  ]) {
    fetcher.mock.mockImplementation(async () => Response.json(invalid));
    await assert.rejects(() => verifyBot("respuesta-prueba", "login"), {
      status: 422,
    });
  }
  delete process.env.TURNSTILE_SECRET_KEY;
  await assert.rejects(() => verifyBot("respuesta-prueba", "login"), {
    status: 503,
  });
});
