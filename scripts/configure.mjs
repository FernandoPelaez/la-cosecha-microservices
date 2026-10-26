import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const testing = process.argv.includes("--test");
const output = testing ? ".env.test" : ".env";
let content = await readFile(
  testing ? ".env.test.example" : ".env.example",
  "utf8",
);
for (const key of ["JWT_SECRET", "SERVICE_KEY"])
  content = content.replace(
    `${key}=`,
    `${key}=${randomBytes(48).toString("base64url")}`,
  );
if (testing)
  content = content.replace(
    "DB_PASSWORD=",
    `DB_PASSWORD=${randomBytes(32).toString("base64url")}`,
  );
try {
  await writeFile(output, content, { flag: "wx", mode: 0o600 });
  console.log(
    `${output} creado. Completa las credenciales y los servicios externos antes de ejecutar.`,
  );
} catch (error) {
  if (error.code === "EEXIST")
    console.log(`${output} ya existe; se conserva sin modificaciones.`);
  else throw error;
}
