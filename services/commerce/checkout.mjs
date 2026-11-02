import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { cents, decimal, isCardMethod } from "../../packages/core/money.mjs";
import { moveStock } from "../../packages/core/stock.mjs";
import { openCart, cartLines } from "./cart.mjs";
import { processor } from "./processor.mjs";

export async function paymentMethods() {
  const rows = await query("SELECT * FROM tipos_pago");

  return rows
    .filter((r) => isCardMethod(r.nombre))
    .map((r) => ({
      ...r,
      disponible:
        process.env.PAYMENTS_ENABLED === "true" &&
        Boolean(
          process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
        ),
    }));
}

export async function createOrder(user, input) {
  ensure(user.correo_verificado, 403, "Confirma tu correo antes de comprar");

  ensure(
    process.env.PAYMENTS_ENABLED === "true",
    503,
    "Los pagos todavía no están habilitados",
  );

  processor();

  const methods = await paymentMethods();

  ensure(
    methods.some((m) => m.id === input.id_tipo_pago && m.disponible),
    422,
    "El método de pago no está permitido o no está disponible",
  );

  return transaction(async (c) => {
    // Coordinar la creación del pedido con el cierre de la cuenta.
    const [account] = await query(
      `SELECT estado
       FROM usuarios
       WHERE id = ?
       FOR UPDATE`,
      [user.id],
      c,
    );

    ensure(
      account?.estado === "activo",
      401,
      "Tu cuenta ya no está activa.",
    );

    const cartId = await openCart(c, user.clienteId);

    const [existing] = await query(
      "SELECT * FROM pedidos WHERE clave_idempotencia=?",
      [input.key],
      c,
    );

    if (existing) {
      ensure(
        existing.id_cliente === user.clienteId,
        409,
        "La clave ya se utilizó",
      );

      ensure(
        existing.id_direccion === input.id_direccion &&
          existing.id_tipo_pago === input.id_tipo_pago,
        409,
        "La solicitud cambió; inicia una nueva operación",
      );

      return existing;
    }

    const [address] = await query(
      `SELECT *
       FROM direcciones
       WHERE id=? AND id_cliente=?
       FOR UPDATE`,
      [input.id_direccion, user.clienteId],
      c,
    );

    ensure(address, 422, "Selecciona un domicilio de tu cuenta");

    const items = await cartLines(c, cartId);

    ensure(items.length > 0, 422, "El carrito está vacío");

    let total = 0;

    for (const line of items) {
      ensure(
        line.activo &&
          (!line.caducidad ||
            line.caducidad >= new Date().toISOString().slice(0, 10)),
        409,
        "Hay productos no disponibles",
      );

      total += cents(line.precio_final) * line.cantidad;
    }

    ensure(total > 0, 422, "El pedido debe tener un importe mayor a cero");

    const result = await query(
      `INSERT INTO pedidos (
         id_carrito,
         id_cliente,
         id_direccion,
         id_tipo_pago,
         total,
         clave_idempotencia,
         vence_reserva,
         cliente_snapshot,
         domicilio_snapshot
       )
       VALUES (
         ?, ?, ?, ?, ?, ?,
         DATE_ADD(UTC_TIMESTAMP(), INTERVAL 31 MINUTE), ?, ?
       )`,
      [
        cartId,
        user.clienteId,
        input.id_direccion,
        input.id_tipo_pago,
        decimal(total),
        input.key,
        JSON.stringify({
          nombre: user.nombre,
          correo: user.correo,
          telefono: user.telefono || null,
        }),
        JSON.stringify(address),
      ],
      c,
    );

    for (const line of items) {
      await moveStock(
        c,
        line.id_producto,
        -line.cantidad,
        user.id,
        `Reserva pedido ${result.insertId}`,
      );

      await query(
        `INSERT INTO detalle_pedidos (
           id_pedido,
           id_producto,
           cantidad,
           precio_unitario,
           descuento_unitario,
           nombre_snapshot,
           imagen_snapshot
         )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          line.id_producto,
          line.cantidad,
          line.precio,
          decimal(cents(line.precio) - cents(line.precio_final)),
          line.nombre,
          line.imagen,
        ],
        c,
      );
    }

    await query(
      "UPDATE carrito SET estado='convertido' WHERE id=?",
      [cartId],
      c,
    );

    await query(
      `INSERT INTO pagos (
         id_pedido,
         id_tipo_pago,
         proveedor_pago,
         clave_idempotencia,
         monto
       )
       VALUES (?, ?, ?, ?, ?)`,
      [
        result.insertId,
        input.id_tipo_pago,
        "stripe",
        input.key,
        decimal(total),
      ],
      c,
    );

    const [order] = await query(
      "SELECT * FROM pedidos WHERE id=?",
      [result.insertId],
      c,
    );

    return order;
  });
}

export async function checkout(user, input) {
  const order = await createOrder(user, input);

  return paymentLink(user, order.id);
}

export async function paymentLink(user, orderId) {
  ensure(
    process.env.PAYMENTS_ENABLED === "true",
    503,
    "Los pagos todavía no están habilitados",
  );

  return transaction(async (c) => {
    const [order] = await query(
      `SELECT *
       FROM pedidos
       WHERE id=? AND id_cliente=?
       FOR UPDATE`,
      [orderId, user.clienteId],
      c,
    );

    ensure(order, 404, "Pedido no encontrado");

    ensure(
      order.estado === "pendiente",
      409,
      "Este pedido ya no admite pagos",
    );

    ensure(user.correo_verificado, 403, "Confirma tu correo antes de comprar");

    const [payment] = await query(
      `SELECT *
       FROM pagos
       WHERE id_pedido=?
       FOR UPDATE`,
      [order.id],
      c,
    );

    ensure(payment, 409, "No se encontró el pago asociado al pedido");

    if (payment.referencia_proveedor) {
      const session = await processor().checkout.sessions.retrieve(
        payment.referencia_proveedor,
      );

      ensure(
        session.status === "open" && session.url,
        409,
        "La sesión terminó. Actualiza tu historial para consultar el resultado",
      );

      return {
        orderId: order.id,
        url: session.url,
      };
    }

    const items = await query(
      `SELECT
         d.*,
         COALESCE(d.nombre_snapshot,p.nombre) AS nombre
       FROM detalle_pedidos d
       JOIN productos p
         ON p.id=d.id_producto
       WHERE d.id_pedido=?
       ORDER BY p.id`,
      [order.id],
      c,
    );

    ensure(items.length > 0, 409, "El pedido no contiene productos");

    const reservationExpiry = order.vence_reserva;

    const expirationTime =
      reservationExpiry instanceof Date
        ? reservationExpiry.getTime()
        : Date.parse(
            `${String(reservationExpiry).replace(" ", "T").replace(/Z$/, "")}Z`,
          );

    ensure(
      Number.isFinite(expirationTime),
      409,
      "La fecha de reserva del pedido no es válida",
    );

    const expires = Math.floor(expirationTime / 1000);

    const session = await processor().checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: String(order.id),
        customer_email: user.correo,

        metadata: {
          orderId: String(order.id),
        },

        line_items: items.map((line) => ({
          quantity: line.cantidad,

          price_data: {
            currency: "mxn",

            unit_amount:
              cents(line.precio_unitario) - cents(line.descuento_unitario),

            product_data: {
              name: line.nombre,
            },
          },
        })),

        expires_at: expires,

        success_url: `${process.env.APP_URL}/compra/resultado?pedido=${order.id}`,

        cancel_url: `${process.env.APP_URL}/cuenta?pedido=${order.id}`,
      },
      {
        idempotencyKey: order.clave_idempotencia,
      },
    );

    await query(
      "UPDATE pagos SET referencia_proveedor=? WHERE id=?",
      [session.id, payment.id],
      c,
    );

    return {
      orderId: order.id,
      url: session.url,
    };
  });
}

