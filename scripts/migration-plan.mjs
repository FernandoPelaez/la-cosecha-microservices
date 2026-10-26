import { createHash } from "node:crypto";

export const PROJECT = "la-cosecha-soa-v3";

export function databaseName(value) {
  if (
    !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(value) ||
    ["mysql", "sys", "information_schema", "performance_schema"].includes(
      value.toLowerCase(),
    )
  ) {
    throw new Error(
      "DB_NAME debe ser un nombre válido de una base exclusiva para LA COSECHA SOA",
    );
  }

  return value;
}

export const checksum = (sql) =>
  createHash("sha256").update(sql).digest("hex");

// Las migraciones del proyecto contienen DDL simple, sin rutinas ni delimitadores.
// Usan los escapes de cadenas de MySQL con NO_BACKSLASH_ESCAPES desactivado.
export function statements(sql) {
  const plan = [];
  let current = "";
  let quote = null;

  const flush = () => {
    const statement = current.trim();

    if (statement) {
      plan.push(statement);
    }

    current = "";
  };

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];

    // Dentro de comillas, los puntos y coma forman parte del contenido.
    if (quote !== null) {
      current += char;

      if (char === "\\" && quote !== "`" && next !== undefined) {
        current += next;
        i++;
      } else if (char === quote) {
        if (next === quote) {
          // Una comilla duplicada representa una comilla dentro del contenido.
          current += next;
          i++;
        } else {
          quote = null;
        }
      }

      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      current += char;
    } else if (
      char === "#" ||
      (char === "-" &&
        next === "-" &&
        /[\s\u0000-\u001f\u007f]/u.test(sql[i + 2] ?? ""))
    ) {
      // Ignorar comentarios de línea y conservar la separación entre tokens.
      while (
        i + 1 < sql.length &&
        sql[i + 1] !== "\n" &&
        sql[i + 1] !== "\r"
      ) {
        i++;
      }

      current += " ";
    } else if (char === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);

      if (end === -1) {
        throw new Error(
          "Comentario de bloque SQL sin cerrar en la migración",
        );
      }

      // Conservar comentarios ejecutables y directivas del optimizador.
      // MySQL ejecuta /*! ... */ y usa /*+ ... */ como hints.
      current +=
        sql[i + 2] === "!" || sql[i + 2] === "+"
          ? sql.slice(i, end + 2)
          : " ";

      i = end + 1;
    } else if (char === ";") {
      // Separar únicamente cuando el punto y coma está fuera de comillas.
      flush();
    } else {
      current += char;
    }
  }

  if (quote !== null) {
    throw new Error(
      "Texto o identificador SQL entre comillas sin cerrar en la migración",
    );
  }

  // Incluir la última instrucción aunque no termine con punto y coma.
  flush();

  return plan;
}

export function validateTarget(tables, marker) {
  if (tables.length && marker !== PROJECT) {
    throw new Error(
      "La base contiene tablas ajenas a esta entrega. Usa una base NUEVA y vacía en DB_NAME; no se modificó ninguna tabla.",
    );
  }
}
