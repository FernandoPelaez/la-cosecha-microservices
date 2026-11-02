import test from "node:test";
import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";

if (
  process.env.NODE_ENV !== "test" ||
  process.env.INTEGRATION_DB !== "isolated" ||
  process.env.DB_NAME !== "la_cosecha_soa_test" ||
  process.env.DB_USER !== "la_cosecha_test" ||
  process.env.DB_PORT !== "3307" ||
  !["localhost", "127.0.0.1"].includes(process.env.DB_HOST)
) {
  throw new Error(
    "La prueba requiere la base de datos aislada de LA COSECHA.",
  );
}

const { pool, query } = await import("../packages/core/db.mjs");

const { registrar } = await import("../services/auth/service.mjs");

const { eliminarCuenta } = await import(
  "../services/auth/account-deletion.mjs"
);

test("Protección de eliminación ante operaciones pendientes", async (t) => {
  const correo = `eliminacion-${randomUUID()}@example.invalid`;
  const telefono = `699${String(randomInt(10_000_000)).padStart(7, "0")}`;
  const password = "Cosecha-Prueba#2026";

  let usuarioId;
  let clienteId;

  try {
    await registrar({
      nombre: "Cliente de prueba",
      correo,
      telefono,
      password,
    });

    const [usuario] = await query(
      `SELECT id, estado, version_sesion
       FROM usuarios
       WHERE correo = ?`,
      [correo],
    );

    assert.ok(usuario, "No se creó el usuario de prueba");

    usuarioId = usuario.id;

    const [cliente] = await query(
      "SELECT id FROM clientes WHERE id_usuario = ?",
      [usuarioId],
    );

    assert.ok(cliente, "No se creó el cliente de prueba");

    clienteId = cliente.id;

    const [tipoPago] = await query(
      "SELECT id FROM tipos_pago WHERE nombre = 'Tarjeta' LIMIT 1",
    );

    assert.ok(tipoPago, "No existe el tipo de pago Tarjeta");

    const [producto] = await query(
      "SELECT id FROM productos ORDER BY id LIMIT 1",
    );

    assert.ok(producto, "No existen productos de prueba");

    const direccion = await query(
      `INSERT INTO direcciones
        (id_cliente, calle_numero, colonia, ciudad, codigo_postal)
       VALUES (?, ?, ?, ?, ?)`,
      [
        clienteId,
        "Calle de prueba 123",
        "Centro",
        "Los Mochis",
        "81200",
      ],
    );

    const carritoPendiente = await query(
      "INSERT INTO carrito (id_cliente) VALUES (?)",
      [clienteId],
    );

    const pedidoPendiente = await query(
      `INSERT INTO pedidos
        (
          id_carrito,
          id_cliente,
          id_direccion,
          id_tipo_pago,
          estado,
          total
        )
       VALUES (?, ?, ?, ?, 'pendiente', 10.00)`,
      [
        carritoPendiente.insertId,
        clienteId,
        direccion.insertId,
        tipoPago.id,
      ],
    );

    const usuarioPrueba = {
      id: usuarioId,
      rol: "CLIENTE",
      sessionVersion: usuario.version_sesion,
    };

    const solicitudEliminacion = {
      passwordActual: password,
      confirmacion: "ELIMINAR",
    };

    async function verificarBloqueo(motivo) {
      await assert.rejects(
        () => eliminarCuenta(usuarioPrueba, solicitudEliminacion),
        { status: 409 },
        motivo,
      );

      const [cuenta] = await query(
        "SELECT estado FROM usuarios WHERE id = ?",
        [usuarioId],
      );

      assert.equal(
        cuenta?.estado,
        "activo",
        "La cuenta debe permanecer activa",
      );
    }

    // PRUEBA 1: PEDIDO PENDIENTE
    await t.test(
      "Rechaza la eliminación con pedidos pendientes",
      async () => {
        await verificarBloqueo(
          "No debe eliminarse una cuenta con pedidos pendientes",
        );

        console.log(
          "Pedido pendiente: eliminación rechazada correctamente.",
        );
      },
    );

    // PRUEBA 2: PAGO PENDIENTE
    // Cancelamos el pedido sintético para aislar la validación del pago.
    await query(
      "UPDATE pedidos SET estado = 'cancelado' WHERE id = ?",
      [pedidoPendiente.insertId],
    );

    await query(
      `INSERT INTO pagos
        (id_pedido, id_tipo_pago, monto, estado)
       VALUES (?, ?, ?, 'pendiente')`,
      [
        pedidoPendiente.insertId,
        tipoPago.id,
        "10.00",
      ],
    );

    await t.test(
      "Rechaza la eliminación con pagos pendientes",
      async () => {
        await verificarBloqueo(
          "No debe eliminarse una cuenta con pagos pendientes",
        );

        console.log(
          "Pago pendiente: eliminación rechazada correctamente.",
        );
      },
    );

    // Cerramos el pago sintético para evitar que interfiera
    // con las siguientes comprobaciones.
    await query(
      "UPDATE pagos SET estado = 'cancelado' WHERE id_pedido = ?",
      [pedidoPendiente.insertId],
    );

    // Crear una venta histórica sintética.
    const carritoHistorico = await query(
      "INSERT INTO carrito (id_cliente) VALUES (?)",
      [clienteId],
    );

    const pedidoHistorico = await query(
      `INSERT INTO pedidos
        (
          id_carrito,
          id_cliente,
          id_direccion,
          id_tipo_pago,
          estado,
          total
        )
       VALUES (?, ?, ?, ?, 'entregado', 10.00)`,
      [
        carritoHistorico.insertId,
        clienteId,
        direccion.insertId,
        tipoPago.id,
      ],
    );

    await query(
      `INSERT INTO pagos
        (id_pedido, id_tipo_pago, monto, estado)
       VALUES (?, ?, ?, 'capturado')`,
      [
        pedidoHistorico.insertId,
        tipoPago.id,
        "10.00",
      ],
    );

    const venta = await query(
      `INSERT INTO ventas
        (id_pedido, id_cliente, total)
       VALUES (?, ?, ?)`,
      [
        pedidoHistorico.insertId,
        clienteId,
        "10.00",
      ],
    );

    await query(
      `INSERT INTO detalle_ventas
        (id_venta, id_producto, cantidad, precio_unitario)
       VALUES (?, ?, ?, ?)`,
      [
        venta.insertId,
        producto.id,
        1,
        "10.00",
      ],
    );

    // PRUEBA 3: DEVOLUCIÓN PENDIENTE
    const devolucion = await query(
      `INSERT INTO devoluciones_venta
        (
          id_venta,
          id_producto,
          cantidad,
          motivo,
          estado
        )
       VALUES (?, ?, ?, ?, 'solicitada')`,
      [
        venta.insertId,
        producto.id,
        1,
        "Devolución temporal de prueba",
      ],
    );

    await t.test(
      "Rechaza la eliminación con devoluciones pendientes",
      async () => {
        await verificarBloqueo(
          "No debe eliminarse una cuenta con devoluciones pendientes",
        );

        console.log(
          "Devolución pendiente: eliminación rechazada correctamente.",
        );
      },
    );

    // Resolver la devolución para aislar la prueba de garantía.
    await query(
      `UPDATE devoluciones_venta
       SET estado = 'rechazada'
       WHERE id = ?`,
      [devolucion.insertId],
    );

    // PRUEBA 4: GARANTÍA PENDIENTE
    await query(
      `INSERT INTO garantias
        (
          id_venta,
          id_producto,
          motivo,
          estado
        )
       VALUES (?, ?, ?, 'solicitada')`,
      [
        venta.insertId,
        producto.id,
        "Garantía temporal de prueba",
      ],
    );

    await t.test(
      "Rechaza la eliminación con garantías pendientes",
      async () => {
        await verificarBloqueo(
          "No debe eliminarse una cuenta con garantías pendientes",
        );

        console.log(
          "Garantía pendiente: eliminación rechazada correctamente.",
        );
      },
    );
  } finally {
    try {
      // Limpiar únicamente los registros del cliente temporal.
      // Respetar el orden de las claves foráneas.
      if (clienteId) {
        await query(
          `DELETE g
           FROM garantias g
           INNER JOIN ventas v ON v.id = g.id_venta
           WHERE v.id_cliente = ?`,
          [clienteId],
        );

        await query(
          `DELETE d
           FROM devoluciones_venta d
           INNER JOIN ventas v ON v.id = d.id_venta
           WHERE v.id_cliente = ?`,
          [clienteId],
        );

        await query(
          `DELETE dv
           FROM detalle_ventas dv
           INNER JOIN ventas v ON v.id = dv.id_venta
           WHERE v.id_cliente = ?`,
          [clienteId],
        );

        await query(
          "DELETE FROM ventas WHERE id_cliente = ?",
          [clienteId],
        );

        await query(
          `DELETE pg
           FROM pagos pg
           INNER JOIN pedidos p ON p.id = pg.id_pedido
           WHERE p.id_cliente = ?`,
          [clienteId],
        );

        await query(
          "DELETE FROM pedidos WHERE id_cliente = ?",
          [clienteId],
        );

        await query(
          "DELETE FROM direcciones WHERE id_cliente = ?",
          [clienteId],
        );

        await query(
          "DELETE FROM carrito WHERE id_cliente = ?",
          [clienteId],
        );

        await query(
          "DELETE FROM clientes WHERE id = ?",
          [clienteId],
        );
      }

      if (usuarioId) {
        await query(
          "DELETE FROM tokens_recuperacion WHERE id_usuario = ?",
          [usuarioId],
        );

        await query(
          "DELETE FROM verificaciones_usuario WHERE id_usuario = ?",
          [usuarioId],
        );

        await query(
          "DELETE FROM usuarios WHERE id = ?",
          [usuarioId],
        );
      }
    } finally {
      await pool.end();
    }
  }
});

