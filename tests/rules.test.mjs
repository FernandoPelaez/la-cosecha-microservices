import test from "node:test";
import assert from "node:assert/strict";
import {
  cents,
  decimal,
  discounted,
  isCardMethod,
} from "../packages/core/money.mjs";
import { assertReturnCapacity } from "../services/returns/domain/capacity.ts";
import { productSchema, offerSchema } from "../services/inventory/schemas.mjs";
import { createSchema } from "../services/packaging/schemas.ts";
import { csv } from "../services/reports/repository.mjs";
import { receiptPDF } from "../services/commerce/receipts.mjs";

test("los importes conservan centavos y rechazan valores ambiguos o fuera del SQL", () => {
  assert.equal(cents("1234.56"), 123456);
  assert.equal(decimal(cents("0.10") + cents("0.20")), "0.30");
  for (const value of [
    "-1",
    "1.001",
    "1e3",
    "Infinity",
    "NaN",
    "1,20",
    "10000000000.00",
  ])
    assert.throws(() => cents(value));
  assert.throws(() => decimal(1000000000000));
});
test("las ofertas usan el mejor descuento, no se acumulan ni crean precios negativos", () => {
  assert.equal(
    discounted("99.99", [
      { tipo_descuento: "porcentaje", valor: "20.00" },
      { tipo_descuento: "monto", valor: "10.00" },
    ]),
    7999,
  );
  assert.equal(
    discounted("10.00", [{ tipo_descuento: "monto", valor: "20.00" }]),
    0,
  );
  assert.equal(discounted("10.00", []), 1000);
});
test("solo las denominaciones explícitas de tarjeta son aceptadas", () => {
  for (const value of ["Tarjeta", "TARJETA DE CRÉDITO", "tarjeta de debito"])
    assert.equal(isCardMethod(value), true);
  for (const value of [
    "SPEI",
    "Transferencia",
    "Transferencia bancaria",
    "Tarjeta / SPEI",
    "Efectivo",
    "",
  ])
    assert.equal(isCardMethod(value), false);
});
test("devoluciones: se descuentan todas las solicitudes no rechazadas", () => {
  assertReturnCapacity(5, [{ cantidad: 3, estado: "rechazada" }], 5);
  assertReturnCapacity(5, [{ cantidad: 3, estado: "reembolsada" }], 2);
  assert.throws(
    () => assertReturnCapacity(5, [{ cantidad: 3, estado: "solicitada" }], 3),
    /cantidad/i,
  );
  for (const n of [0, -1, 1.5, Infinity])
    assert.throws(() => assertReturnCapacity(5, [], n));
});
const product = {
  nombre: "Producto de prueba",
  id_proveedor: 1,
  costo: "1.00",
  precio: "2.00",
  stock_minimo: 2,
  stock_maximo: 10,
  imagen: "/images/la_cosecha_salsa_01.png",
};
test("producto valida límites, precio y conserva únicamente las fotos oficiales", () => {
  assert.equal(productSchema.parse(product).precio, "2.00");
  for (let n = 1; n <= 15; n++)
    assert.equal(
      productSchema.safeParse({
        ...product,
        imagen: `/images/la_cosecha_salsa_${String(n).padStart(2, "0")}.png`,
      }).success,
      true,
    );
  assert.equal(
    productSchema.safeParse({
      ...product,
      imagen: "/images/la_cosecha_salsa_16.png",
    }).success,
    false,
  );
  for (const change of [
    { stock_maximo: 1 },
    { precio: "-2.00" },
    { imagen: "https://example.com/foto.png" },
    { caducidad: "2026-02-30" },
  ])
    assert.equal(
      productSchema.safeParse({ ...product, ...change }).success,
      false,
    );
});
test("las ofertas no admiten porcentajes imposibles ni fechas invertidas", () => {
  const offer = {
    nombre: "Prueba",
    tipo_descuento: "porcentaje",
    valor: "10.00",
    fecha_inicio: "2026-10-01T00:00:00Z",
    fecha_fin: "2026-10-31T00:00:00Z",
    activa: true,
    productos: [1],
  };
  assert.equal(offerSchema.safeParse(offer).success, true);
  for (const change of [
    { valor: "101.00" },
    { fecha_fin: "2026-09-01T00:00:00Z" },
    { productos: [] },
  ])
    assert.equal(offerSchema.safeParse({ ...offer, ...change }).success, false);
});
test("empaquetado conserva validaciones de peso y dimensiones de Fernando", () => {
  const p = {
    peso: 1,
    tamano: "chico",
    tipoEmpacado: "caja",
    medidas: { largo: 10, ancho: 10, alto: 10 },
  };
  assert.equal(createSchema.safeParse(p).success, true);
  assert.equal(createSchema.safeParse({ ...p, peso: 0 }).success, false);
  assert.equal(
    createSchema.safeParse({ ...p, medidas: { ...p.medidas, alto: -1 } })
      .success,
    false,
  );
});
test("CSV escapa comillas, separadores y fórmulas con espacios o tabuladores", () => {
  const result = csv([
    { nombre: ' =HYPERLINK("x")', nota: "a,b" },
    { nombre: "\t+1", nota: "línea\nnueva" },
  ]);
  assert.match(result, /' =HYPERLINK\(""x""\)/);
  assert.ok(result.includes("'\t+1"));
  assert.ok(result.includes('"a,b"'));
});
test("ticket genera un PDF real, incluso con muchas líneas", async () => {
  const pdf = await receiptPDF({
    folio: "LC-TEST",
    fecha: "2026-10-17",
    nombre: "Cliente de prueba",
    total: "100.00",
    items: Array.from({ length: 80 }, (_, i) => ({
      nombre: `Producto ${i}`,
      cantidad: 1,
      precio_unitario: "1.25",
    })),
  });
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 2000);
  assert.ok(pdf.subarray(-15).toString().includes("%%EOF"));
});
