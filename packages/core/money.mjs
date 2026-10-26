import { ensure } from "./errors.mjs";
export function cents(value) {
  const s = String(value);
  ensure(/^\d+(\.\d{1,2})?$/.test(s), 400, "Importe inválido");
  const [whole, fraction = ""] = s.split(".");
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  ensure(
    Number.isSafeInteger(n) && n <= 999999999999,
    400,
    "Importe fuera de rango",
  );
  return n;
}
export function decimal(value) {
  ensure(
    Number.isSafeInteger(value) && value >= 0 && value <= 999999999999,
    400,
    "Importe fuera de rango",
  );
  return (value / 100).toFixed(2);
}
export function discounted(price, promotions) {
  const base = cents(price);
  return Math.max(
    0,
    base -
      Math.max(
        0,
        ...promotions.map((p) =>
          p.tipo_descuento === "porcentaje"
            ? Math.round((base * Number(p.valor)) / 100)
            : cents(p.valor),
        ),
      ),
  );
}
export const isCardMethod = (name) =>
  /^(tarjeta|tarjeta de crédito|tarjeta de débito|tarjeta de credito|tarjeta de debito)$/i.test(
    name.trim(),
  );
