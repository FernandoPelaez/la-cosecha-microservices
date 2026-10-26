import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { signSession } from "../../packages/core/security.mjs";
import { buscarUsuario, datosPublicos } from "./repository.mjs";
import { generarHash, verificarPassword } from "./passwords.mjs";
import { issueToken } from "./tokens.mjs";

const dummy = generarHash("tiempo-uniforme-sin-usuario");

export async function autenticar({ correo, password }) {
  const u = await buscarUsuario(correo);

  const matches = await verificarPassword(
    password,
    u?.password_hash || (await dummy),
  );

  if (!u || !matches) {
    if (u) {
      await query(
        "UPDATE usuarios SET intentos_fallidos=LEAST(intentos_fallidos+1,60000), bloqueado_hasta=IF(intentos_fallidos>=5,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE),bloqueado_hasta) WHERE id=?",
        [u.id],
      );
    }

    ensure(false, 401, "Correo o contraseña incorrectos");
  }

  ensure(u.estado === "activo", 403, "La cuenta no está habilitada");

  ensure(
    !u.bloqueado_hasta || new Date(u.bloqueado_hasta + "Z") <= new Date(),
    429,
    "Espera 15 minutos antes de volver a intentar",
  );

  await query(
    "UPDATE usuarios SET intentos_fallidos=0,bloqueado_hasta=NULL WHERE id=?",
    [u.id],
  );

  return {
    user: datosPublicos(u),
    token: await signSession(u),
  };
}

export async function registrar(data) {
  const hash = await generarHash(data.password);

  await transaction(async (c) => {
    // El rol CLIENTE debe existir antes de registrar usuarios.
    const [role] = await query(
      "SELECT id FROM roles WHERE nombre_rol='CLIENTE'",
      [],
      c,
    );

    ensure(
      role,
      503,
      "No existe el rol CLIENTE. Inicializa los roles de la base de datos",
    );

    const r = await query(
      "INSERT INTO usuarios(nombre,correo,telefono,password_hash,id_rol) VALUES (?,?,?,?,?)",
      [data.nombre, data.correo, data.telefono, hash, role.id],
      c,
    );

    await query("INSERT INTO clientes(id_usuario) VALUES (?)", [r.insertId], c);
  });

  const u = await buscarUsuario(data.correo);

  let mailSent = true;

  try {
    await issueToken(u, "verify");
  } catch {
    mailSent = false;
  }

  return {
    user: datosPublicos(u),
    mailSent,
  };
}
