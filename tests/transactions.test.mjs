import test from "node:test";
import assert from "node:assert/strict";
import { pool, transaction } from "../packages/core/db.mjs";
import { moveStock } from "../packages/core/stock.mjs";
import { settleSession } from "../services/commerce/payments.mjs";
import { create, change } from "../services/returns/service.mjs";

// Se simula únicamente el adaptador SQL. Estas pruebas no se presentan como MySQL real.
function database(t, respond) {
  const calls = [];
  const state = { commits: 0, rollbacks: 0, releases: 0 };
  const c = {
    beginTransaction: async () => {},
    commit: async () => state.commits++,
    rollback: async () => state.rollbacks++,
    release: () => state.releases++,
    execute: async (sql, params) => {
      calls.push({ sql, params });
      return [await respond(sql, params)];
    },
  };
  t.mock.method(pool, "getConnection", async () => c);
  return { calls, state, c };
}
test("sin existencias: no hay UPDATE ni movimiento y la transacción revierte", async (t) => {
  const db = database(t, () => [{ stock_actual: 2 }]);
  await assert.rejects(
    () => transaction((c) => moveStock(c, 1, -3, 1, "Prueba")),
    { status: 409 },
  );
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].sql, /FOR UPDATE/);
  assert.equal(db.state.rollbacks, 1);
  assert.equal(db.state.commits, 0);
  assert.equal(db.state.releases, 1);
});
test("entrada escribe saldo y bitácora en la misma conexión; un fallo en bitácora revierte", async (t) => {
  const db = database(t, (sql) => {
    if (sql.startsWith("SELECT")) return [{ stock_actual: 3 }];
    if (sql.startsWith("INSERT")) throw new Error("fallo de escritura");
    return { affectedRows: 1 };
  });
  await assert.rejects(
    () => transaction((c) => moveStock(c, 9, 2, 7, "Recepción", { compra: 4 })),
    /fallo/,
  );
  assert.deepEqual(db.calls[1].params, [5, 9]);
  assert.deepEqual(db.calls[2].params.slice(0, 7), [
    9,
    7,
    "entrada",
    2,
    3,
    5,
    4,
  ]);
  assert.equal(db.state.rollbacks, 1);
});
const session = {
  id: "cs_test_local",
  client_reference_id: "2",
  currency: "mxn",
  amount_total: 2500,
  payment_status: "paid",
  status: "complete",
};
function paidResponse(sql) {
  if (sql.startsWith("SELECT p."))
    return [
      {
        id: 2,
        id_cliente: 8,
        id_usuario: 3,
        id_direccion: 7,
        total: "25.00",
        estado: "pendiente",
      },
    ];
  if (sql.startsWith("SELECT * FROM pagos"))
    return [{ id: 9, referencia_proveedor: session.id }];
  return { affectedRows: 1, insertId: 15 };
}
test("pago confirmado produce exactamente venta, detalles, comprobante y envío", async (t) => {
  const db = database(t, paidResponse);
  await settleSession(session, "evt_test_1");
  for (const table of ["ventas", "detalle_ventas", "comprobantes", "envios"])
    assert.equal(
      db.calls.filter((c) => c.sql.startsWith(`INSERT INTO ${table}(`)).length,
      1,
    );
  assert.equal(
    db.calls.filter((c) => c.sql.startsWith("UPDATE stock")).length,
    0,
  );
  assert.equal(db.state.commits, 1);
});
test("el mismo evento repetido termina sin crear una segunda venta", async (t) => {
  const db = database(t, () => ({ affectedRows: 0 }));
  assert.deepEqual(await settleSession(session, "evt_repetido"), {
    duplicate: true,
  });
  assert.equal(db.calls.length, 1);
});
test("importe o moneda incorrectos revierten hasta el registro de evento", async (t) => {
  const db = database(t, paidResponse);
  await assert.rejects(
    () => settleSession({ ...session, amount_total: 1 }, "evt_wrong"),
    { status: 409 },
  );
  assert.equal(db.state.rollbacks, 1);
  assert.equal(
    db.calls.filter((c) => c.sql.startsWith("INSERT INTO ventas")).length,
    0,
  );
});
test("la expiración confirmada libera la reserva; no registra una venta", async (t) => {
  const db = database(t, (sql) => {
    if (sql.startsWith("SELECT * FROM detalle_pedidos"))
      return [{ id_producto: 3, cantidad: 2 }];
    if (sql.startsWith("SELECT * FROM stock")) return [{ stock_actual: 8 }];
    return paidResponse(sql);
  });
  await settleSession(
    { ...session, payment_status: "unpaid", status: "expired" },
    "evt_expired",
  );
  assert.deepEqual(
    db.calls.find((c) => c.sql.startsWith("UPDATE stock")).params,
    [10, 3],
  );
  assert.equal(
    db.calls.filter((c) => c.sql.startsWith("INSERT INTO ventas")).length,
    0,
  );
});
test("un cliente no puede solicitar devolución de una venta ajena", async (t) => {
  const db = database(t, () => [{ id: 1, id_cliente: 50 }]);
  await assert.rejects(
    () =>
      create({ id: 1, rol: "CLIENTE", clienteId: 2 }, "returns", {
        id_venta: 1,
        id_producto: 1,
        cantidad: 1,
        motivo: "Prueba",
      }),
    { status: 404 },
  );
  assert.equal(db.calls.length, 1);
});
test("recibir dos veces una devolución no reintegra inventario dos veces", async (t) => {
  const db = database(t, () => [{ id: 1, estado: "recibida", cantidad: 1 }]);
  await assert.rejects(
    () =>
      change({ id: 1 }, "returns", 1, { estado: "recibida", reintegrar: true }),
    { status: 409 },
  );
  assert.equal(db.calls.length, 1);
  assert.equal(db.state.rollbacks, 1);
});
