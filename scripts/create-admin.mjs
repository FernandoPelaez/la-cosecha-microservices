import { query, pool, transaction } from "../packages/core/db.mjs";
import { generarHash } from "../services/auth/passwords.mjs";
import { z } from "zod";
const d = z
  .object({
    ADMIN_EMAIL: z.email(),
    ADMIN_NAME: z.string().min(3),
    ADMIN_PASSWORD: z
      .string()
      .min(12)
      .max(72)
      .refine((s) => Buffer.byteLength(s) <= 72),
    ADMIN_ROLE: z
      .enum(["ADMIN", "INVENTARIO", "VENTAS", "LOGISTICA"])
      .default("ADMIN"),
  })
  .parse(process.env);
try {
  await transaction(async (c) => {
    const [role] = await query(
      "SELECT id FROM roles WHERE nombre_rol=?",
      [d.ADMIN_ROLE],
      c,
    );
    if (!role) throw new Error("Ejecuta npm run db:migrate primero");
    await query(
      "INSERT INTO usuarios(nombre,correo,password_hash,id_rol,correo_verificado) VALUES (?,?,?,?,TRUE)",
      [
        d.ADMIN_NAME,
        d.ADMIN_EMAIL.toLowerCase(),
        await generarHash(d.ADMIN_PASSWORD),
        role.id,
      ],
      c,
    );
  });
  console.log("Cuenta interna creada. No se modificaron cuentas existentes.");
} finally {
  await pool.end();
}
