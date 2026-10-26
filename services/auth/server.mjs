import express from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { application, finish, ok } from "../../packages/core/http.mjs";
import { localAuth as auth, internal } from "../../packages/core/security.mjs";
import { query } from "../../packages/core/db.mjs";
import { autenticar, registrar } from "./service.mjs";
import { buscarUsuario, datosPublicos } from "./repository.mjs";
import { verifyBot } from "./bot.mjs";
import { issueToken, consumeToken } from "./tokens.mjs";
const password = z
  .string()
  .min(12, "Usa al menos 12 caracteres")
  .max(72)
  .refine((s) => Buffer.byteLength(s) <= 72, "Máximo 72 bytes");
const email = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase().trim());
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
app.post("/login", async (req, res) => {
  const d = z
    .object({
      correo: email,
      password: z.string().min(1).max(72),
      botToken: z.string(),
    })
    .parse(req.body);
  await verifyBot(d.botToken, "login");
  ok(res, await autenticar(d));
});
app.post("/register", async (req, res) => {
  const d = z
    .object({
      nombre: z.string().trim().min(3).max(150),
      correo: email,
      telefono: z.string().regex(/^\d{10}$/, "Usa 10 dígitos"),
      password,
      botToken: z.string(),
    })
    .parse(req.body);
  await verifyBot(d.botToken, "register");
  ok(res, await registrar(d), 201);
});
app.get("/me", auth, (req, res) => ok(res, datosPublicos(req.user)));
app.put("/profile", auth, async (req, res) => {
  const data = z
    .object({
      nombre: z.string().trim().min(3).max(150),
      telefono: z.string().regex(/^\d{10}$/, "Usa 10 dígitos"),
    })
    .strict()
    .parse(req.body);
  await query("UPDATE usuarios SET nombre=?,telefono=? WHERE id=?", [
    data.nombre,
    data.telefono,
    req.user.id,
  ]);
  ok(res, datosPublicos({ ...req.user, ...data }));
});
app.post("/logout", auth, async (req, res) => {
  await query(
    "UPDATE usuarios SET version_sesion=version_sesion+1 WHERE id=?",
    [req.user.id],
  );
  ok(res, { completed: true });
});
app.post("/recover", async (req, res) => {
  const d = z.object({ correo: email, botToken: z.string() }).parse(req.body);
  await verifyBot(d.botToken, "recover");
  const u = await buscarUsuario(d.correo);
  if (u)
    try {
      await issueToken(u, "reset");
    } catch {
      console.error("No se pudo enviar recuperación");
    }
  ok(res, {
    message:
      "Si la cuenta existe y el correo está configurado, recibirás un enlace.",
  });
});
app.post("/reset", async (req, res) => {
  const d = z
    .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password })
    .parse(req.body);
  ok(res, await consumeToken(d.token, d.password));
});
app.post("/verify", async (req, res) =>
  ok(
    res,
    await consumeToken(
      z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .parse(req.body.token),
    ),
  ),
);
app.post("/verify/resend", auth, async (req, res) => {
  await issueToken(req.user, "verify");
  ok(res, { mailSent: true });
});
export default finish(app, 4001);
