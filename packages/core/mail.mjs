import nodemailer from "nodemailer";
import { ensure } from "./errors.mjs";
export function mailer() {
  ensure(
    process.env.SMTP_HOST && process.env.MAIL_FROM,
    503,
    "El envío de correo todavía no está configurado",
  );
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
}
export async function sendMail(to, subject, text, attachments = []) {
  const result = await mailer().sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    attachments,
  });
  ensure(
    result.accepted?.length,
    503,
    "El servidor de correo no aceptó el envío",
  );
  return true;
}
