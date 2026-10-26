import test from "node:test";
import assert from "node:assert/strict";
import {
  databaseName,
  validateTarget,
  PROJECT,
  checksum,
  statements,
} from "../scripts/migration-plan.mjs";

test("una base ajena se rechaza antes de ejecutar migraciones", () => {
  assert.throws(
    () => validateTarget([{ name: "products" }], undefined),
    /NUEVA/,
  );
  assert.throws(
    () => validateTarget([{ name: "usuarios" }], "otro-proyecto"),
    /NUEVA/,
  );
  assert.doesNotThrow(() => validateTarget([], undefined));
  assert.doesNotThrow(() => validateTarget([{ name: "usuarios" }], PROJECT));
});
test("los nombres de base no admiten inyección ni esquemas del sistema", () => {
  for (const value of ["mysql", "SYS", "a`;DROP DATABASE b", "../db", ""])
    assert.throws(() => databaseName(value));
  assert.equal(databaseName("la_cosecha_soa_test"), "la_cosecha_soa_test");
});
test("el checksum detecta una migración cambiada y el plan conserva DDL", () => {
  assert.notEqual(
    checksum("CREATE TABLE a(id INT)"),
    checksum("CREATE TABLE b(id INT)"),
  );
  assert.deepEqual(
    statements(
      "-- Comentario\nCREATE TABLE a(id INT);\nALTER TABLE a ADD COLUMN b INT;",
    ),
    ["CREATE TABLE a(id INT)", "ALTER TABLE a ADD COLUMN b INT"],
  );
});
