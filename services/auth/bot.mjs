import { ensure } from "../../packages/core/errors.mjs";
export async function verifyBot(token, action) {
  ensure(
    process.env.TURNSTILE_SECRET_KEY,
    503,
    "La verificación de seguridad todavía no está configurada",
  );
  ensure(
    typeof token === "string" && token.length > 0 && token.length <= 2048,
    422,
    "Completa la verificación de seguridad",
  );
  const result = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
      signal: AbortSignal.timeout(8000),
    },
  );
  const data = await result.json();
  ensure(
    result.ok &&
      data.success &&
      data.action === action &&
      data.hostname === process.env.TURNSTILE_HOSTNAME,
    422,
    "La verificación de seguridad venció. Inténtalo nuevamente",
  );
}
