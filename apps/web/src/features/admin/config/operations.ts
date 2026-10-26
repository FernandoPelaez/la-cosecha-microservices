import type { ModuleConfig } from "../types";
const logistics = ["ADMIN", "LOGISTICA"];
const options = (values: string[]) =>
  values.map((value) => ({ value, label: value }));
export const operationModules: Record<string, ModuleConfig> = {
  usuarios: {
    title: "Usuarios y roles",
    subtitle:
      "Control de acceso; cambiar un rol revoca las sesiones anteriores.",
    endpoint: "users",
    roles: ["ADMIN"],
    edit: true,
    editPath: (row) => `users/${row.id}/rol`,
    columns: [
      { key: "id", label: "ID" },
      { key: "nombre", label: "Nombre" },
      { key: "correo", label: "Correo" },
      { key: "nombre_rol", label: "Rol" },
      { key: "estado", label: "Estado" },
    ],
    fields: [
      {
        key: "nombre_rol",
        label: "Rol",
        type: "select",
        required: true,
        options: options([
          "ADMIN",
          "CLIENTE",
          "INVENTARIO",
          "VENTAS",
          "LOGISTICA",
        ]),
      },
    ],
    action: (row) =>
      row.estado === "bloqueado"
        ? {
            label: "Desbloquear",
            path: `users/${row.id}/desbloquear`,
            method: "POST",
            variant: "edit",
          }
        : null,
  },
  ventas: {
    title: "Ventas",
    subtitle: "Compras confirmadas por el procesador y sus comprobantes.",
    endpoint: "sales",
    roles: ["ADMIN", "VENTAS"],
    columns: [
      { key: "id", label: "Venta" },
      { key: "folio", label: "Folio" },
      { key: "id_pedido", label: "Pedido" },
      { key: "fecha", label: "Fecha" },
      { key: "nombre", label: "Cliente" },
      { key: "total", label: "Total", money: true },
      { key: "estado_pedido", label: "Pedido" },
      { key: "estado_pago", label: "Pago" },
    ],
  },
  pagos: {
    title: "Pagos",
    subtitle:
      "Estados confirmados por Stripe; no se pueden marcar cobros manualmente.",
    endpoint: "payments",
    roles: ["ADMIN", "VENTAS"],
    columns: [
      { key: "id", label: "ID" },
      { key: "id_pedido", label: "Pedido" },
      { key: "fecha_actualizacion", label: "Actualización" },
      { key: "monto", label: "Importe", money: true },
      { key: "metodo", label: "Método" },
      { key: "estado", label: "Estado" },
      { key: "referencia_proveedor", label: "Referencia" },
    ],
  },
  pedidos: {
    actionRoles: ["ADMIN", "VENTAS"],
    title: "Pedidos de clientes",
    subtitle: "Consulta pedidos y prepara las compras confirmadas.",
    endpoint: "orders",
    roles: ["ADMIN", "VENTAS", "LOGISTICA"],
    columns: [
      { key: "id", label: "Pedido" },
      { key: "nombre", label: "Cliente" },
      { key: "fecha", label: "Fecha" },
      { key: "total", label: "Total", money: true },
      { key: "estado", label: "Estado" },
    ],
    action: (r) =>
      r.estado === "pagado"
        ? {
            label: "Preparar pedido",
            path: `orders/${r.id}/estado`,
            method: "PATCH",
            body: { estado: "preparacion" },
            variant: "edit",
          }
        : null,
  },
  envios: {
    title: "Envíos",
    subtitle: "Preparación, guía y seguimiento de las compras.",
    endpoint: "shipping",
    roles: logistics,
    edit: true,
    editMethod: "PATCH",
    columns: [
      { key: "id", label: "Envío" },
      { key: "id_venta", label: "Venta" },
      { key: "ciudad", label: "Destino" },
      { key: "paqueteria", label: "Paquetería" },
      { key: "num_guia", label: "Guía" },
      { key: "estado", label: "Estado" },
    ],
    editFields: (r) => [
      { key: "paqueteria", label: "Paquetería", max: 150 },
      { key: "num_guia", label: "Número de guía", max: 150 },
      {
        key: "estado",
        label: "Nuevo estado",
        type: "select",
        required: true,
        options: options(
          (
            {
              pendiente: ["preparando"],
              preparando: ["enviado"],
              enviado: ["en_transito"],
            } as Record<string, string[]>
          )[String(r.estado)] || [],
        ),
      },
    ],
  },
  paquetes: {
    title: "Paquetes logísticos",
    subtitle: "Peso y dimensiones del paquete para cada envío.",
    endpoint: "packages",
    roles: logistics,
    create: true,
    columns: [
      { key: "id_envio", label: "Envío" },
      { key: "tipo_empaque", label: "Empaque" },
      { key: "tamano", label: "Tamaño" },
      { key: "peso_kg", label: "Peso kg" },
      { key: "largo_cm", label: "Largo cm" },
      { key: "ancho_cm", label: "Ancho cm" },
      { key: "alto_cm", label: "Alto cm" },
      { key: "estado", label: "Estado" },
    ],
    fields: [
      {
        key: "id_envio",
        label: "Envío",
        type: "select",
        source: "shipping",
        sourceLabel: "id",
        required: true,
      },
      {
        key: "peso",
        label: "Peso kg",
        type: "number",
        step: "0.001",
        min: 0.001,
        required: true,
      },
      {
        key: "tamano",
        label: "Tamaño",
        type: "select",
        options: options(["chico", "mediano", "grande"]),
        required: true,
      },
      {
        key: "tipoEmpacado",
        label: "Tipo",
        type: "select",
        options: options(["caja", "bolsa"]),
        required: true,
      },
      ...["largo", "ancho", "alto"].map((key) => ({
        key,
        label: `${key} (cm)`,
        type: "number" as const,
        step: "0.01",
        min: 0.01,
        required: true,
      })),
    ],
    transform: (d) => ({
      id_envio: Number(d.id_envio),
      paquete: {
        peso: Number(d.peso),
        tamano: d.tamano,
        tipoEmpacado: d.tipoEmpacado,
        medidas: {
          largo: Number(d.largo),
          ancho: Number(d.ancho),
          alto: Number(d.alto),
        },
      },
    }),
  },
  envasado: {
    title: "Envasado de salsas",
    subtitle: "Control de envases, tapas, etiquetas y sellos.",
    endpoint: "bottling",
    roles: ["ADMIN", "INVENTARIO", "LOGISTICA"],
    create: true,
    edit: true,
    columns: [
      { key: "nombre", label: "Producto" },
      { key: "cantidad", label: "Cantidad" },
      { key: "tipo_envase", label: "Envase" },
      { key: "capacidad_ml", label: "ml" },
      { key: "etiqueta_colocada", label: "Etiqueta" },
      { key: "sello_colocado", label: "Sello" },
      { key: "estado", label: "Estado" },
    ],
    fields: [
      {
        key: "id_producto",
        label: "Producto",
        type: "select",
        source: "products",
        required: true,
      },
      { key: "tipo_envase", label: "Tipo de envase", required: true, max: 100 },
      {
        key: "capacidad_ml",
        label: "Capacidad ml (si está confirmada)",
        type: "number",
        min: 1,
      },
      { key: "tipo_tapa", label: "Tipo de tapa", max: 100 },
      {
        key: "cantidad",
        label: "Cantidad",
        type: "number",
        min: 1,
        required: true,
      },
      {
        key: "estado",
        label: "Estado",
        type: "select",
        required: true,
        options: options(["pendiente", "en_proceso", "completado"]),
      },
      {
        key: "etiqueta_colocada",
        label: "Etiqueta colocada",
        type: "checkbox",
      },
      { key: "sello_colocado", label: "Sello colocado", type: "checkbox" },
      {
        key: "observaciones",
        label: "Observaciones",
        type: "textarea",
        max: 2000,
      },
    ],
    transform: (d) => ({
      ...d,
      capacidad_ml: d.capacidad_ml ? Number(d.capacidad_ml) : null,
    }),
  },
  entregas: {
    title: "Validación de entregas",
    subtitle: "Registra la recepción con fecha y evidencia.",
    endpoint: "deliveries",
    roles: logistics,
    edit: true,
    editMethod: "POST",
    columns: [
      { key: "id_envio", label: "Envío" },
      { key: "num_guia", label: "Guía" },
      { key: "estado_envio", label: "Envío" },
      { key: "estado", label: "Validación" },
      { key: "fecha_entrega_real", label: "Fecha de entrega" },
    ],
    fields: [
      {
        key: "destinatario",
        label: "Persona que recibió",
        required: true,
        max: 150,
      },
      {
        key: "fecha_entrega_real",
        label: "Fecha real de entrega",
        type: "datetime-local",
        required: true,
      },
      {
        key: "firma_evidencia",
        label: "URL HTTPS de evidencia",
        required: true,
        max: 1024,
      },
    ],
    transform: (d) => ({
      ...d,
      fecha_entrega_real: new Date(String(d.fecha_entrega_real)).toISOString(),
    }),
  },
  resenas: {
    title: "Reseñas",
    subtitle: "Consulta las opiniones y modera contenido inapropiado.",
    endpoint: "reviews",
    roles: ["ADMIN"],
    remove: true,
    columns: [
      { key: "nombre", label: "Producto" },
      { key: "calificacion", label: "Calificación" },
      { key: "comentario", label: "Comentario" },
      { key: "fecha", label: "Fecha" },
    ],
  },
  devoluciones: {
    title: "Devoluciones de clientes",
    subtitle: "Revisión, recepción y reembolsos confirmados por el procesador.",
    endpoint: "returns",
    roles: ["ADMIN"],
    edit: true,
    editMethod: "PATCH",
    columns: [
      { key: "id", label: "Solicitud" },
      { key: "id_venta", label: "Venta" },
      { key: "nombre", label: "Producto" },
      { key: "cantidad", label: "Cantidad" },
      { key: "motivo", label: "Motivo" },
      { key: "estado", label: "Estado" },
    ],
    editFields: (r) => [
      {
        key: "estado",
        label: "Nuevo estado",
        type: "select",
        required: true,
        options: options(
          (
            {
              solicitada: ["aprobada", "rechazada"],
              aprobada: ["recibida"],
            } as Record<string, string[]>
          )[String(r.estado)] || [],
        ),
      },
      {
        key: "reintegrar",
        label:
          "Autorizar reintegro al inventario al recibir (solo producto apto)",
        type: "checkbox",
      },
    ],
    action: (r) =>
      r.estado === "recibida"
        ? {
            label: "Procesar reembolso",
            path: `returns/${r.id}/refund`,
            method: "POST",
            variant: "send",
          }
        : null,
  },
  garantias: {
    title: "Garantías",
    subtitle: "Revisa solicitudes y registra una resolución.",
    endpoint: "warranties",
    roles: ["ADMIN"],
    edit: true,
    editMethod: "PATCH",
    columns: [
      { key: "id", label: "Solicitud" },
      { key: "id_venta", label: "Venta" },
      { key: "nombre", label: "Producto" },
      { key: "motivo", label: "Motivo" },
      { key: "estado", label: "Estado" },
      { key: "resolucion", label: "Resolución" },
    ],
    editFields: (r) => [
      {
        key: "estado",
        label: "Nuevo estado",
        type: "select",
        required: true,
        options: options(
          (
            {
              solicitada: ["revision", "rechazada"],
              revision: ["aprobada", "rechazada"],
              aprobada: ["resuelta"],
            } as Record<string, string[]>
          )[String(r.estado)] || [],
        ),
      },
      { key: "resolucion", label: "Resolución", type: "textarea", max: 3000 },
    ],
  },
};
