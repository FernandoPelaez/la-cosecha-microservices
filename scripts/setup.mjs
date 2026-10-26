import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { services } from "./service-registry.mjs";
function run(executable, args) {
  const result = spawnSync(executable, args, { stdio: "inherit" });
  if (result.error || result.status !== 0)
    throw new Error(
      `No se completó ${executable}. Instala los prerrequisitos indicados en README.md.`,
    );
}
run(process.execPath, ["scripts/configure.mjs"]);
process.loadEnvFile(".env");
if (!existsSync(".venv"))
  run(process.env.PYTHON_EXECUTABLE || "python", ["-m", "venv", ".venv"]);
const python = path.resolve(
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
run(python, [
  "-m",
  "pip",
  "install",
  "-r",
  "services/python-common/requirements.lock.txt",
]);
for (const service of services.filter((s) => s.technology === "dotnet"))
  run(process.env.DOTNET_EXECUTABLE || "dotnet", [
    "restore",
    `services/${service.name}/${service.project}`,
    "--locked-mode",
  ]);
console.log(
  "Dependencias preparadas. Configura MySQL y después ejecuta db:migrate y db:seed.",
);
