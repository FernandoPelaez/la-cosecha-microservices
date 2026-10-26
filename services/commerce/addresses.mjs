import { z } from "zod";
import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { id, text, optionalText } from "../../packages/core/validation.mjs";
import { ok } from "../../packages/core/http.mjs";
const schema = z.object({
  calle_numero: text(255),
  colonia: text(),
  ciudad: text(),
  codigo_postal: z.string().regex(/^\d{5}$/, "Usa cinco dígitos"),
  referencias: optionalText(1000),
});
export function addressRoutes(app) {
  app.get("/addresses", async (req, res) =>
    ok(
      res,
      await query("SELECT * FROM direcciones WHERE id_cliente=? ORDER BY id", [
        req.user.clienteId,
      ]),
    ),
  );
  app.post("/addresses", async (req, res) => {
    const d = schema.parse(req.body);
    const r = await query(
      "INSERT INTO direcciones(id_cliente,calle_numero,colonia,ciudad,codigo_postal,referencias) VALUES (?,?,?,?,?,?)",
      [req.user.clienteId, ...Object.values(d)],
    );
    ok(res, { id: r.insertId }, 201);
  });
  app.put("/addresses/:id", async (req, res) => {
    const d = schema.parse(req.body);
    const key = id.parse(req.params.id);
    await transaction(async (c) => {
      const [address] = await query(
        "SELECT id FROM direcciones WHERE id=? AND id_cliente=? FOR UPDATE",
        [key, req.user.clienteId],
        c,
      );
      ensure(address, 404, "Domicilio no encontrado");
      const [used] = await query(
        "SELECT id FROM pedidos WHERE id_direccion=? LIMIT 1",
        [key],
        c,
      );
      ensure(
        !used,
        409,
        "Este domicilio forma parte de un pedido. Registra uno nuevo para conservar el historial",
      );
      const r = await query(
        "UPDATE direcciones SET calle_numero=?,colonia=?,ciudad=?,codigo_postal=?,referencias=? WHERE id=? AND id_cliente=?",
        [...Object.values(d), key, req.user.clienteId],
        c,
      );
      ensure(r.affectedRows, 404, "Domicilio no encontrado");
    });
    ok(res, { id: key });
  });
  app.delete("/addresses/:id", async (req, res) => {
    const r = await query(
      "DELETE FROM direcciones WHERE id=? AND id_cliente=?",
      [id.parse(req.params.id), req.user.clienteId],
    );
    ensure(r.affectedRows, 404, "Domicilio no encontrado");
    ok(res, { completed: true });
  });
}
