import { z } from "zod";
import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { id, text, optionalText } from "../../packages/core/validation.mjs";
import { ok } from "../../packages/core/http.mjs";

const schema = z.object({
  calle_numero: text(255),
  colonia: text(),
  ciudad: text(),
  codigo_postal: z.string().regex(/^\d{5}$/, "Usa cinco dígitos"),
  referencias: optionalText(1000),
});

async function asegurarCuentaActiva(userId, connection) {
  const [account] = await query(
    `SELECT estado
     FROM usuarios
     WHERE id = ?
     FOR UPDATE`,
    [userId],
    connection,
  );

  ensure(
    account?.estado === "activo",
    401,
    "Tu cuenta ya no está activa.",
  );
}

async function asegurarDomicilioDisponible(addressId, connection) {
  const [order] = await query(
    `SELECT id
     FROM pedidos
     WHERE id_direccion = ?
     LIMIT 1`,
    [addressId],
    connection,
  );

  ensure(
    !order,
    409,
    "Este domicilio forma parte de un pedido. Registra uno nuevo para conservar el historial",
  );

  const [shipment] = await query(
    `SELECT id
     FROM envios
     WHERE id_direccion = ?
     LIMIT 1`,
    [addressId],
    connection,
  );

  ensure(
    !shipment,
    409,
    "Este domicilio está asociado a un envío y debe conservarse.",
  );
}

export function addressRoutes(app) {
  app.get("/addresses", async (req, res) => {
    const addresses = await query(
      `SELECT *
       FROM direcciones
       WHERE id_cliente = ?
       ORDER BY id`,
      [req.user.clienteId],
    );

    ok(res, addresses);
  });

  app.post("/addresses", async (req, res) => {
    const data = schema.parse(req.body);

    const result = await transaction(async (connection) => {
      await asegurarCuentaActiva(req.user.id, connection);

      return query(
        `INSERT INTO direcciones (
           id_cliente,
           calle_numero,
           colonia,
           ciudad,
           codigo_postal,
           referencias
         )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.user.clienteId,
          data.calle_numero,
          data.colonia,
          data.ciudad,
          data.codigo_postal,
          data.referencias ?? null,
        ],
        connection,
      );
    });

    ok(res, { id: result.insertId }, 201);
  });

  app.put("/addresses/:id", async (req, res) => {
    const data = schema.parse(req.body);
    const key = id.parse(req.params.id);

    await transaction(async (connection) => {
      await asegurarCuentaActiva(req.user.id, connection);

      const [address] = await query(
        `SELECT id
         FROM direcciones
         WHERE id = ? AND id_cliente = ?
         FOR UPDATE`,
        [key, req.user.clienteId],
        connection,
      );

      ensure(address, 404, "Domicilio no encontrado");

      await asegurarDomicilioDisponible(key, connection);

      const result = await query(
        `UPDATE direcciones
         SET
           calle_numero = ?,
           colonia = ?,
           ciudad = ?,
           codigo_postal = ?,
           referencias = ?
         WHERE id = ? AND id_cliente = ?`,
        [
          data.calle_numero,
          data.colonia,
          data.ciudad,
          data.codigo_postal,
          data.referencias ?? null,
          key,
          req.user.clienteId,
        ],
        connection,
      );

      ensure(result.affectedRows, 404, "Domicilio no encontrado");
    });

    ok(res, { id: key });
  });

  app.delete("/addresses/:id", async (req, res) => {
    const key = id.parse(req.params.id);

    await transaction(async (connection) => {
      await asegurarCuentaActiva(req.user.id, connection);

      const [address] = await query(
        `SELECT id
         FROM direcciones
         WHERE id = ? AND id_cliente = ?
         FOR UPDATE`,
        [key, req.user.clienteId],
        connection,
      );

      ensure(address, 404, "Domicilio no encontrado");

      await asegurarDomicilioDisponible(key, connection);

      const result = await query(
        `DELETE FROM direcciones
         WHERE id = ? AND id_cliente = ?`,
        [key, req.user.clienteId],
        connection,
      );

      ensure(result.affectedRows, 404, "Domicilio no encontrado");
    });

    ok(res, { completed: true });
  });
}


