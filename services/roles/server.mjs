import express from "express";
import { z } from "zod";
import { application, finish, ok } from "../../packages/core/http.mjs";
import { internal, auth, roles } from "../../packages/core/security.mjs";
import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { id } from "../../packages/core/validation.mjs";

// Adaptación del contrato de servicio-roles: una identidad y un catálogo de roles.
const role = z.enum(["ADMIN", "CLIENTE", "INVENTARIO", "VENTAS", "LOGISTICA"]);
const app = application("roles");
app.use(internal, express.json({ limit: "16kb" }), auth);
app.get("/roles/check", (req, res) => {
  const allowed = z.array(role).min(1).max(5).parse([req.query.rol].flat());
  ensure(
    allowed.includes(req.user.rol),
    403,
    "No tienes permiso para esta operación",
  );
  ok(res, {
    permitido: true,
    rol_actual: req.user.rol,
    roles_consultados: allowed,
  });
});
app.get("/roles", roles("ADMIN"), async (_req, res) =>
  ok(
    res,
    await query("SELECT id,nombre_rol,descripcion FROM roles ORDER BY id"),
  ),
);
app.get("/usuarios", roles("ADMIN"), async (req, res) => {
  const search = z
    .string()
    .trim()
    .max(100)
    .parse(req.query.q || "");
  ok(
    res,
    await query(
      `SELECT u.id,u.nombre,u.correo,u.estado,r.nombre_rol FROM usuarios u JOIN roles r ON r.id=u.id_rol WHERE u.nombre LIKE ? OR u.correo LIKE ? ORDER BY u.id DESC LIMIT 200`,
      [`%${search}%`, `%${search}%`],
    ),
  );
});
app.get("/usuarios/:id/rol", async (req, res) => {
  const userId = id.parse(req.params.id);
  ensure(
    req.user.rol === "ADMIN" || req.user.id === userId,
    403,
    "No tienes permiso",
  );
  const [record] = await query(
    "SELECT r.id,r.nombre_rol FROM usuarios u JOIN roles r ON r.id=u.id_rol WHERE u.id=?",
    [userId],
  );
  ensure(record, 404, "Usuario no encontrado");
  ok(res, record);
});
app.put("/usuarios/:id/rol", roles("ADMIN"), async (req, res) => {
  const userId = id.parse(req.params.id);
  const { nombre_rol } = z
    .object({ nombre_rol: role })
    .strict()
    .parse(req.body);
  ensure(userId !== req.user.id, 409, "Otro administrador debe cambiar tu rol");
  await transaction(async (c) => {
    const [user] = await query(
      "SELECT id,id_rol FROM usuarios WHERE id=? FOR UPDATE",
      [userId],
      c,
    );
    ensure(user, 404, "Usuario no encontrado");
    const [target] = await query(
      "SELECT id FROM roles WHERE nombre_rol=?",
      [nombre_rol],
      c,
    );
    ensure(target, 422, "Rol no configurado");
    if (target.id === user.id_rol) return;
    await query(
      "UPDATE usuarios SET id_rol=?,version_sesion=version_sesion+1 WHERE id=?",
      [target.id, userId],
      c,
    );
    if (nombre_rol === "CLIENTE")
      await query(
        "INSERT IGNORE INTO clientes(id_usuario) VALUES (?)",
        [userId],
        c,
      );
    await query(
      "INSERT INTO auditoria_roles(id_usuario,id_actor,rol_anterior,rol_nuevo) VALUES (?,?,?,?)",
      [userId, req.user.id, user.id_rol, target.id],
      c,
    );
  });
  ok(res, {
    id: userId,
    nombre_rol,
    message: "Rol actualizado; las sesiones anteriores quedaron revocadas",
  });
});
app.post("/usuarios/:id/desbloquear", roles("ADMIN"), async (req, res) => {
  const result = await query(
    "UPDATE usuarios SET estado='activo',intentos_fallidos=0,bloqueado_hasta=NULL,version_sesion=version_sesion+1 WHERE id=?",
    [id.parse(req.params.id)],
  );
  ensure(result.affectedRows, 404, "Usuario no encontrado");
  ok(res, { completed: true });
});
export default finish(app, 4012);
