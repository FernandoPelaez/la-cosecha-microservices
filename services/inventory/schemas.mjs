import { z } from "zod";
import {
  id,
  money,
  optionalText,
  text,
} from "../../packages/core/validation.mjs";
export const productSchema = z
  .object({
    nombre: text(150),
    descripcion: optionalText(4000),
    lote: optionalText(100),
    serie: optionalText(100),
    caducidad: z
      .union([z.iso.date(), z.literal(""), z.null()])
      .optional()
      .transform((v) => v || null),
    id_proveedor: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      id.nullable(),
    ),
    costo: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      money.nullable(),
    ),
    precio: money,
    categoria: optionalText(100),
    stock_minimo: z.coerce.number().int().min(0),
    stock_maximo: z.coerce.number().int().min(0),
    imagen: z
      .string()
      .regex(/^\/images\/la_cosecha_salsa_(0[1-9]|1[0-5])\.png$/),
  })
  .refine((d) => d.stock_maximo >= d.stock_minimo, {
    path: ["stock_maximo"],
    message: "El máximo no puede ser menor que el mínimo",
  });
export const offerSchema = z
  .object({
    nombre: text(),
    descripcion: optionalText(2000),
    tipo_descuento: z.enum(["porcentaje", "monto"]),
    valor: money,
    fecha_inicio: z.iso.datetime(),
    fecha_fin: z.iso.datetime(),
    activa: z.boolean(),
    productos: z.array(id).min(1).max(100),
  })
  .refine(
    (v) =>
      Number(v.valor) > 0 &&
      (v.tipo_descuento !== "porcentaje" || Number(v.valor) <= 100) &&
      v.fecha_fin >= v.fecha_inicio,
    "Revisa el valor y las fechas",
  );
