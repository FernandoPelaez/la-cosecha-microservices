import {
  Clock3,
  CircleCheck,
  PackageCheck,
  Package,
  Truck,
  CircleX,
  RotateCcw,
  Search,
  type LucideIcon,
} from "lucide-react";

interface StatusStyle {
  label: string;
  color: string;
  Icon: LucideIcon;
}

// Estilos originales utilizados por los demás módulos.
const styles: Record<string, StatusStyle> = {
  pendiente: {
    label: "Pendiente",
    color: "bg-amber-50 text-amber-900 border-amber-200",
    Icon: Clock3,
  },
  solicitada: {
    label: "Solicitada",
    color: "bg-amber-50 text-amber-900 border-amber-200",
    Icon: Clock3,
  },
  pagado: {
    label: "Pagado",
    color: "bg-green-50 text-green-800 border-green-200",
    Icon: CircleCheck,
  },
  capturado: {
    label: "Pago confirmado",
    color: "bg-green-50 text-green-800 border-green-200",
    Icon: CircleCheck,
  },
  aprobada: {
    label: "Aprobada",
    color: "bg-green-50 text-green-800 border-green-200",
    Icon: CircleCheck,
  },
  preparacion: {
    label: "En preparación",
    color: "bg-orange-50 text-orange-900 border-orange-200",
    Icon: Package,
  },
  preparando: {
    label: "Preparando",
    color: "bg-orange-50 text-orange-900 border-orange-200",
    Icon: Package,
  },
  en_proceso: {
    label: "En proceso",
    color: "bg-orange-50 text-orange-900 border-orange-200",
    Icon: Package,
  },
  enviado: {
    label: "Enviado",
    color: "bg-blue-50 text-blue-800 border-blue-200",
    Icon: Truck,
  },
  en_transito: {
    label: "En tránsito",
    color: "bg-blue-50 text-blue-800 border-blue-200",
    Icon: Truck,
  },
  entregado: {
    label: "Entregado",
    color: "bg-emerald-900 text-white border-emerald-900",
    Icon: PackageCheck,
  },
  validada: {
    label: "Validada",
    color: "bg-emerald-900 text-white border-emerald-900",
    Icon: PackageCheck,
  },
  completado: {
    label: "Completado",
    color: "bg-emerald-900 text-white border-emerald-900",
    Icon: PackageCheck,
  },
  cancelado: {
    label: "Cancelado",
    color: "bg-red-50 text-red-800 border-red-200",
    Icon: CircleX,
  },
  cancelada: {
    label: "Cancelada",
    color: "bg-red-50 text-red-800 border-red-200",
    Icon: CircleX,
  },
  rechazado: {
    label: "Rechazado",
    color: "bg-red-50 text-red-800 border-red-200",
    Icon: CircleX,
  },
  rechazada: {
    label: "Rechazada",
    color: "bg-red-50 text-red-800 border-red-200",
    Icon: CircleX,
  },
  reembolsado: {
    label: "Reembolsado",
    color: "bg-purple-50 text-purple-800 border-purple-200",
    Icon: RotateCcw,
  },
  reembolsada: {
    label: "Reembolsada",
    color: "bg-purple-50 text-purple-800 border-purple-200",
    Icon: RotateCcw,
  },
};

// Paleta aprobada para el módulo Mis pedidos.
const ORDER_COLORS = {
  pending:
    "bg-[#FEF9C3] text-[#854D0E] border-[#FDE047]",
  paid:
    "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]",
  preparing:
    "bg-[#FFEDD5] text-[#9A3412] border-[#FDBA74]",
  shipped:
    "bg-[#DBEAFE] text-[#1E40AF] border-[#93C5FD]",
  delivered:
    "bg-[#2F5D43] text-white border-[#2F5D43]",
  cancelled:
    "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]",
} as const;

// Los estados equivalentes comparten un mismo color.
const orderColors: Record<string, string> = {
  pendiente: ORDER_COLORS.pending,
  solicitada: ORDER_COLORS.pending,

  pagado: ORDER_COLORS.paid,
  capturado: ORDER_COLORS.paid,
  aprobada: ORDER_COLORS.paid,

  preparacion: ORDER_COLORS.preparing,
  preparando: ORDER_COLORS.preparing,
  en_proceso: ORDER_COLORS.preparing,

  enviado: ORDER_COLORS.shipped,
  en_transito: ORDER_COLORS.shipped,

  entregado: ORDER_COLORS.delivered,
  validada: ORDER_COLORS.delivered,
  completado: ORDER_COLORS.delivered,

  cancelado: ORDER_COLORS.cancelled,
  cancelada: ORDER_COLORS.cancelled,
  rechazado: ORDER_COLORS.cancelled,
  rechazada: ORDER_COLORS.cancelled,
};

interface StatusBadgeProps {
  state: string;
  variant?: "default" | "orders";
}

export function StatusBadge({
  state,
  variant = "default",
}: StatusBadgeProps) {
  const style = styles[state] || {
    label: state.replaceAll("_", " "),
    color:
      "bg-(--surface-soft) text-(--text-secondary) border-(--border)",
    Icon: Search,
  };

  const { Icon, label } = style;

  // Solo la variante "orders" utiliza la nueva paleta.
  const color =
    variant === "orders"
      ? orderColors[state] || style.color
      : style.color;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium ${color}`}
    >
      <Icon
        size={12}
        aria-hidden="true"
      />

      {label}
    </span>
  );
}

