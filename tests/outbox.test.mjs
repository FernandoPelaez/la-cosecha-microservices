import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { pool } from "../packages/core/db.mjs";
import { deliverPendingReceipts } from "../services/commerce/outbox.mjs";
test("sin SMTP se conserva la cola sin afirmar un envío", async (t) => {
  delete process.env.SMTP_HOST;
  const sql = t.mock.method(pool, "getConnection", async () => {
    throw new Error("No debería acceder");
  });
  assert.deepEqual(await deliverPendingReceipts(), {
    configured: false,
    sent: 0,
  });
  assert.equal(sql.mock.callCount(), 0);
});
test("si SMTP rechaza el comprobante, se programa reintento sin tocar la venta", async (t) => {
  process.env.SMTP_HOST = "smtp.example.test";
  process.env.MAIL_FROM = "ventas@example.test";
  const writes = [];
  const c = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: async (sql) => [
      sql.startsWith("SELECT")
        ? [{ id_venta: 1, intentos: 0 }]
        : { affectedRows: 1 },
    ],
  };
  t.mock.method(pool, "getConnection", async () => c);
  t.mock.method(pool, "execute", async (sql, params) => {
    if (sql.startsWith("SELECT c."))
      return [
        [
          {
            id: 5,
            id_cliente: 1,
            folio: "LC-TEST",
            fecha: "2026-10-17",
            nombre: "Prueba",
            correo: "cliente@example.test",
            total: "2.00",
          },
        ],
      ];
    if (/SELECT\s+d\./.test(sql))
      return [
        [
          {
            nombre: "Prueba",
            cantidad: 1,
            precio_unitario: "2.00",
            descuento_unitario: "0.00",
          },
        ],
      ];
    writes.push({ sql, params });
    return [{ affectedRows: 1 }];
  });
  t.mock.method(nodemailer, "createTransport", () => ({
    sendMail: async () => {
      throw Object.assign(new Error("SMTP temporal"), { code: "ETIMEDOUT" });
    },
  }));
  const result = await deliverPendingReceipts();
  assert.equal(result.sent, 0);
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /estado='pendiente'/);
  assert.deepEqual(writes[0].params, [60, "ETIMEDOUT", 1]);
});
