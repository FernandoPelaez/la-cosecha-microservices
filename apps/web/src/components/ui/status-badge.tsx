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
const styles: Record<
  string,
  { label: string; color: string; Icon: LucideIcon }
> = {
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
export function StatusBadge({ state }: { state: string }) {
  const { Icon, label, color } = styles[state] || {
    label: state.replaceAll("_", " "),
    color: "bg-(--surface-soft) text-(--text-secondary) border-(--border)",
    Icon: Search,
  };
  return (
    <span
      className={`inline-flex gap-1.5 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium border ${color}`}
    >
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
}
