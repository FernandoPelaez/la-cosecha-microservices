// Rutas y consultas del servicio de Nidian, con identidad y permisos de LA COSECHA.
import express from "express";
import { z } from "zod";
import { application, finish, ok } from "../../packages/core/http.mjs";
import { auth, internal } from "../../packages/core/security.mjs";
import { query } from "../../packages/core/db.mjs";
import { id, text } from "../../packages/core/validation.mjs";
import { ensure } from "../../packages/core/errors.mjs";
const app = application("reviews-nidian");
app.use(internal, express.json({ limit: "20kb" }));
app.get("/reviews/product/:id", async (req, res) =>
  ok(
    res,
    await query(
      "SELECT r.id,r.calificacion,r.comentario,r.fecha,u.nombre FROM resenas r JOIN clientes c ON c.id=r.id_cliente JOIN usuarios u ON u.id=c.id_usuario WHERE r.id_producto=? ORDER BY r.id DESC LIMIT 100",
      [id.parse(req.params.id)],
    ),
  ),
);
app.use(auth);
app.get("/reviews", async (req, res) =>
  ok(
    res,
    await query(
      "SELECT r.*,p.nombre FROM resenas r JOIN productos p ON p.id=r.id_producto WHERE (?='ADMIN' OR r.id_cliente=?) ORDER BY r.id DESC LIMIT 500",
      [req.user.rol, req.user.clienteId],
    ),
  ),
);
const body = z.object({
  calificacion: z.coerce.number().int().min(1).max(5),
  comentario: text(2000),
});
app.post("/reviews", async (req, res) => {
  const d = body.extend({ id_producto: id }).parse(req.body);
  ensure(
    req.user.clienteId && req.user.correo_verificado,
    403,
    "Confirma tu correo para escribir una reseña",
  );
  const [p] = await query(
    "SELECT dv.id FROM detalle_ventas dv JOIN ventas v ON v.id=dv.id_venta WHERE v.id_cliente=? AND dv.id_producto=? LIMIT 1",
    [req.user.clienteId, d.id_producto],
  );
  ensure(p, 403, "Puedes reseñar productos que hayas comprado");
  const r = await query(
    "INSERT INTO resenas(id_producto,id_cliente,calificacion,comentario) VALUES (?,?,?,?)",
    [d.id_producto, req.user.clienteId, d.calificacion, d.comentario],
  );
  ok(res, { id: r.insertId }, 201);
});
app.put("/reviews/:id", async (req, res) => {
  const d = body.parse(req.body);
  const r = await query(
    "UPDATE resenas SET calificacion=?,comentario=? WHERE id=? AND id_cliente=?",
    [d.calificacion, d.comentario, id.parse(req.params.id), req.user.clienteId],
  );
  ensure(r.affectedRows, 404, "Reseña no encontrada");
  ok(res, { completed: true });
});
app.delete("/reviews/:id", async (req, res) => {
  const r = await query(
    "DELETE FROM resenas WHERE id=? AND (?='ADMIN' OR id_cliente=?)",
    [id.parse(req.params.id), req.user.rol, req.user.clienteId],
  );
  ensure(r.affectedRows, 404, "Reseña no encontrada");
  ok(res, { completed: true });
});
export default finish(app, 4007);
