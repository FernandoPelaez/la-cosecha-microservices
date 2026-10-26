
import type { ModuleConfig, FieldSpec } from "../types";
import photographs from "../../../../../../database/catalogo.json";

const images = photographs.map((p) => ({
  value: p.image,
  label: p.name,
}));

const productFields: FieldSpec[] = [
  {
    key: "nombre",
    label: "Nombre",
    required: true,
    max: 150,
  },
  {
    key: "descripcion",
    label: "Descripción",
    type: "textarea",
    max: 4000,
  },
  {
    key: "id_proveedor",
    label: "Proveedor",
    type: "select",
    source: "suppliers",
  },
  {
    key: "categoria",
    label: "Categoría",
    max: 100,
  },
  {
    key: "precio",
    label: "Precio (MXN)",
    type: "number",
    min: 0,
    step: "0.01",
    required: true,
  },
  {
    key: "costo",
    label: "Costo (MXN)",
    type: "number",
    min: 0,
    step: "0.01",
  },
  {
    key: "lote",
    label: "Lote",
    max: 100,
  },
  {
    key: "serie",
    label: "Serie",
    max: 100,
  },
  {
    key: "caducidad",
    label: "Caducidad",
    type: "date",
  },
  {
    key: "stock_minimo",
    label: "Stock mínimo",
    type: "number",
    min: 0,
    required: true,
  },
  {
    key: "stock_maximo",
    label: "Stock máximo",
    type: "number",
    min: 0,
    required: true,
  },
  {
    key: "imagen",
    label: "Fotografía",
    type: "select",
    options: images,
    required: true,
  },
];

const base = {
  roles: ["ADMIN", "INVENTARIO"],
  columns: [
    { key: "id", label: "ID" },
    { key: "nombre", label: "Producto" },
    { key: "precio", label: "Precio", money: true },
    { key: "stock_actual", label: "Existencias" },
  ],
};

export const catalogModules: Record<string, ModuleConfig> = {
  productos: {
    ...base,
    title: "Productos",
    subtitle: "Catálogo, precios y fotografías oficiales.",
    endpoint: "inventory",
    writeEndpoint: "products",
    fields: productFields,
    create: true,
    edit: true,
    remove: true,
  },

  inventario: {
    ...base,
    title: "Inventario",
    subtitle: "Entradas y salidas con registro de cada movimiento.",
    endpoint: "inventory",
    writeEndpoint: "stock",
    fields: [
      {
        key: "cantidad",
        label: "Movimiento (+ entrada / − salida)",
        type: "number",
        min: -10000,
        max: 10000,
        required: true,
      },
      {
        key: "motivo",
        label: "Motivo del ajuste",
        required: true,
        max: 255,
      },
    ],
    edit: true,
    editMethod: "POST",
    columns: [
      { key: "nombre", label: "Producto" },
      { key: "stock_actual", label: "Existencias" },
      { key: "stock_minimo", label: "Mínimo" },
      { key: "stock_maximo", label: "Máximo" },
    ],
  },

  alertas: {
    ...base,
    title: "Alertas de inventario",
    subtitle: "Productos que alcanzaron su límite mínimo o máximo.",
    endpoint: "alerts",
    filter: (r) =>
      Number(r.stock_actual) <= Number(r.stock_minimo) ||
      Number(r.stock_actual) >= Number(r.stock_maximo),
    columns: [
      { key: "nombre", label: "Producto" },
      { key: "stock_actual", label: "Existencias" },
      { key: "stock_minimo", label: "Mínimo" },
      { key: "stock_maximo", label: "Máximo" },
    ],
  },

  movimientos: {
    ...base,
    title: "Movimientos de inventario",
    subtitle: "Trazabilidad de compras, reservas, devoluciones y ajustes.",
    endpoint: "movements",
    columns: [
      { key: "fecha", label: "Fecha" },
      { key: "nombre", label: "Producto" },
      { key: "tipo", label: "Tipo" },
      { key: "cantidad", label: "Cantidad" },
      { key: "stock_anterior", label: "Anterior" },
      { key: "stock_posterior", label: "Posterior" },
      { key: "motivo", label: "Motivo" },
    ],
  },

  ofertas: {
    roles: base.roles,
    title: "Ofertas",
    subtitle: "Descuentos configurados y periodos de vigencia.",
    endpoint: "offers",
    create: true,
    edit: true,
    remove: true,
    columns: [
      { key: "nombre", label: "Nombre" },
      { key: "tipo_descuento", label: "Tipo" },
      { key: "valor", label: "Valor" },
      { key: "fecha_inicio", label: "Inicio" },
      { key: "fecha_fin", label: "Fin" },
      { key: "activa", label: "Activa" },
    ],
    fields: [
      {
        key: "nombre",
        label: "Nombre",
        required: true,
      },
      {
        key: "descripcion",
        label: "Descripción",
        type: "textarea",
      },
      {
        key: "tipo_descuento",
        label: "Tipo de descuento",
        type: "select",
        options: [
          {
            value: "porcentaje",
            label: "Porcentaje",
          },
          {
            value: "monto",
            label: "Importe MXN",
          },
        ],
        required: true,
      },
      {
        key: "valor",
        label: "Valor",
        type: "number",
        step: "0.01",
        min: 0.01,
        required: true,
      },
      {
        key: "fecha_inicio",
        label: "Inicio",
        type: "datetime-local",
        required: true,
      },
      {
        key: "fecha_fin",
        label: "Fin",
        type: "datetime-local",
        required: true,
      },
      {
        key: "productos",
        label: "Productos incluidos",
        type: "multiselect",
        source: "products",
        required: true,
      },
      {
        key: "activa",
        label: "Oferta activa",
        type: "checkbox",
        default: true,
      },
    ],
    transform: (d) => ({
      ...d,
      fecha_inicio: new Date(
        String(d.fecha_inicio),
      ).toISOString(),
      fecha_fin: new Date(
        String(d.fecha_fin),
      ).toISOString(),
    }),
  },
};

