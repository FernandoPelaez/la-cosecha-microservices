import express from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { application, finish, ok } from "../../packages/core/http.mjs";
import { localAuth as auth, internal } from "../../packages/core/security.mjs";
import { query } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { autenticar, registrar } from "./service.mjs";
import { buscarUsuario, datosPublicos } from "./repository.mjs";
import { verifyBot } from "./bot.mjs";
import { issueToken, consumeToken } from "./tokens.mjs";
import { generarHash, verificarPassword } from "./passwords.mjs";
import { eliminarCuenta } from "./account-deletion.mjs";

const password = z
  .string()
  .min(12, "Usa al menos 12 caracteres")
  .max(72)
  .refine((value) => Buffer.byteLength(value) <= 72, "Máximo 72 bytes");

const email = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase().trim());

const changePasswordSchema = z
  .object({
    passwordActual: z.string().min(1).max(72),
    passwordNueva: password,
  })
  .strict();

const deleteAccountSchema = z
  .object({
    passwordActual: z.string().min(1).max(72),
    confirmacion: z.literal("ELIMINAR"),
  })
  .strict();

const app = application("auth-paul");

app.use(internal, express.json({ limit: "20kb" }));

app.use(
  ["/login", "/register", "/recover", "/reset", "/verify"],
  rateLimit({
    windowMs: 60000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => String(req.user.id),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "Demasiados intentos. Intenta de nuevo en 15 minutos.",
    },
  },
});

const accountDeletionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => String(req.user.id),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "Demasiados intentos. Intenta de nuevo en 15 minutos.",
    },
  },
});

app.post("/login", async (req, res) => {
  const data = z
    .object({
      correo: email,
      password: z.string().min(1).max(72),
      botToken: z.string(),
    })
    .parse(req.body);

  await verifyBot(data.botToken, "login");
  ok(res, await autenticar(data));
});

app.post("/register", async (req, res) => {
  const data = z
    .object({
      nombre: z.string().trim().min(3).max(150),
      correo: email,
      telefono: z.string().regex(/^\d{10}$/, "Usa 10 dígitos"),
      password,
      botToken: z.string(),
    })
    .parse(req.body);

  await verifyBot(data.botToken, "register");
  ok(res, await registrar(data), 201);
});

app.get("/me", auth, (req, res) => {
  ok(res, datosPublicos(req.user));
});

app.put("/profile", auth, async (req, res) => {
  const data = z
    .object({
      nombre: z.string().trim().min(3).max(150),
      telefono: z.string().regex(/^\d{10}$/, "Usa 10 dígitos"),
    })
    .strict()
    .parse(req.body);

  await query(
    "UPDATE usuarios SET nombre=?,telefono=? WHERE id=?",
    [data.nombre, data.telefono, req.user.id],
  );

  ok(res, datosPublicos({ ...req.user, ...data }));
});

app.put("/password", auth, passwordLimiter, async (req, res) => {
  const { passwordActual, passwordNueva } = changePasswordSchema.parse(
    req.body,
  );

  const [account] = await query(
    "SELECT password_hash FROM usuarios WHERE id=?",
    [req.user.id],
  );

  ensure(
    account?.password_hash,
    401,
    "La cuenta ya no está disponible",
  );

  const valid = await verificarPassword(
    passwordActual,
    account.password_hash,
  );

  ensure(valid, 401, "La contraseña actual es incorrecta");

  ensure(
    passwordNueva !== passwordActual,
    422,
    "La nueva contraseña debe ser diferente de la actual",
  );

  const hash = await generarHash(passwordNueva);

  const result = await query(
    `UPDATE usuarios
     SET password_hash=?,version_sesion=version_sesion+1
     WHERE id=? AND password_hash=?`,
    [hash, req.user.id, account.password_hash],
  );

  ensure(
    result.affectedRows === 1,
    409,
    "La contraseña cambió durante la operación. Inicia sesión nuevamente",
  );

  ok(res, {
    completed: true,
    reauthenticationRequired: true,
  });
});

app.delete(
  "/account",
  auth,
  accountDeletionLimiter,
  async (req, res) => {
    ensure(
      process.env.ACCOUNT_DELETION_ENABLED === "true",
      503,
      "La eliminación de cuentas todavía no está habilitada.",
    );

    const data = deleteAccountSchema.parse(req.body);
    const result = await eliminarCuenta(req.user, data);

    ok(res, result);
  },
);

app.post("/logout", auth, async (req, res) => {
  await query(
    "UPDATE usuarios SET version_sesion=version_sesion+1 WHERE id=?",
    [req.user.id],
  );

  ok(res, { completed: true });
});

app.post("/recover", async (req, res) => {
  const data = z
    .object({
      correo: email,
      botToken: z.string(),
    })
    .parse(req.body);

  await verifyBot(data.botToken, "recover");

  const user = await buscarUsuario(data.correo);

  if (user) {
    try {
      await issueToken(user, "reset");
    } catch {
      console.error("No se pudo enviar recuperación");
    }
  }

  ok(res, {
    message:
      "Si la cuenta existe y el correo está configurado, recibirás un enlace.",
  });
});

app.post("/reset", async (req, res) => {
  const data = z
    .object({
      token: z.string().regex(/^[a-f0-9]{64}$/),
      password,
    })
    .parse(req.body);

  ok(res, await consumeToken(data.token, data.password));
});

app.post("/verify", async (req, res) => {
  const token = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(req.body.token);

  ok(res, await consumeToken(token));
});

app.post("/verify/resend", auth, async (req, res) => {
  await issueToken(req.user, "verify");
  ok(res, { mailSent: true });
});

export default finish(app, 4001);

