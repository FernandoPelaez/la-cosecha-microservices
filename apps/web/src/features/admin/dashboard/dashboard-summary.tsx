import {
  Boxes,
  Coins,
  Package,
  ShoppingBag,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { money } from "@/lib/api";

// Los valores nulos representan indicadores todavía no disponibles.
export interface DashboardSummaryMetrics {
  ordersToPrepare: number | null;
  inventoryAlerts: number | null;
  movementsToday: number | null;
  purchasesInProcess: number | null;
  salesToday: number | null;
}

interface DashboardSummaryProps {
  metrics: DashboardSummaryMetrics;
}

interface SummaryIndicator {
  key: keyof DashboardSummaryMetrics;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  currency?: boolean;
}

// Configuración visual centralizada de los indicadores.
const indicators: SummaryIndicator[] = [
  {
    key: "ordersToPrepare",
    title: "Pedidos por preparar",
    description: "Listos para producción",
    icon: Package,
    iconColor: "text-(--brand-primary)",
  },
  {
    key: "inventoryAlerts",
    title: "Alertas de inventario",
    description: "Productos por atender",
    icon: TriangleAlert,
    iconColor: "text-(--brand-orange)",
  },
  {
    key: "movementsToday",
    title: "Movimientos hoy",
    description: "Entradas y salidas de inventario",
    icon: Boxes,
    iconColor: "text-(--action-buy)",
  },
  {
    key: "purchasesInProcess",
    title: "Compras en proceso",
    description: "Órdenes registradas",
    icon: ShoppingBag,
    iconColor: "text-(--action-buy)",
  },
  {
    key: "salesToday",
    title: "Ventas del día",
    description: "MXN · cobrado hoy",
    icon: Coins,
    iconColor: "text-(--brand-primary)",
    currency: true,
  },
];

const numberFormatter = new Intl.NumberFormat("es-MX");

export function DashboardSummary({
  metrics,
}: DashboardSummaryProps) {
  return (
    <section
      aria-label="Resumen de operación diaria"
      className="w-full"
    >
      <dl
        className="
          grid grid-cols-2
          gap-x-3 gap-y-6
          border-b border-(--border)
          pb-6
          sm:gap-x-5
          md:grid-cols-3
          xl:grid-cols-5
          xl:gap-x-0
        "
      >
        {indicators.map((indicator) => {
          const Icon = indicator.icon;
          const value = metrics[indicator.key];

          const available =
            value !== null && Number.isFinite(value);

          const formattedValue = !available
            ? "—"
            : indicator.currency
              ? money(value)
              : numberFormatter.format(value);

          return (
            <div
              key={indicator.key}
              className="
                flex min-w-0 items-start
                gap-2
                sm:gap-3
                xl:border-l
                xl:border-(--border)
                xl:px-5
                xl:first:border-l-0
                xl:first:pl-0
              "
            >
              <Icon
                aria-hidden="true"
                size={23}
                strokeWidth={1.8}
                className={`
                  mt-0.5 shrink-0
                  ${indicator.iconColor}
                `}
              />

              <div className="min-w-0">
                <dt
                  className="
                    text-xs font-semibold
                    leading-snug
                    sm:text-sm
                  "
                >
                  {indicator.title}
                </dt>

                <dd
                  className={`
                    mt-1 font-semibold
                    leading-tight
                    tracking-tight
                    tabular-nums
                    ${
                      indicator.currency
                        ? "text-lg sm:text-2xl"
                        : "text-2xl sm:text-3xl"
                    }
                  `}
                >
                  {formattedValue}
                </dd>

                <p
                  className="
                    mt-1 text-[11px]
                    leading-relaxed
                    text-(--text-secondary)
                    sm:text-xs
                  "
                >
                  {available
                    ? indicator.description
                    : "Sin datos disponibles"}
                </p>
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
