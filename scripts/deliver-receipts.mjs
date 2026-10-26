import { pool } from "../packages/core/db.mjs";
import { deliverPendingReceipts } from "../services/commerce/outbox.mjs";
const watch = process.argv.includes("--watch");
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
try {
  do {
    try {
      const result = await deliverPendingReceipts();
      if (result.sent) console.log(`Comprobantes enviados: ${result.sent}`);
    } catch (error) {
      console.error("Comprobantes pendientes:", error.code || error.name);
      if (!watch) process.exitCode = 1;
    }
    if (watch && !stopping)
      await new Promise((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          process.off("SIGINT", finish);
          process.off("SIGTERM", finish);
          resolve();
        };
        const timer = setTimeout(finish, 60000);
        process.once("SIGINT", finish);
        process.once("SIGTERM", finish);
      });
  } while (watch && !stopping);
} finally {
  await pool.end();
}
