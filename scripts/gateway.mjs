import { createServer, request as httpRequest } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { services } from "./service-registry.mjs";

const secret = Buffer.from(process.env.SERVICE_KEY || "");

if (secret.length < 48) {
  throw new Error("SERVICE_KEY no está configurada correctamente");
}

const registry = new Map(
  services.map((service) => {
    const prefix = service.env || service.name.toUpperCase();

    return [
      service.name,
      Number(process.env[`${prefix}_PORT`] || service.port),
    ];
  }),
);

function respond(res, status, message) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  res.end(JSON.stringify({ error: { message } }));
}

function authorized(value) {
  if (typeof value !== "string") return false;

  const received = Buffer.from(value);

  return (
    received.length === secret.length &&
    timingSafeEqual(received, secret)
  );
}

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");

  // Endpoint de disponibilidad para Railway.
  if (req.method === "GET" && url.pathname === "/live") {
    res.writeHead(200, {
      "Content-Type": "application/json",
    });

    res.end(JSON.stringify({ status: "running" }));
    return;
  }

  // Las solicitudes internas requieren autenticación.
  if (!authorized(req.headers["x-service-key"])) {
    respond(res, 401, "Servicio no autorizado");
    return;
  }

  const match = url.pathname.match(
    /^\/([a-z][a-z0-9-]*)(\/.*)?$/,
  );

  const serviceName = match?.[1];
  const port = registry.get(serviceName);

  if (!port) {
    respond(res, 404, "Servicio no encontrado");
    return;
  }

  const headers = {
    ...req.headers,
    host: `127.0.0.1:${port}`,
  };

  delete headers.connection;
  delete headers["proxy-connection"];

  const upstream = httpRequest(
    {
      hostname: "127.0.0.1",
      port,
      method: req.method,
      path: `${match[2] || "/"}${url.search}`,
      headers,
      timeout: 27000,
    },
    (response) => {
      res.writeHead(
        response.statusCode || 502,
        response.headers,
      );

      response.pipe(res);
    },
  );

  upstream.on("timeout", () => {
    upstream.destroy(new Error("Tiempo de espera agotado"));
  });

  upstream.on("error", () => {
    if (!res.headersSent) {
      respond(res, 502, "Microservicio no disponible");
    } else {
      res.destroy();
    }
  });

  req.on("aborted", () => upstream.destroy());

  req.pipe(upstream);
});

const port = Number(
  process.env.GATEWAY_PORT || process.env.PORT || 8080,
);

server.listen(port, "0.0.0.0", () => {
  console.log(`API Gateway escuchando en el puerto ${port}`);
});
