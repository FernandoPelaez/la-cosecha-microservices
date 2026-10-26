import type { ModuleConfig } from "../types";
const roles = ["ADMIN", "INVENTARIO"];
export const purchaseModules: Record<string, ModuleConfig> = {
  proveedores: {
    title: "Proveedores",
    subtitle: "Información comercial y de contacto.",
    endpoint: "suppliers",
    roles,
    create: true,
    edit: true,
    remove: true,
    columns: [
      { key: "nombre", label: "Proveedor" },
      { key: "razon_social", label: "Razón social" },
      { key: "rfc", label: "RFC" },
      { key: "correo", label: "Correo" },
      { key: "telefono", label: "Teléfono" },
    ],
    fields: [
      { key: "nombre", label: "Nombre", required: true, max: 150 },
      { key: "razon_social", label: "Razón social", max: 200 },
      { key: "rfc", label: "RFC", max: 13 },
      { key: "direccion", label: "Dirección", type: "textarea", max: 1000 },
      { key: "correo", label: "Correo", max: 254 },
      { key: "telefono", label: "Teléfono", max: 20 },
    ],
  },
  compras: {
    title: "Compras a proveedores",
    subtitle: "Registra la orden, confirma y recibe mercancía.",
    endpoint: "purchases",
    roles,
    create: true,
    detailEndpoint: "purchases",
    columns: [
      { key: "id", label: "Compra" },
      { key: "proveedor", label: "Proveedor" },
      { key: "fecha", label: "Fecha" },
      { key: "total", label: "Total", money: true },
      { key: "estado", label: "Estado" },
    ],
    fields: [
      {
        key: "id_proveedor",
        label: "Proveedor",
        type: "select",
        source: "suppliers",
        required: true,
      },
      {
        key: "items",
        label: "Productos de la compra",
        type: "items",
        source: "products",
        required: true,
      },
    ],
    edit: true,
    editMethod: "PATCH",
    editFields: (r) => [
      {
        key: "estado",
        label: "Estado",
        type: "select",
        required: true,
        options: (r.estado === "borrador"
          ? ["confirmada", "cancelada"]
          : r.estado === "confirmada"
            ? ["recibida", "cancelada"]
            : []
        ).map((s) => ({ value: s, label: s })),
      },
    ],
  },
  "devoluciones-proveedores": {
    title: "Devoluciones a proveedores",
    subtitle: "Salida de mercancía recibida y validación de cantidades.",
    endpoint: "supplier-returns",
    roles,
    create: true,
    columns: [
      { key: "id_compra", label: "Compra" },
      { key: "nombre", label: "Producto" },
      { key: "cantidad", label: "Cantidad" },
      { key: "motivo", label: "Motivo" },
      { key: "fecha", label: "Fecha" },
    ],
    fields: [
      {
        key: "id_compra",
        label: "Compra recibida",
        type: "select",
        source: "purchases",
        sourceLabel: "id",
        required: true,
      },
      {
        key: "id_producto",
        label: "Producto",
        type: "select",
        source: "products",
        required: true,
      },
      {
        key: "cantidad",
        label: "Cantidad",
        type: "number",
        min: 1,
        required: true,
      },
      {
        key: "motivo",
        label: "Motivo",
        type: "textarea",
        required: true,
        max: 2000,
      },
    ],
  },
};
