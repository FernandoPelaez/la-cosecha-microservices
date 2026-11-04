import Link from "next/link";

import {
  ArrowUpRight,
  Package,
  TriangleAlert,
} from "lucide-react";

import type { RecordData } from "@/types";

interface DashboardAlertsProps {
  alerts: RecordData[];
}

// Prioriza los productos agotados y los que están bajo el mínimo.
function alertPriority(alert: RecordData): number {
  const stock = Number(alert.stock_actual);
  const minimum = Number(alert.stock_minimo);

  if (stock === 0) return 0;
  if (stock < minimum) return 1;
  if (stock === minimum) return 2;

  return 3;
}

function alertDescription(alert: RecordData): string {
  const stock = Number(alert.stock_actual);
  const minimum = Number(alert.stock_minimo);
  const maximum = Number(alert.stock_maximo);

  if (!Number.isFinite(stock)) {
    return String(alert.alerta ?? "Revisar inventario");
  }

  if (stock === 0) {
    return "Sin existencias";
  }

  if (stock < minimum) {
    return `Por debajo del mínimo (${stock})`;
  }

  if (stock === minimum) {
    return `Stock mínimo (${stock})`;
  }

  if (stock >= maximum) {
    return `Stock máximo (${stock})`;
  }

  return String(alert.alerta ?? "Revisar inventario");
}

export function DashboardAlerts({
  alerts,
}: DashboardAlertsProps) {
  // Muestra primero las tres alertas más importantes.
  const visibleAlerts = [...alerts]
    .sort((a, b) => alertPriority(a) - alertPriority(b))
    .slice(0, 3);

  return (
    <section
      aria-labelledby="dashboard-alerts-title"
      className="min-w-0 lg:border-l lg:border-(--border) lg:pl-7"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2
          id="dashboard-alerts-title"
          className="border-l-4 border-(--brand-primary) pl-3 text-lg font-semibold"
        >
          Por atender
        </h2>

        <span className="text-base font-semibold tabular-nums text-(--text-secondary)">
          {alerts.length}
        </span>
      </div>

      {visibleAlerts.length === 0 ? (
        <p className="py-5 text-sm text-(--text-secondary)">
          No hay alertas de inventario pendientes.
        </p>
      ) : (
        <ul className="space-y-5">
          {visibleAlerts.map((alert) => (
            <li
              key={String(alert.id)}
              className="flex min-w-0 items-start gap-3"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-(--brand-orange)">
                <TriangleAlert
                  size={20}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </span>

              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug">
                  {String(alert.nombre)}
                </p>

                <p className="mt-1 text-xs leading-relaxed text-(--action-danger)">
                  {alertDescription(alert)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-(--border) pt-4">
        <Link
          href="/admin/inventario"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-(--action-edit)"
        >
          <Package size={19} aria-hidden="true" />
          Consultar inventario
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
