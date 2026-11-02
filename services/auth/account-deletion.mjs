import { randomBytes } from "node:crypto";
import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { generarHash, verificarPassword } from "./passwords.mjs";

async function verificarOperacionesPendientes(clienteId, connection) {
  const [pedido] = await query(
    `SELECT id
     FROM pedidos
     WHERE id_cliente = ?
       AND estado NOT IN ('entregado', 'cancelado')
     LIMIT 1
     FOR UPDATE`,
    [clienteId],
    connection,
  );

  ensure(
    !pedido,
    409,
    "Tienes pedidos pendientes. Espera a que finalicen.",
  );

  const [pago] = await query(
    `SELECT pg.id
     FROM pagos pg
     JOIN pedidos p ON p.id = pg.id_pedido
     WHERE p.id_cliente = ?
       AND (
         pg.estado IN ('pendiente', 'autorizado')
         OR (p.estado = 'cancelado' AND pg.estado = 'capturado')
       )
     LIMIT 1
     FOR UPDATE`,
    [clienteId],
    connection,
  );

  ensure(
    !pago,
    409,
    "Tienes pagos pendientes de confirmación o conciliación.",
  );

  const [devolucion] = await query(
    `SELECT d.id
     FROM devoluciones_venta d
     JOIN ventas v ON v.id = d.id_venta
     WHERE v.id_cliente = ?
       AND (
         d.estado NOT IN ('rechazada', 'reembolsada')
         OR (
           d.estado = 'reembolsada'
           AND COALESCE(d.estado_reembolso, '') <> 'succeeded'
         )
         OR (
           d.estado_reembolso IS NOT NULL
           AND d.estado_reembolso <> 'succeeded'
         )
       )
     LIMIT 1
     FOR UPDATE`,
    [clienteId],
    connection,
  );

  ensure(
    !devolucion,
    409,
    "Tienes devoluciones o reembolsos pendientes.",
  );

  const [garantia] = await query(
    `SELECT g.id
     FROM garantias g
     JOIN ventas v ON v.id = g.id_venta
     WHERE v.id_cliente = ?
       AND g.estado NOT IN ('rechazada', 'resuelta')
     LIMIT 1
     FOR UPDATE`,
    [clienteId],
    connection,
  );

  ensure(
    !garantia,
    409,
    "Tienes garantías pendientes de resolución.",
  );
}

async function limpiarDatosNoHistoricos(clienteId, connection) {
  // Eliminar domicilios que no pertenecen a pedidos ni envíos.
  await query(
    `DELETE d
     FROM direcciones d
     LEFT JOIN pedidos p ON p.id_direccion = d.id
     LEFT JOIN envios e ON e.id_direccion = d.id
     WHERE d.id_cliente = ?
       AND p.id IS NULL
       AND e.id IS NULL`,
    [clienteId],
    connection,
  );

  // Eliminar referencias de tarjetas sin pedidos asociados.
  await query(
    `DELETE t
     FROM tarjetas t
     LEFT JOIN pedidos p ON p.id_tarjeta = t.id
     WHERE t.id_cliente = ?
       AND p.id IS NULL`,
    [clienteId],
    connection,
  );

  // Limpiar datos de tarjetas vinculadas a pedidos históricos.
  // Se conserva su identificador para respetar las claves foráneas.
  const identificador = randomBytes(12).toString("hex");

  await query(
    `UPDATE tarjetas t
     SET
       t.token_pago = CONCAT('eliminada-', t.id, '-', ?),
       t.ultimos_digitos = '0000',
       t.verificada = FALSE
     WHERE t.id_cliente = ?
       AND EXISTS (
         SELECT 1
         FROM pedidos p
         WHERE p.id_tarjeta = t.id
       )`,
    [identificador, clienteId],
    connection,
  );

  // Limpiar información personal general del perfil.
  await query(
    `UPDATE clientes
     SET
       direccion = NULL,
       rfc = NULL
     WHERE id = ?`,
    [clienteId],
    connection,
  );
}

export async function eliminarCuenta(user, input) {
  ensure(
    user?.id && user?.rol === "CLIENTE",
    403,
    "Esta operación está disponible únicamente para clientes.",
  );

  ensure(
    input?.confirmacion === "ELIMINAR",
    422,
    "Debes confirmar expresamente el cierre de tu cuenta.",
  );

  const passwordActual = input?.passwordActual;

  ensure(
    typeof passwordActual === "string" &&
      passwordActual.length > 0 &&
      Buffer.byteLength(passwordActual) <= 72,
    422,
    "La contraseña actual no es válida.",
  );

  const [usuario] = await query(
    `SELECT password_hash
     FROM usuarios
     WHERE id = ?
       AND estado = 'activo'`,
    [user.id],
  );

  ensure(usuario, 401, "La cuenta no está disponible.");

  const passwordValida = await verificarPassword(
    passwordActual,
    usuario.password_hash,
  );

  ensure(
    passwordValida,
    401,
    "La contraseña actual es incorrecta.",
  );

  const correoAnonimo =
    `eliminado-${user.id}-${randomBytes(12).toString("hex")}@cuentas.invalid`;

  const passwordInutilizable = await generarHash(
    randomBytes(32).toString("hex"),
  );

  return transaction(async (connection) => {
    const [cuenta] = await query(
      `SELECT
         u.estado,
         u.password_hash,
         u.version_sesion AS sessionVersion,
         r.nombre_rol AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.id_rol
       WHERE u.id = ?
       FOR UPDATE`,
      [user.id],
      connection,
    );

    ensure(
      cuenta?.estado === "activo" && cuenta.rol === "CLIENTE",
      409,
      "La cuenta ya no está disponible para esta operación.",
    );

    ensure(
      cuenta.password_hash === usuario.password_hash &&
        cuenta.sessionVersion === user.sessionVersion,
      409,
      "La información de seguridad cambió. Inicia sesión nuevamente.",
    );

    const [cliente] = await query(
      `SELECT id
       FROM clientes
       WHERE id_usuario = ?
       FOR UPDATE`,
      [user.id],
      connection,
    );

    ensure(
      cliente,
      409,
      "No se encontró el perfil de cliente asociado.",
    );

    await verificarOperacionesPendientes(cliente.id, connection);

    await limpiarDatosNoHistoricos(cliente.id, connection);

    // Invalidar enlaces de recuperación y verificación.
    await query(
      "DELETE FROM tokens_recuperacion WHERE id_usuario = ?",
      [user.id],
      connection,
    );

    await query(
      "DELETE FROM verificaciones_usuario WHERE id_usuario = ?",
      [user.id],
      connection,
    );

    // Cerrar la cuenta e invalidar todas sus sesiones.
    const resultado = await query(
      `UPDATE usuarios
       SET
         nombre = 'Cuenta eliminada',
         correo = ?,
         telefono = NULL,
         password_hash = ?,
         estado = 'eliminado',
         fecha_eliminacion = UTC_TIMESTAMP(),
         version_sesion = version_sesion + 1,
         intentos_fallidos = 0,
         bloqueado_hasta = NULL,
         correo_verificado = FALSE,
         telefono_verificado = FALSE
       WHERE id = ?
         AND estado = 'activo'`,
      [correoAnonimo, passwordInutilizable, user.id],
      connection,
    );

    ensure(
      resultado.affectedRows === 1,
      409,
      "No se pudo completar el cierre de la cuenta.",
    );

    return {
      completed: true,
      accountClosed: true,
      reauthenticationRequired: true,
      personalDataErasureComplete: false,
      historicalRecordsRetained: true,
    };
  });
}

