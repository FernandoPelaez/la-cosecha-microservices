import { fileURLToPath } from "node:url";

export function buildResetEmail(url) {
  const safeUrl = url
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  const text = [
    "LA COSECHA",
    "De nuestra tierra a tu mesa",
    "",
    "Recupera el acceso a tu cuenta",
    "",
    "Hola,",
    "",
    "Recibimos una solicitud para restablecer la contraseña de tu cuenta en LA COSECHA.",
    "",
    "Para establecer una nueva contraseña, visita:",
    url,
    "",
    "Importante: Este enlace vence en 5 minutos y solo puede utilizarse una vez.",
    "",
    "Si no solicitaste restablecer tu contraseña, ignora este mensaje.",
    "Tu contraseña actual permanecerá sin cambios.",
    "",
    "Este es un mensaje automático relacionado con la seguridad de tu cuenta.",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Recupera tu contraseña | LA COSECHA</title>
</head>
<body style="margin:0;padding:0;background:#faf8f1;font-family:Arial,Helvetica,sans-serif;color:#303628;">
  <div style="display:none;font-size:1px;color:#faf8f1;max-height:0;overflow:hidden;">
    Restablece tu contraseña de LA COSECHA. Tu enlace vence en 5 minutos.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf8f1;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#fffefa;border:1px solid #dddccd;border-top:5px solid #a21e16;border-radius:8px;">
          <tr>
            <td align="center" style="padding:36px 32px 28px;">
              <img src="cid:la-cosecha-logo" alt="Logotipo de LA COSECHA" width="90" height="90" style="display:block;width:90px;height:90px;object-fit:contain;border:0;">
              <h1 style="margin:18px 0 6px;font-family:Georgia,serif;font-size:30px;font-weight:400;letter-spacing:2px;color:#303628;">LA COSECHA</h1>
              <p style="margin:0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#666b5c;">DE NUESTRA TIERRA A TU MESA</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 40px 36px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:2px;color:#a21e16;">SEGURIDAD DE TU CUENTA</p>
              <h2 style="margin:0 0 22px;font-family:Georgia,serif;font-size:30px;line-height:1.25;font-weight:400;color:#303628;">Recupera el acceso a tu cuenta</h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">Hola,</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#666b5c;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>LA COSECHA</strong>.
              </p>
              <p style="margin:0 0 26px;font-size:15px;line-height:1.8;color:#666b5c;">
                Haz clic en el siguiente botón para establecer una nueva contraseña y recuperar el acceso a tu cuenta.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${safeUrl}" style="display:inline-block;padding:16px 32px;background:#365b43;border-radius:6px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                      Restablecer mi contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:30px;padding:18px;background:#e8ecd9;border-radius:6px;">
                <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#365b43;">Información importante</p>
                <p style="margin:0;font-size:13px;line-height:1.7;color:#303628;">
                  Por seguridad, este enlace vence en <strong>5 minutos</strong> y solo puede utilizarse una vez.
                </p>
              </div>
              <p style="margin:26px 0 0;font-size:13px;line-height:1.8;color:#666b5c;">
                Si no solicitaste restablecer tu contraseña, puedes ignorar este mensaje. Tu contraseña actual permanecerá sin cambios.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:26px 32px;border-top:1px solid #dddccd;background:#f0f0e6;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#666b5c;">
                Este es un mensaje automático relacionado con la seguridad de tu cuenta.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const attachments = [
    {
      filename: "la-cosecha.png",
      path: fileURLToPath(
        new URL("../../apps/web/public/logo/la-cosecha.png", import.meta.url),
      ),
      cid: "la-cosecha-logo",
      contentDisposition: "inline",
    },
  ];

  return { text, html, attachments };
}
