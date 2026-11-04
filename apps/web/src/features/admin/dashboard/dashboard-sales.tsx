"use client";

import { useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { money } from "@/lib/api";

export interface DashboardSalesPoint {
  period: string;
  total: number;
}

export interface DashboardSalesData {
  daily: DashboardSalesPoint[];
  weekly: DashboardSalesPoint[];
  monthly: DashboardSalesPoint[];
}

interface DashboardSalesProps {
  sales: DashboardSalesData | null;
}

type SalesPeriod = "weekly" | "daily";

const monthColors = [
  "var(--brand-primary)",
  "var(--action-buy)",
  "var(--brand-orange)",
];

const shortDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const fullDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("es-MX", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const compactNumberFormatter = new Intl.NumberFormat("es-MX", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function parseDate(period: string): Date {
  return new Date(`${period}T00:00:00.000Z`);
}

function formatWeek(period: string): string {
  const start = parseDate(period);
  const end = new Date(start);

  end.setUTCDate(end.getUTCDate() + 6);

  return `${shortDateFormatter.format(start)} – ${shortDateFormatter.format(end)}`;
}

// Determina el color según el rendimiento relativo de cada periodo.
function getSalesColor(
  value: number,
  minimum: number,
  maximum: number,
): string {
  if (minimum === maximum) {
    return "var(--brand-primary)";
  }

  if (value === minimum) {
    return "var(--action-danger)";
  }

  if (value === maximum) {
    return "var(--action-buy)";
  }

  const midpoint = (minimum + maximum) / 2;

  return value < midpoint
    ? "var(--brand-orange)"
    : "var(--action-edit)";
}

function SalesBarChart({ sales }: { sales: DashboardSalesData }) {
  const [period, setPeriod] = useState<SalesPeriod>("weekly");
  const source = period === "weekly" ? sales.weekly : sales.daily;
  const values = source.map((item) => item.total);
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 0;

  const chartData = source.map((item) => ({
    ...item,
    label:
      period === "weekly"
        ? shortDateFormatter.format(parseDate(item.period))
        : String(parseDate(item.period).getUTCDate()).padStart(2, "0"),
    color: getSalesColor(item.total, minimum, maximum),
  }));

  const hasSales = chartData.some((item) => item.total > 0);
  const total = source.reduce((sum, item) => sum + item.total, 0);

  return (
    <section
      aria-labelledby="dashboard-weekly-sales"
      className="min-w-0 rounded-xl border border-(--border) bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="dashboard-weekly-sales"
            className="text-base font-semibold sm:text-lg"
          >
            Ventas por {period === "weekly" ? "semana" : "día"}
          </h2>

          <p className="mt-1 text-xs text-(--text-secondary)">
            {period === "weekly"
              ? "Últimas 4 semanas completas"
              : "Últimos 7 días, incluyendo hoy"}
          </p>
        </div>

        <div
          role="group"
          aria-label="Periodo de ventas"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-(--border) bg-(--surface-soft)/40 p-1"
        >
          <button
            type="button"
            aria-pressed={period === "weekly"}
            onClick={() => setPeriod("weekly")}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--action-edit) ${
              period === "weekly"
                ? "bg-(--action-edit) text-white"
                : "text-(--text-secondary)"
            }`}
          >
            Semana
          </button>

          <button
            type="button"
            aria-pressed={period === "daily"}
            onClick={() => setPeriod("daily")}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--action-edit) ${
              period === "daily"
                ? "bg-(--action-edit) text-white"
                : "text-(--text-secondary)"
            }`}
          >
            Día
          </button>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs text-(--text-secondary)">
          Total del periodo
        </p>

        <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
          {money(total)}
        </p>
      </div>

      {hasSales ? (
        <div
          className="mt-5 h-55 min-w-0 sm:h-65"
          role="img"
          aria-label={`Gráfica de ventas por ${period === "weekly" ? "semana" : "día"}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 10,
                right: 5,
                bottom: 0,
                left: -12,
              }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 4"
              />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                interval={0}
                tickMargin={10}
                tick={{
                  fontSize: 10,
                  fill: "var(--text-secondary)",
                }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                width={65}
                tick={{
                  fontSize: 10,
                  fill: "var(--text-secondary)",
                }}
                tickFormatter={(value: number) =>
                  `$${compactNumberFormatter.format(value)}`
                }
              />

              <Tooltip
                cursor={{
                  fill: "var(--surface-soft)",
                  fillOpacity: 0.5,
                }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelFormatter={(label) => {
                  const selected = chartData.find(
                    (item) => item.label === String(label),
                  );

                  if (!selected) return String(label ?? "");

                  return period === "weekly"
                    ? formatWeek(selected.period)
                    : fullDateFormatter.format(
                        parseDate(selected.period),
                      );
                }}
                formatter={(value) => [
                  money(Number(value ?? 0)),
                  "Ventas",
                ]}
              />

              <Bar
                dataKey="total"
                name="Ventas"
                maxBarSize={42}
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              >
                {chartData.map((item) => (
                  <Cell
                    key={item.period}
                    fill={item.color}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-5 flex h-55 items-center justify-center px-4 text-center text-sm text-(--text-secondary) sm:h-65">
          No se registraron ventas en este periodo.
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-(--text-secondary)">
        Los colores comparan el rendimiento entre los periodos mostrados.
      </p>
    </section>
  );
}

function MonthlySalesChart({
  monthly,
}: {
  monthly: DashboardSalesPoint[];
}) {
  const chartData = monthly.map((item, index) => ({
    ...item,
    label: monthFormatter.format(parseDate(item.period)),
    color: monthColors[index % monthColors.length],
  }));

  const total = chartData.reduce(
    (sum, item) => sum + item.total,
    0,
  );

  const hasSales = total > 0;
  const visibleData = chartData.filter(
    (item) => item.total > 0,
  );

  return (
    <section
      aria-labelledby="dashboard-monthly-sales"
      className="min-w-0 rounded-xl border border-(--border) bg-white p-4 sm:p-5"
    >
      <div>
        <h2
          id="dashboard-monthly-sales"
          className="text-base font-semibold sm:text-lg"
        >
          Ventas mensuales
        </h2>

        <p className="mt-1 text-xs text-(--text-secondary)">
          Distribución de los últimos 3 meses completos
        </p>
      </div>

      {hasSales ? (
        <div className="relative mx-auto mt-3 h-55 w-full max-w-90 sm:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={visibleData}
                dataKey="total"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="88%"
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {visibleData.map((item) => (
                  <Cell
                    key={item.period}
                    fill={item.color}
                  />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(value) => [
                  money(Number(value ?? 0)),
                  "Ventas",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] text-(--text-secondary)">
              Total del periodo
            </span>

            <strong className="mt-1 max-w-40 text-sm font-semibold tabular-nums sm:text-base">
              {money(total)}
            </strong>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex h-55 items-center justify-center px-4 text-center text-sm text-(--text-secondary) sm:h-60">
          No se registraron ventas en los últimos tres meses completos.
        </div>
      )}

      <ul className="mt-4 space-y-3 border-t border-(--border) pt-4">
        {chartData.map((item) => {
          const percentage =
            total > 0 ? (item.total / total) * 100 : 0;

          return (
            <li
              key={item.period}
              className="flex min-w-0 items-center justify-between gap-3 text-xs sm:text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />

                <span className="capitalize text-(--text-secondary)">
                  {item.label}
                </span>

                <span className="text-(--text-secondary)">
                  {percentage.toFixed(0)}%
                </span>
              </div>

              <strong className="text-right font-semibold tabular-nums">
                {money(item.total)}
              </strong>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Coordina ambas gráficas sin realizar peticiones HTTP.
export function DashboardSales({
  sales,
}: DashboardSalesProps) {
  if (!sales) return null;

  return (
    <section
      aria-label="Estadísticas de ventas"
      className="min-w-0"
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-6">
        <SalesBarChart sales={sales} />

        <MonthlySalesChart monthly={sales.monthly} />
      </div>
    </section>
  );
}

