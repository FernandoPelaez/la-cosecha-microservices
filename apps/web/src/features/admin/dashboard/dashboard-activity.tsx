import Link from "next/link";

import {
  ArrowUpRight,
  PackageMinus,
  PackagePlus,
} from "lucide-react";

import type { RecordData } from "@/types";

interface DashboardActivityProps {
  activity: RecordData[];
  canViewOrders: boolean;
}

const operations: Record<string, string> = {
  entrada: "Entrada de inventario",
  salida: "Salida de inventario",
  ajuste_entrada: "Ajuste de entrada",
  ajuste_salida: "Ajuste de salida",
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Mazatlan",
});

const numberFormatter = new Intl.NumberFormat("es-MX");

function formatDate(value: unknown): string {
  if (!value) return "Fecha no disponible";

  const date = new Date(String(value));

  return Number.isNaN(date.getTime())
    ? String(value)
    : dateFormatter.format(date);
}

export function DashboardActivity({
  activity,
  canViewOrders,
}: DashboardActivityProps) {
  return (
    <section
      aria-labelledby="dashboard-activity-title"
      className="min-w-0"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="dashboard-activity-title"
          className="border-l-4 border-(--brand-primary) pl-3 text-lg font-semibold"
        >
          Actividad reciente
        </h2>

        {canViewOrders && (
          <Link
            href="/admin/pedidos"
            className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-(--action-edit) sm:text-sm"
          >
            Ver pedidos
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,0.75fr)_auto] gap-4 border-b border-(--border) px-2 pb-3 text-xs font-semibold text-(--text-secondary) md:grid">
        <span>OPERACIÓN</span>
        <span>FECHA</span>
        <span>DETALLE</span>
      </div>

      {activity.length === 0 ? (
        <p className="py-6 text-sm text-(--text-secondary)">
          No hay movimientos recientes registrados.
        </p>
      ) : (
        <ul className="divide-y divide-(--border)">
          {activity.slice(0, 5).map((item) => {
            const type = String(item.tipo ?? "");

            const isIncoming =
              type === "entrada" ||
              type === "ajuste_entrada";

            const quantity = Number(item.cantidad);
            const validQuantity = Number.isFinite(quantity);

            const Icon = isIncoming
              ? PackagePlus
              : PackageMinus;

            const quantityText = validQuantity
              ? `${isIncoming ? "+" : "−"}${numberFormatter.format(quantity)} ${
                  quantity === 1 ? "unidad" : "unidades"
                }`
              : "Sin cantidad";

            const date = String(item.fecha ?? "");

            return (
              <li
                key={String(item.id)}
                className="grid min-w-0 gap-2 px-1 py-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.75fr)_auto] md:items-center md:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-(--surface-soft) ${
                      isIncoming
                        ? "text-(--action-buy)"
                        : "text-(--action-danger)"
                    }`}
                  >
                    <Icon
                      size={19}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {operations[type] ??
                        "Movimiento de inventario"}
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-(--text-secondary)">
                      {String(item.nombre ?? "Producto")}
                      {item.motivo
                        ? ` · ${String(item.motivo)}`
                        : ""}
                    </p>
                  </div>
                </div>

                <time
                  dateTime={date}
                  className="hidden text-xs text-(--text-secondary) md:block"
                >
                  {formatDate(item.fecha)}
                </time>

                <div className="flex items-center justify-between gap-3 pl-13 md:justify-end md:pl-0">
                  <time
                    dateTime={date}
                    className="text-xs text-(--text-secondary) md:hidden"
                  >
                    {formatDate(item.fecha)}
                  </time>

                  <strong
                    className={`whitespace-nowrap text-xs font-semibold tabular-nums sm:text-sm ${
                      isIncoming
                        ? "text-(--action-buy)"
                        : "text-(--action-danger)"
                    }`}
                  >
                    {quantityText}
                  </strong>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
