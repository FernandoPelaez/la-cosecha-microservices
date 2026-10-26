import mysql from "mysql2/promise";
import { readdir, readFile } from "node:fs/promises";
import {
  databaseName,
  checksum,
  statements,
  validateTarget,
  PROJECT,
} from "./migration-plan.mjs";

const database = databaseName(process.env.DB_NAME || "la_cosecha_soa");
const c = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: false,
});
const lock = `${database}:migrations`;
try {
  const [[held]] = await c.query("SELECT GET_LOCK(?,10) AS acquired", [lock]);
  if (held.acquired !== 1) throw new Error("Otra migración sigue en curso");
  await c.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );
  await c.changeUser({ database });
  const [tables] = await c.query(
    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=?",
    [database],
  );
  let marker;
  if (tables.some((t) => t.name === "project_metadata")) {
    const [[row]] = await c.query(
      "SELECT valor FROM project_metadata WHERE clave='proyecto'",
    );
    marker = row?.valor;
  }
  validateTarget(tables, marker);
  await c.query(
    "CREATE TABLE IF NOT EXISTS project_metadata(clave VARCHAR(80) PRIMARY KEY,valor VARCHAR(255) NOT NULL) ENGINE=InnoDB",
  );
  await c.query(
    "INSERT IGNORE INTO project_metadata(clave,valor) VALUES ('proyecto',?)",
    [PROJECT],
  );
  await c.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations(nombre VARCHAR(200) PRIMARY KEY,sha256 CHAR(64) NOT NULL,paso INT UNSIGNED NOT NULL DEFAULT 0,estado ENUM('running','applied') NOT NULL DEFAULT 'running',fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB",
  );
  const folder = new URL("../database/migrations/", import.meta.url);
  for (const name of (await readdir(folder))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(new URL(name, folder), "utf8"),
      hash = checksum(sql);
    const [[previous]] = await c.query(
      "SELECT * FROM schema_migrations WHERE nombre=?",
      [name],
    );
    if (previous && previous.sha256 !== hash)
      throw new Error(
        `La migración aplicada cambió: ${name}. Restaura el archivo y crea otra migración.`,
      );
    if (previous?.estado === "applied") continue;
    await c.query(
      "INSERT IGNORE INTO schema_migrations(nombre,sha256) VALUES (?,?)",
      [name, hash],
    );
    const plan = statements(sql);
    for (let i = previous?.paso || 0; i < plan.length; i++) {
      // MySQL confirma DDL implícitamente. Detectar un ADD ya confirmado permite
      // reanudar tras un corte entre el DDL y la actualización del contador.
      const statement = plan[i];
      const column = statement.match(
        /^ALTER TABLE\s+`?(\w+)`?\s+ADD COLUMN\s+`?(\w+)`?/i,
      );
      const index = statement.match(
        /^CREATE UNIQUE INDEX\s+`?(\w+)`?\s+ON\s+`?(\w+)`?/i,
      );
      const constraint = statement.match(
        /^ALTER TABLE\s+`?(\w+)`?\s+ADD CONSTRAINT\s+`?(\w+)`?/i,
      );
      let exists = false;
      if (column) {
        const [[r]] = await c.query(
          "SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?",
          [database, column[1], column[2]],
        );
        exists = r.n > 0;
      }
      if (index) {
        const [[r]] = await c.query(
          "SELECT COUNT(*) n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=?",
          [database, index[2], index[1]],
        );
        exists = r.n > 0;
      }
      if (constraint) {
        const [[r]] = await c.query(
          "SELECT COUNT(*) n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? AND TABLE_NAME=? AND CONSTRAINT_NAME=?",
          [database, constraint[1], constraint[2]],
        );
        exists = r.n > 0;
      }
      if (!exists)
        await c.query(
          statement.replace(
            /^CREATE TABLE (?!IF NOT EXISTS)/i,
            "CREATE TABLE IF NOT EXISTS ",
          ),
        );
      await c.query("UPDATE schema_migrations SET paso=? WHERE nombre=?", [
        i + 1,
        name,
      ]);
    }
    await c.query(
      "UPDATE schema_migrations SET estado='applied' WHERE nombre=?",
      [name],
    );
    console.log(`Aplicada: ${name}`);
  }
  for (const role of ["ADMIN", "CLIENTE", "INVENTARIO", "VENTAS", "LOGISTICA"])
    await c.query("INSERT IGNORE INTO roles(nombre_rol) VALUES (?)", [role]);
  await c.query(
    "INSERT INTO tipos_pago(nombre) SELECT 'Tarjeta' WHERE NOT EXISTS (SELECT 1 FROM tipos_pago WHERE nombre='Tarjeta')",
  );
  console.log(
    "Migraciones completadas. No se importaron usuarios ni operaciones anteriores.",
  );
} catch (error) {
  console.error(error.code ? `MySQL: ${error.code}` : error.message);
  process.exitCode = 1;
} finally {
  await c.query("SELECT RELEASE_LOCK(?)", [lock]).catch(() => {});
  await c.end();
}
