import { SignJWT, jwtVerify } from "jose";
import { createHash, timingSafeEqual } from "node:crypto";
import { query } from "./db.mjs";
import { ensure } from "./errors.mjs";
import { serviceRequest } from "./service-client.mjs";

export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");

const secret = () => {
  ensure(process.env.JWT_SECRET?.length >= 48, 503, "Configura JWT_SECRET");
  return new TextEncoder().encode(process.env.JWT_SECRET);
};

export async function signSession(user) {
  return new SignJWT({
    sid: user.sessionVersion,
    role: user.rol,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuer(process.env.JWT_ISSUER || "la-cosecha")
    .setAudience("la-cosecha-services")
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secret());
}

export async function identify(token) {
  ensure(token, 401, "Inicia sesión para continuar");

  let payload;

  try {
    ({ payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: process.env.JWT_ISSUER || "la-cosecha",
      audience: "la-cosecha-services",
    }));
  } catch {
    ensure(false, 401, "La sesión venció. Inicia sesión nuevamente");
  }

  const [u] = await query(
    `SELECT
      u.id,
      u.nombre,
      u.correo,
      u.telefono,
      u.estado,
      u.correo_verificado,
      u.version_sesion AS sessionVersion,
      r.nombre_rol AS rol,
      c.id AS clienteId
    FROM usuarios u
    JOIN roles r ON r.id = u.id_rol
    LEFT JOIN clientes c ON c.id_usuario = u.id
    WHERE u.id = ?`,
    [payload.sub],
  );

  ensure(
    u && u.estado === "activo" && u.sessionVersion === payload.sid,
    401,
    "La sesión ya no es válida",
  );

  return u;
}

export const localAuth = async (req, _res, next) => {
  req.user = await identify(
    req.headers.authorization?.replace(/^Bearer /, ""),
  );

  next();
};

// Sólo identidad verifica el JWT; los demás procesos consultan su contrato HTTP.
export const auth = async (req, _res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer /, "");

  ensure(token, 401, "Inicia sesión para continuar");

  req.user = await serviceRequest(
    process.env.AUTH_URL || "http://127.0.0.1:4001",
    "/me",
    { token },
  );

  next();
};

export const roles =
  (...allowed) =>
  (req, _res, next) => {
    ensure(
      req.user && allowed.includes(req.user.rol),
      403,
      "No tienes permiso para esta operación",
    );

    next();
  };

export const staff = roles(
  "ADMIN",
  "INVENTARIO",
  "VENTAS",
  "LOGISTICA",
);

export function internal(req, _res, next) {
  const actual = String(req.headers["x-service-key"] || "");
  const expected = process.env.SERVICE_KEY;

  ensure(
    expected?.length >= 48 &&
      Buffer.byteLength(actual) === Buffer.byteLength(expected) &&
      timingSafeEqual(
        Buffer.from(actual),
        Buffer.from(expected),
      ),
    401,
    "Servicio no autorizado",
  );

  next();
}

