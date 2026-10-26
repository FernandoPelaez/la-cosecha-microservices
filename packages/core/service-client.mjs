import { correlationId } from "./context.mjs";
import { ensure } from "./errors.mjs";

// Las escrituras no se reintentan automáticamente: su dueño decide la idempotencia.
export async function serviceRequest(
  base,
  route,
  { token, timeout = 8000, ...options } = {},
) {
  let response;
  try {
    response = await fetch(new URL(route, base), {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(timeout),
      headers: {
        "Content-Type": "application/json",
        "X-Service-Key": process.env.SERVICE_KEY || "",
        "X-Correlation-Id": correlationId(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    ensure(false, 503, "No se pudo contactar al servicio requerido");
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    ensure(false, 502, "El servicio devolvió una respuesta no válida");
  }
  ensure(
    response.ok,
    response.status >= 500 ? 503 : response.status,
    payload.error?.message || "El servicio no pudo completar la solicitud",
  );
  return payload.data ?? payload.datos;
}
