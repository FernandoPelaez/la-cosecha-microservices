import { services } from "./service-registry.mjs";

function getErrorMessage(error) {
  if (error instanceof Error) {
    const code = error.cause?.code;

    return code
      ? `${code}: ${error.message}`
      : error.message;
  }

  return String(error);
}

for (const service of services) {
  const prefix = service.env || service.name.toUpperCase();

  const base = (
    process.env[`${prefix}_URL`] ||
    `http://127.0.0.1:${service.port}`
  ).replace(/\/+$/, "");

  const state = {
    servicio: service.name,
    proceso: "no disponible",
    dependencias: "sin comprobar",
  };

  try {
    const response = await fetch(`${base}/live`, {
      signal: AbortSignal.timeout(3000),
    });

    state.proceso = response.ok
      ? "activo"
      : `HTTP ${response.status}`;

    if (!response.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    state.errorProceso = getErrorMessage(error);
    process.exitCode = 1;
  }

  if (state.proceso === "activo") {
    try {
      const response = await fetch(`${base}/health`, {
        headers: {
          "X-Service-Key": process.env.SERVICE_KEY || "",
        },
        signal: AbortSignal.timeout(5000),
      });

      state.dependencias = response.ok
        ? "disponibles"
        : response.status === 401
          ? "requieren sesión para comprobar"
          : `no disponibles (HTTP ${response.status})`;

      if (!response.ok && response.status !== 401) {
        process.exitCode = 1;
      }
    } catch (error) {
      state.dependencias = "no disponibles";
      state.errorDependencias = getErrorMessage(error);
      process.exitCode = 1;
    }
  }

  console.log(JSON.stringify(state));
}

