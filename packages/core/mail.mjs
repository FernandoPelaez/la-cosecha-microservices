import { readFile } from "node:fs/promises";
import nodemailer from "nodemailer";
import { ensure } from "./errors.mjs";

// Transporte SMTP existente.
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

// Prepara los archivos adjuntos.
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

// Envío principal mediante la API HTTPS de Brevo.
async function sendWithBrevo(
  to,
  subject,
  text,
  attachments,
  html,
) {
  ensure(
    process.env.MAIL_FROM,
    503,
    "El remitente de correo no está configurado",
  );

  // Brevo no admite imágenes CID.
  // Las imágenes públicas se referencian mediante su URL.
  let brevoHtml = html;
  const regularAttachments = [];

  for (const attachment of attachments) {
    if (!attachment.cid) {
      regularAttachments.push(attachment);
      continue;
    }

    const path = attachment.path?.replaceAll("\\", "/");
    const relative = path?.split("/public/")[1];

    ensure(
      relative && process.env.APP_URL,
      503,
      "No se pudo preparar una imagen del correo",
    );

    const url = new URL(
      `/${relative}`,
      process.env.APP_URL,
    ).toString();

    brevoHtml = brevoHtml?.replaceAll(
      `cid:${attachment.cid}`,
      url,
    );
  }

  const files = await prepareAttachments(regularAttachments);

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "LA COSECHA",
          email: process.env.MAIL_FROM,
        },
        to: [{ email: to }],
        subject,
        textContent: text,
        ...(brevoHtml
          ? { htmlContent: brevoHtml }
          : {}),
        ...(files.length
          ? {
              attachment: files.map(
                ({ filename, content }) => ({
                  name: filename,
                  content,
                }),
              ),
            }
          : {}),
      }),
      signal: AbortSignal.timeout(15000),
    },
  );

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.messageId) {
    console.error("Error de Brevo:", {
      status: response.status,
      code: result?.code,
      message: result?.message,
    });
  }

  ensure(
    response.ok && Boolean(result?.messageId),
    503,
    "No se pudo enviar el correo. Revisa los registros del servicio",
  );

  return true;
}

// Conserva el envío anterior mediante Resend.
async function sendWithResend(
  to,
  subject,
  text,
  attachments,
  html,
) {
  const files = await prepareAttachments(attachments);

  const response = await fetch(
    "https://api.resend.com/emails",
    {
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
        ...(files.length
          ? { attachments: files }
          : {}),
      }),
      signal: AbortSignal.timeout(15000),
    },
  );

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

// Mantiene la interfaz existente para los microservicios.
export async function sendMail(
  to,
  subject,
  text,
  attachments = [],
  html,
) {
  // Prioridad 1: Brevo.
  if (process.env.BREVO_API_KEY) {
    return sendWithBrevo(
      to,
      subject,
      text,
      attachments,
      html,
    );
  }

  // Prioridad 2: Resend.
  if (process.env.RESEND_API_KEY) {
    return sendWithResend(
      to,
      subject,
      text,
      attachments,
      html,
    );
  }

  // Alternativa: SMTP.
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
