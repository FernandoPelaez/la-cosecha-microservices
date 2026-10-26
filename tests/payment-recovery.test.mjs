import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../packages/core/db.mjs";
import { processor } from "../services/commerce/processor.mjs";
import { cancelOrder } from "../services/commerce/cancellation.mjs";
import { orderResult } from "../services/commerce/order-result.mjs";
import { refund } from "../services/returns/refund.mjs";
import { settleSession } from "../services/commerce/payments.mjs";

// Dobles explícitos de MySQL/Stripe: verifican contratos, no operaciones reales.
process.env.STRIPE_SECRET_KEY = "sk_test_local_contract_only";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_contract_only";
const stripe = processor();
const user = { clienteId: 7 };
const session = {
  id: "cs_contract",
  client_reference_id: "3",
  currency: "mxn",
  amount_total: 2000,
  status: "open",
  payment_status: "unpaid",
};

function database(
  t,
  { owned = true, state = "pendiente", reference = session.id } = {},
) {
  const writes = [];
  let orderState = state;
  const execute = async (sql, params) => {
    if (sql.startsWith("SELECT p.*"))
      return [
        [
          {
            id: 3,
            id_cliente: 7,
            id_usuario: 9,
            id_direccion: 2,
            total: "20.00",
            estado: orderState,
          },
        ],
      ];
    if (sql.startsWith("SELECT * FROM pagos"))
      return [[{ id: 4, referencia_proveedor: reference }]];
    if (sql.startsWith("SELECT * FROM detalle_pedidos"))
      return [[{ id_producto: 1, cantidad: 2 }]];
    if (sql.startsWith("SELECT * FROM stock")) return [[{ stock_actual: 4 }]];
    if (sql.startsWith("SELECT p.id"))
      return [
        owned
          ? [
              {
                id: 3,
                estado: orderState,
                total: "20.00",
                referencia_proveedor: reference,
              },
            ]
          : [],
      ];
    writes.push({ sql, params });
    if (sql.includes("UPDATE pedidos SET estado='pagado'"))
      orderState = "pagado";
    if (sql.includes("UPDATE pedidos SET estado='cancelado'"))
      orderState = "cancelado";
    return [{ affectedRows: 1, insertId: 10 }];
  };
  t.mock.method(pool, "execute", execute);
  t.mock.method(pool, "getConnection", async () => ({
    execute,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
  }));
  return writes;
}

test("un cliente no puede conciliar ni cancelar un pedido ajeno", async (t) => {
  database(t, { owned: false });
  const retrieve = t.mock.method(
    stripe.checkout.sessions,
    "retrieve",
    async () => {
      throw new Error("No debe consultar Stripe");
    },
  );
  await assert.rejects(() => orderResult(user, 3), { status: 404 });
  await assert.rejects(() => cancelOrder(user, 3), { status: 404 });
  assert.equal(retrieve.mock.callCount(), 0);
});

test("el retorno anterior al webhook confirma el pago consultado al proveedor", async (t) => {
  const writes = database(t);
  t.mock.method(stripe.checkout.sessions, "retrieve", async () => ({
    ...session,
    status: "complete",
    payment_status: "paid",
  }));
  assert.equal((await orderResult(user, 3)).estado, "pagado");
  assert.equal(
    writes.filter((x) => x.sql.startsWith("INSERT INTO ventas(")).length,
    1,
  );
  assert.equal(
    writes.filter((x) => x.sql.startsWith("UPDATE stock")).length,
    0,
  );
});

test("el retorno posterior al webhook no crea otra venta ni consulta de nuevo", async (t) => {
  const writes = database(t, { state: "pagado" });
  const retrieve = t.mock.method(
    stripe.checkout.sessions,
    "retrieve",
    async () => session,
  );
  assert.equal((await orderResult(user, 3)).estado, "pagado");
  assert.equal(retrieve.mock.callCount(), 0);
  assert.equal(writes.length, 0);
});

test("un pago pendiente conserva existencias reservadas y no acredita la venta", async (t) => {
  const writes = database(t);
  t.mock.method(stripe.checkout.sessions, "retrieve", async () => session);
  assert.equal((await orderResult(user, 3)).estado, "pendiente");
  assert.equal(writes.length, 0);
});

test("cancelar exige expiración confirmada y devuelve stock una sola vez", async (t) => {
  const writes = database(t);
  t.mock.method(stripe.checkout.sessions, "retrieve", async () => session);
  const expire = t.mock.method(
    stripe.checkout.sessions,
    "expire",
    async () => ({ ...session, status: "expired" }),
  );
  await cancelOrder(user, 3);
  await cancelOrder(user, 3);
  assert.equal(expire.mock.callCount(), 1);
  assert.equal(
    writes.filter((x) => x.sql.startsWith("UPDATE stock")).length,
    1,
  );
});

test("si se cobra al mismo tiempo que se cancela, se concilia sin liberar stock", async (t) => {
  const writes = database(t);
  let reads = 0;
  t.mock.method(stripe.checkout.sessions, "retrieve", async () =>
    ++reads === 1
      ? session
      : { ...session, status: "complete", payment_status: "paid" },
  );
  t.mock.method(stripe.checkout.sessions, "expire", async () => {
    throw new Error("Ya completada");
  });
  await assert.rejects(() => cancelOrder(user, 3), { status: 409 });
  assert.equal(
    writes.filter((x) => x.sql.startsWith("INSERT INTO ventas(")).length,
    1,
  );
  assert.equal(
    writes.filter((x) => x.sql.startsWith("UPDATE stock")).length,
    0,
  );
});

test("sin referencia confirmada no se libera la reserva a ciegas", async (t) => {
  const writes = database(t, { reference: null });
  await assert.rejects(() => cancelOrder(user, 3), { status: 409 });
  assert.equal(writes.length, 0);
});

test("el fallo asíncrono firmado libera la reserva y registra rechazo", async (t) => {
  const writes = database(t);
  await settleSession(
    { ...session, status: "complete" },
    "evt_failure",
    "checkout.session.async_payment_failed",
  );
  assert.equal(
    writes.find((x) => x.sql.startsWith("UPDATE pagos SET estado=?")).params[0],
    "rechazado",
  );
  assert.equal(
    writes.filter((x) => x.sql.startsWith("UPDATE stock")).length,
    1,
  );
});

for (const status of ["pending", "succeeded", "failed"]) {
  test(`reembolso ${status}: recupera metadata y no duplica la solicitud`, async (t) => {
    const writes = [];
    t.mock.method(pool, "execute", async () => [
      [
        {
          id: 6,
          estado: "recibida",
          cantidad: 2,
          precio_unitario: "10.00",
          referencia_proveedor: session.id,
        },
      ],
    ]);
    t.mock.method(pool, "getConnection", async () => ({
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release() {},
      execute: async (sql, params) => {
        writes.push({ sql, params });
        return [{ affectedRows: 1 }];
      },
    }));
    t.mock.method(stripe.checkout.sessions, "retrieve", async () => ({
      payment_intent: "pi_contract",
    }));
    t.mock.method(stripe.refunds, "list", () =>
      (async function* () {
        yield {
          id: "re_contract",
          amount: 2000,
          status,
          metadata: { devolucion_id: "6" },
        };
      })(),
    );
    const create = t.mock.method(stripe.refunds, "create", async () => {
      throw new Error("No duplicar");
    });
    assert.deepEqual(await refund(6), {
      completed: status === "succeeded",
      status,
    });
    assert.equal(create.mock.callCount(), 0);
    assert.deepEqual(writes[0].params, ["re_contract", status, status, 6]);
  });
}
