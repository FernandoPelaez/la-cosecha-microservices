import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || "la_cosecha_soa",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionLimit: 10,
  timezone: "Z",
  decimalNumbers: false,
  dateStrings: true,
  multipleStatements: false,
});

// Mantener las conexiones MySQL en UTC para evitar inconsistencias en las fechas.
pool.pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

export async function query(sql, params = [], connection = pool) {
  const [rows] = await connection.execute(sql, params);
  return rows;
}

export async function transaction(action) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const result = await action(connection);

    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
