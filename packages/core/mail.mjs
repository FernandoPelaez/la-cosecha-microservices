import { readFile } from "node:fs/promises";
import nodemailer from "nodemailer";
import { ensure } from "./errors.mjs";

// Conserva el transporte SMTP existente.
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
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
}

// Convierte los archivos adjuntos al formato de Resend.
async function prepareAttachments(attachments) {
  return Promise.all(
    attachments.map(async (attachment) => {
      const content = attachment.path
        ? await readFile(attachment.path)
        : attachment.content;

      ensure(
        content != null,
        500,
        "No se pudo preparar el archivo adjunto",
      );

      return {
        filename: attachment.filename,
        content: Buffer.from(content).toString("base64"),
        ...(attachment.cid
          ? { content_id: attachment.cid }
          : {}),
      };
    }),
  );
}

// Envía correos mediante la API HTTPS de Resend.
async function sendWithResend(
  to,
  subject,
  text,
  attachments,
  html,
) {
  const files = await prepareAttachments(attachments);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:
        process.env.MAIL_FROM ||
        "LA COSECHA <onboarding@resend.dev>",
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
      ...(files.length ? { attachments: files } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.id) {
    console.error("Error de Resend:", {
      status: response.status,
      code: result?.name,
      message: result?.message,
    });
  }

  ensure(
    response.ok && Boolean(result?.id),
    503,
    "No se pudo enviar el correo. Revisa los registros del servicio",
  );

  return true;
}

// Mantiene la misma interfaz para los servicios existentes.
export async function sendMail(
  to,
  subject,
  text,
  attachments = [],
  html,
) {
  if (process.env.RESEND_API_KEY) {
    return sendWithResend(
      to,
      subject,
      text,
      attachments,
      html,
    );
  }

  const result = await mailer().sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
    attachments,
  });

  ensure(
    result.accepted?.length,
    503,
    "El servidor de correo no aceptó el envío",
  );

  return true;
}
