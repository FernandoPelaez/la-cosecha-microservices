import { spawnSync } from "node:child_process";
import { services } from "./service-registry.mjs";
for (const service of services.filter((s) => s.technology === "dotnet")) {
  const result = spawnSync(
    process.env.DOTNET_EXECUTABLE || "dotnet",
    [
      "build",
      `services/${service.name}/${service.project}`,
      "--configuration",
      "Release",
      "--no-restore",
    ],
    { stdio: "inherit" },
  );
  if (result.error || result.status !== 0) {
    process.exitCode = 1;
    break;
  }
}
