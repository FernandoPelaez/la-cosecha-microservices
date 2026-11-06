import { z } from "zod";
import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { id, text, optionalText } from "../../packages/core/validation.mjs";
import { ok } from "../../packages/core/http.mjs";

const CIUDAD_ENTREGA = "Los Mochis";
const ESTADO_ENTREGA = "Sinaloa";
const MUNICIPIO_ENTREGA = "Ahome";

const codigoPostalSchema = z
  .string()
  .regex(/^\d{5}$/, "Usa cinco dígitos");

const schema = z.object({
  calle_numero: text(255),
  colonia: text(),
  ciudad: text(),
  codigo_postal: codigoPostalSchema,
  referencias: optionalText(1000),
});

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Consulta los asentamientos del catálogo postal por código postal.
async function consultarCodigoPostal(codigoPostal) {
  let respuesta;

  try {
    respuesta = await fetch(
      `https://postali.app/api/v1/mx/cp/${codigoPostal}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(7000),
      },
    );
  } catch {
    ensure(
      false,
      503,
      "No se pudo consultar el código postal. Intenta nuevamente.",
    );
  }

  if (respuesta.status === 404) {
    ensure(
      false,
      422,
      "El código postal no existe o no está disponible.",
    );
  }

  ensure(
    respuesta.ok,
    503,
    "El servicio de códigos postales no está disponible.",
  );

  let datos;

  try {
    datos = await respuesta.json();
  } catch {
    ensure(
      false,
      503,
      "El servicio de códigos postales devolvió una respuesta inválida.",
    );
  }

  ensure(
    datos?.cp === codigoPostal &&
      Array.isArray(datos.asentamientos),
    503,
    "No fue posible validar la información del código postal.",
  );

  ensure(
    normalizar(datos.estado) === normalizar(ESTADO_ENTREGA) &&
      normalizar(datos.municipio) === normalizar(MUNICIPIO_ENTREGA),
    422,
    "Solo realizamos entregas en Los Mochis, Sinaloa.",
  );

  const colonias = [
    ...new Set(
      datos.asentamientos
        .filter(
          (asentamiento) =>
            normalizar(asentamiento?.ciudad) ===
              normalizar(CIUDAD_ENTREGA) &&
            typeof asentamiento?.nombre === "string" &&
            asentamiento.nombre.trim().length > 0,
        )
        .map((asentamiento) => asentamiento.nombre.trim()),
    ),
  ].sort((a, b) => a.localeCompare(b, "es-MX"));

  ensure(
    colonias.length > 0,
    422,
    "El código postal está fuera de la zona de entrega de Los Mochis.",
  );

  return {
    codigo_postal: codigoPostal,
    ciudad: CIUDAD_ENTREGA,
    estado: ESTADO_ENTREGA,
    colonias,
  };
}

// El servidor valida el código postal y la colonia, sin confiar en el formulario.
async function validarDomicilio(data) {
  const ubicacion = await consultarCodigoPostal(data.codigo_postal);

  ensure(
    normalizar(data.ciudad) === normalizar(CIUDAD_ENTREGA),
    422,
    "La ciudad debe ser Los Mochis.",
  );

  const colonia = ubicacion.colonias.find(
    (nombre) => normalizar(nombre) === normalizar(data.colonia),
  );

  ensure(
    colonia,
    422,
    "La colonia no corresponde al código postal indicado.",
  );

  return {
    ...data,
    colonia,
    ciudad: CIUDAD_ENTREGA,
  };
}

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

  // Los datos de esta ruta servirán para autocompletar el formulario.
  app.get("/addresses/postal-code/:codigoPostal", async (req, res) => {
    const codigoPostal = codigoPostalSchema.parse(
      req.params.codigoPostal,
    );

    ok(res, await consultarCodigoPostal(codigoPostal));
  });

  app.post("/addresses", async (req, res) => {
    const data = await validarDomicilio(schema.parse(req.body));

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
    const data = await validarDomicilio(schema.parse(req.body));
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

