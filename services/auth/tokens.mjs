import { randomBytes } from "node:crypto";
import { query, transaction } from "../../packages/core/db.mjs";
import { digest } from "../../packages/core/security.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { sendMail } from "../../packages/core/mail.mjs";
import { generarHash } from "./passwords.mjs";
export async function issueToken(user, kind) {
  const token = randomBytes(32).toString("hex");
  await transaction(async (c) => {
    await query("SELECT id FROM usuarios WHERE id=? FOR UPDATE", [user.id], c);
    if (kind === "reset") {
      await query(
        "UPDATE tokens_recuperacion SET usado=TRUE WHERE id_usuario=?",
        [user.id],
        c,
      );
      await query(
        "INSERT INTO tokens_recuperacion(id_usuario,token,fecha_expiracion) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 MINUTE))",
        [user.id, digest(token)],
        c,
      );
    } else {
      await query(
        "UPDATE verificaciones_usuario SET fecha_uso=UTC_TIMESTAMP() WHERE id_usuario=? AND canal='correo' AND fecha_uso IS NULL",
        [user.id],
        c,
      );
      await query(
        "INSERT INTO verificaciones_usuario(id_usuario,canal,codigo_hash,fecha_expiracion) VALUES (?,'correo',?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 MINUTE))",
        [user.id, digest(token)],
        c,
      );
    }
  });
  const path = kind === "reset" ? "restablecer" : "verificar";
  await sendMail(
    user.correo,
    kind === "reset"
      ? "Restablece tu contraseña — LA COSECHA"
      : "Confirma tu correo — LA COSECHA",
    `${process.env.APP_URL}/${path}?token=${token}\nEl enlace vence en 30 minutos. Si no lo solicitaste, ignóralo.`,
  );
}
export async function consumeToken(token, password) {
  return transaction(async (c) => {
    if (password) {
      const [t] = await query(
        "SELECT * FROM tokens_recuperacion WHERE token=? AND usado=FALSE AND fecha_expiracion>UTC_TIMESTAMP() FOR UPDATE",
        [digest(token)],
        c,
      );
      ensure(t, 422, "El enlace es inválido o ya venció");
      await query(
        "UPDATE usuarios SET password_hash=?,version_sesion=version_sesion+1,intentos_fallidos=0,bloqueado_hasta=NULL WHERE id=?",
        [await generarHash(password), t.id_usuario],
        c,
      );
      await query(
        "UPDATE tokens_recuperacion SET usado=TRUE WHERE id_usuario=?",
        [t.id_usuario],
        c,
      );
    } else {
      const [t] = await query(
        "SELECT * FROM verificaciones_usuario WHERE codigo_hash=? AND canal='correo' AND fecha_uso IS NULL AND fecha_expiracion>UTC_TIMESTAMP() FOR UPDATE",
        [digest(token)],
        c,
      );
      ensure(t, 422, "El enlace es inválido o ya venció");
      await query(
        "UPDATE usuarios SET correo_verificado=TRUE WHERE id=?",
        [t.id_usuario],
        c,
      );
      await query(
        "UPDATE verificaciones_usuario SET fecha_uso=UTC_TIMESTAMP() WHERE id=?",
        [t.id],
        c,
      );
    }
    return { completed: true };
  });
}
