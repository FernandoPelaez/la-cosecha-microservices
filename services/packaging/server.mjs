import express from "express";
import { z } from "zod";
import { application, finish, ok } from "../../packages/core/http.mjs";
import { auth, roles, internal } from "../../packages/core/security.mjs";
import { query, transaction } from "../../packages/core/db.mjs";
import {
  id,
  quantity,
  text,
  optionalText,
} from "../../packages/core/validation.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { createSchema } from "./schemas.ts";
const app = application("packaging-fernando");
app.use(
  internal,
  express.json({ limit: "30kb" }),
  auth,
  roles("ADMIN", "LOGISTICA", "INVENTARIO"),
);
// Envasado de salsa y empaque logístico son procesos separados.
const bottling = z
  .object({
    id_producto: id,
    tipo_envase: text(100),
    capacidad_ml: z.coerce.number().int().positive().nullable(),
    tipo_tapa: optionalText(100),
    etiqueta_colocada: z.boolean(),
    sello_colocado: z.boolean(),
    cantidad: quantity,
    estado: z.enum(["pendiente", "en_proceso", "completado"]),
    observaciones: optionalText(2000),
  })
  .refine(
    (d) =>
      d.estado !== "completado" || (d.etiqueta_colocada && d.sello_colocado),
    "Coloca la etiqueta y el sello para completar",
  );
app.get("/bottling", async (_req, res) =>
  ok(
    res,
    await query(
      "SELECT e.*,p.nombre FROM empaquetado e JOIN productos p ON p.id=e.id_producto ORDER BY e.id DESC LIMIT 500",
    ),
  ),
);
app.post("/bottling", async (req, res) => {
  const d = bottling.parse(req.body);
  const r = await query(
    "INSERT INTO empaquetado(id_producto,id_usuario,tipo_envase,capacidad_ml,tipo_tapa,etiqueta_colocada,sello_colocado,cantidad,estado,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [
      d.id_producto,
      req.user.id,
      d.tipo_envase,
      d.capacidad_ml,
      d.tipo_tapa,
      d.etiqueta_colocada,
      d.sello_colocado,
      d.cantidad,
      d.estado,
      d.observaciones,
    ],
  );
  ok(res, { id: r.insertId }, 201);
});
app.put("/bottling/:id", async (req, res) => {
  const d = bottling.parse(req.body);
  const key = id.parse(req.params.id);
  ok(
    res,
    await transaction(async (c) => {
      const [row] = await query(
        "SELECT * FROM empaquetado WHERE id=? FOR UPDATE",
        [key],
        c,
      );
      ensure(row, 404, "Envasado no encontrado");
      ensure(
        row.id_producto === d.id_producto,
        409,
        "El producto del envasado no puede cambiarse",
      );
      ensure(
        row.estado !== "completado",
        409,
        "Un lote completado no se modifica",
      );
      await query(
        "UPDATE empaquetado SET tipo_envase=?,capacidad_ml=?,tipo_tapa=?,etiqueta_colocada=?,sello_colocado=?,cantidad=?,estado=?,observaciones=? WHERE id=?",
        [
          d.tipo_envase,
          d.capacidad_ml,
          d.tipo_tapa,
          d.etiqueta_colocada,
          d.sello_colocado,
          d.cantidad,
          d.estado,
          d.observaciones,
          key,
        ],
        c,
      );
      return { id: key };
    }),
  );
});
app.get("/packages", async (_req, res) =>
  ok(
    res,
    await query("SELECT * FROM paquetes_logisticos ORDER BY id DESC LIMIT 500"),
  ),
);
app.post("/packages", async (req, res) => {
  const key = id.parse(req.body.id_envio);
  const d = createSchema.parse(req.body.paquete);
  ok(
    res,
    await transaction(async (c) => {
      const [shipment] = await query(
        "SELECT estado FROM envios WHERE id=? FOR UPDATE",
        [key],
        c,
      );
      ensure(shipment, 404, "Envío no encontrado");
      ensure(
        ["pendiente", "preparando"].includes(shipment.estado),
        409,
        "El paquete ya fue enviado",
      );
      const r = await query(
        "INSERT INTO paquetes_logisticos(id_envio,peso_kg,largo_cm,ancho_cm,alto_cm,tipo_empaque,tamano,estado) VALUES (?,?,?,?,?,?,?,'listo') ON DUPLICATE KEY UPDATE peso_kg=VALUES(peso_kg),largo_cm=VALUES(largo_cm),ancho_cm=VALUES(ancho_cm),alto_cm=VALUES(alto_cm),tipo_empaque=VALUES(tipo_empaque),tamano=VALUES(tamano),estado='listo'",
        [
          key,
          d.peso,
          d.medidas.largo,
          d.medidas.ancho,
          d.medidas.alto,
          d.tipoEmpacado,
          d.tamano,
        ],
        c,
      );
      return { id: r.insertId, id_envio: key };
    }),
    201,
  );
});
export default finish(app, 4006);
