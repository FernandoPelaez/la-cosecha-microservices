import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const context = new AsyncLocalStorage();
export const correlationId = () => context.getStore()?.id || randomUUID();
export const requestIdentity = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(value)
    ? value
    : randomUUID();

// Cada salto conserva un identificador opaco; nunca registra cuerpos ni tokens.
export function correlate(service) {
  return (req, res, next) => {
    const id = requestIdentity(req.headers["x-correlation-id"]);
    const started = performance.now();
    res.setHeader("X-Correlation-Id", id);
    res.on("finish", () =>
      console.log(
        JSON.stringify({
          service,
          correlationId: id,
          method: req.method,
          route: req.route?.path || "unmatched",
          status: res.statusCode,
          durationMs: Math.round(performance.now() - started),
        }),
      ),
    );
    context.run({ id }, next);
  };
}
