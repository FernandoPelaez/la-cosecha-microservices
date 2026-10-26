import express from "express";
import { z } from "zod";
import { application, finish, ok } from "../../packages/core/http.mjs";
import { auth, roles, internal } from "../../packages/core/security.mjs";
import { id, quantity, text } from "../../packages/core/validation.mjs";
import { list, create, change } from "./service.mjs";
import { refund } from "./refund.mjs";
const app = application("returns-fernando");
app.use(internal, express.json({ limit: "30kb" }), auth);
for (const kind of ["returns", "warranties"]) {
  app.get(`/${kind}`, async (req, res) => ok(res, await list(req.user, kind)));
  app.post(`/${kind}`, async (req, res) => {
    const d = z
      .object({
        id_venta: id,
        id_producto: id,
        cantidad: kind === "returns" ? quantity : quantity.optional(),
        motivo: text(2000),
      })
      .parse(req.body);
    ok(res, await create(req.user, kind, d), 201);
  });
  app.patch(`/${kind}/:id`, roles("ADMIN"), async (req, res) => {
    const d = z
      .object({
        estado: text(40),
        resolucion: z.string().max(3000).optional(),
        reintegrar: z.boolean().default(false),
      })
      .parse(req.body);
    ok(res, await change(req.user, kind, id.parse(req.params.id), d));
  });
}
app.post("/returns/:id/refund", roles("ADMIN"), async (req, res) =>
  ok(res, await refund(id.parse(req.params.id))),
);
export default finish(app, 4005);
