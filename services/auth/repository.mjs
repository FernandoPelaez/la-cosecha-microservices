import { query } from "../../packages/core/db.mjs";

// Consulta el usuario, su rol y la versión de su sesión.
export async function buscarUsuario(correo, c) {
  const [u] = await query(
    `SELECT
      u.*,
      r.nombre_rol AS rol,
      c.id AS clienteId,
      u.version_sesion AS sessionVersion
    FROM usuarios u
    INNER JOIN roles r ON r.id = u.id_rol
    LEFT JOIN clientes c ON c.id_usuario = u.id
    WHERE u.correo = ?`,
    [correo],
    c,
  );

  return u;
}

// Expone únicamente los datos públicos del usuario.
export const datosPublicos = (u) => ({
  id: u.id,
  nombre: u.nombre,
  correo: u.correo,
  telefono: u.telefono,
  rol: u.rol,
  clienteId: u.clienteId,
  correo_verificado: Boolean(u.correo_verificado),
});
