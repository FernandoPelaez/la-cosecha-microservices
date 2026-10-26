import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { ZodError } from "zod";
import { AppError } from "./errors.mjs";
import { pool } from "./db.mjs";
import { correlate } from "./context.mjs";

export function application(name) {
  const app = express();

  app.locals.serviceName = name;
  app.use(correlate(name));

  app.get("/live", (_req, res) =>
    res.json({
      data: {
        service: name,
        status: "running",
      },
    }),
  );

  app.disable("x-powered-by");
  app.use(helmet());

  app.use(
    rateLimit({
      windowMs: 60000,
      limit: 240,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );

  app.get("/health", async (_req, res) => {
    await pool.query("SELECT 1");

    res.json({
      data: {
        service: name,
        status: "ok",
      },
    });
  });

  return app;
}

export function finish(app, port) {
  app.use((_req, _res, next) => {
    next(new AppError(404, "Ruta no encontrada"));
  });

  app.use((e, req, res, _next) => {
    if (e instanceof ZodError) {
      return res.status(422).json({
        error: {
          message: "Revisa los datos del formulario",
          fields: Object.fromEntries(
            e.issues.map((issue) => [
              issue.path.join("."),
              issue.message,
            ]),
          ),
        },
      });
    }

    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: {
          message: "Ya existe un registro con esos datos",
        },
      });
    }

    if (
      e.code === "ER_ROW_IS_REFERENCED_2" ||
      e.code === "ER_NO_REFERENCED_ROW_2"
    ) {
      return res.status(409).json({
        error: {
          message:
            "El registro tiene relaciones que impiden esta operación",
        },
      });
    }

    const status = e.status || 503;

    if (status >= 500) {
      const correlationId =
        res.getHeader("X-Correlation-Id") ||
        req.headers["x-correlation-id"] ||
        "no disponible";

      console.error("Error del servicio:", {
        service: app.locals.serviceName,
        correlationId,
        status,
        name: e.name,
        code: e.code || "UNAVAILABLE",
        message: e.message,
        ...(process.env.NODE_ENV === "development"
          ? { stack: e.stack }
          : {}),
      });
    }

    return res.status(status).json({
      error: {
        message: e.status
          ? e.message
          : "Servicio temporalmente no disponible",
        code: e.code || "UNAVAILABLE",
      },
    });
  });

  if (process.env.NODE_ENV !== "test") {
    app.listen(
      Number(
        process.env.PORT ||
          process.env[
            `${app.locals.serviceName.split("-")[0].toUpperCase()}_PORT`
          ] ||
          port,
      ),
      process.env.SERVICE_HOST || "127.0.0.1",
      () => {
        console.log(`Servicio disponible: ${port}`);
      },
    );
  }

  return app;
}

export const ok = (res, data, status = 200) => {
  return res.status(status).json({ data });
};

