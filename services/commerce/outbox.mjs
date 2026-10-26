import { query, transaction } from "../../packages/core/db.mjs";
import { emailReceipt } from "./receipts.mjs";

/** Reserva con vencimiento: otro worker puede recuperar un envío tras una caída. */
export async function deliverPendingReceipts() {
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM)
    return { configured: false, sent: 0 };
  const jobs = await transaction(async (c) => {
    const rows = await query(
      "SELECT * FROM cola_comprobantes WHERE estado<>'enviado' AND disponible_en<=UTC_TIMESTAMP() ORDER BY disponible_en LIMIT 10 FOR UPDATE SKIP LOCKED",
      [],
      c,
    );
    for (const job of rows)
      await query(
        "UPDATE cola_comprobantes SET estado='enviando',intentos=intentos+1,disponible_en=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE) WHERE id_venta=?",
        [job.id_venta],
        c,
      );
    return rows;
  });
  let sent = 0;
  for (const job of jobs) {
    try {
      await emailReceipt({ rol: "ADMIN" }, job.id_venta);
      await query(
        "UPDATE cola_comprobantes SET estado='enviado',ultimo_error=NULL WHERE id_venta=?",
        [job.id_venta],
      );
      sent++;
    } catch (error) {
      const delay = Math.min(3600, 60 * 2 ** Math.min(job.intentos, 6));
      await query(
        "UPDATE cola_comprobantes SET estado='pendiente',disponible_en=DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND),ultimo_error=? WHERE id_venta=?",
        [
          delay,
          String(error.code || "MAIL_UNAVAILABLE").slice(0, 100),
          job.id_venta,
        ],
      );
    }
  }
  return { configured: true, sent };
}
