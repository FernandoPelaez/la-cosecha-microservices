import { z } from "zod";
export const id = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
export const quantity = z.coerce.number().int().min(1).max(10000);
export const money = z
  .union([z.string(), z.number()])
  .transform(String)
  .refine(
    (v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) < 1e9,
    "Usa un importe positivo con hasta dos decimales",
  );
export const optionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => v || null);
export const text = (max = 150) =>
  z.string().trim().min(1, "Campo obligatorio").max(max);
