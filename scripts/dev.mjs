import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { services } from "./service-registry.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

const production = process.argv.includes("--production");

const preview =
  process.env.SITES_MANAGED_LINUX_CONTAINER === "1" ||
  process.argv.includes("--strictPort");

const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};

const webOnly = process.argv.includes("--web-only") || preview;
const servicesOnly = process.argv.includes("--services-only");

const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;

  stopping = true;
  process.exitCode = code;

  for (const child of children) {
    child.kill("SIGTERM");
  }
}

function start(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });

  children.push(child);

  child.on("error", (error) => {
    console.error(
      `${name}: no se pudo iniciar (${error.code}). Ejecuta npm run setup y revisa .env.`,
    );

    stop(1);
  });

  child.on("exit", (code) => {
    if (!stopping && code !== 0) {
      console.error(`${name} terminó con código ${code}`);
      stop(1);
    }
  });
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

if (!webOnly) {
  const python =
    process.env.PYTHON_EXECUTABLE ||
    path.join(
      root,
      ".venv",
      process.platform === "win32"
        ? "Scripts/python.exe"
        : "bin/python",
    );

  // Iniciar los microservicios registrados.
  for (const service of services) {
    const prefix = service.env || service.name.toUpperCase();

    const port = String(
      process.env[`${prefix}_PORT`] || service.port,
    );

    const env = {
      ...process.env,
      PORT: port,
      PYTHONPATH: path.join(root, "services/python-common"),
      NODE_ENV:
        process.env.NODE_ENV === "test"
          ? "test"
          : production
            ? "production"
            : "development",
    };

    // Microservicios Node.js.
    if (service.technology === "node") {
      start(
        service.name,
        process.execPath,
        [
          "--import",
          "tsx",
          `services/${service.name}/server.mjs`,
        ],
        { env },
      );
    }

    // Microservicios Flask.
    if (service.technology === "flask") {
      start(
        service.name,
        python,
        [
          "-m",
          "waitress",
          `--listen=127.0.0.1:${port}`,
          "app:app",
        ],
        {
          cwd: path.join(root, "services", service.name),
          env,
        },
      );
    }

    // Microservicios FastAPI.
    if (service.technology === "fastapi") {
      start(
        service.name,
        python,
        [
          "-m",
          "uvicorn",
          "main:app",
          "--host",
          "127.0.0.1",
          "--port",
          port,
          "--no-access-log",
        ],
        {
          cwd: path.join(root, "services", service.name),
          env,
        },
      );
    }

    // Microservicios .NET.
    if (service.technology === "dotnet") {
      const executable =
        process.env.DOTNET_EXECUTABLE || "dotnet";

      const serviceEnv = {
        ...env,
        [`${prefix}_PORT`]: port,
      };

      if (process.platform === "win32") {
        // Ejecutar las DLL compiladas para evitar el bloqueo
        // de archivos .exe por las políticas de Windows.
        const projectDir = path.join(
          root,
          "services",
          service.name,
        );

        const assembly = path.join(
          projectDir,
          "bin",
          "Release",
          "net10.0",
          service.project.replace(/\.csproj$/i, ".dll"),
        );

        start(service.name, executable, [assembly], {
          cwd: projectDir,
          env: serviceEnv,
        });
      } else {
        // Conservar el inicio existente para Linux.
        start(
          service.name,
          executable,
          [
            "run",
            "--project",
            `services/${service.name}/${service.project}`,
            "--no-launch-profile",
            "--configuration",
            production ? "Release" : "Debug",
          ],
          {
            env: serviceEnv,
          },
        );
      }
    }
  }

  // Mantener la entrega de comprobantes.
  start("comprobantes", process.execPath, [
    "scripts/deliver-receipts.mjs",
    "--watch",
  ]);

  // Iniciar el API Gateway únicamente en producción.
  if (production) {
    const gatewayPort =
      process.env.GATEWAY_PORT ||
      (servicesOnly ? process.env.PORT || "8080" : "8080");

    start(
      "gateway",
      process.execPath,
      ["scripts/gateway.mjs"],
      {
        env: {
          ...process.env,
          GATEWAY_PORT: gatewayPort,
        },
      },
    );
  }
}

// Iniciar el frontend cuando corresponda.
if (!servicesOnly) {
  start(
    "web",
    process.execPath,
    [
      path.join(root, "node_modules/next/dist/bin/next"),
      production ? "start" : "dev",
      ...(!production ? ["--webpack"] : []),
      "--hostname",
      argument("--host") ||
        (preview ? "0.0.0.0" : "127.0.0.1"),
      "--port",
      argument("--port") || process.env.PORT || "3000",
    ],
    {
      cwd: path.join(root, "apps/web"),
    },
  );
}

