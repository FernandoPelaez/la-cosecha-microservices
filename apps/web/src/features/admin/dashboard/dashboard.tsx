"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { RecordData } from "@/types";
import { Button } from "@/components/ui/button";
import { useStore } from "@/components/providers";
import {
  DashboardSummary,
  type DashboardSummaryMetrics,
} from "./dashboard-summary";
import { DashboardActivity } from "./dashboard-activity";
import { DashboardAlerts } from "./dashboard-alerts";
import {
  DashboardSales,
  type DashboardSalesData,
} from "./dashboard-sales";

interface DashboardData {
  metrics: DashboardSummaryMetrics;
  alerts: RecordData[];
  activity: RecordData[];
  sales: DashboardSalesData | null;
}

interface DashboardDate {
  full: string;
  short: string;
}

export function Dashboard() {
  const { user } = useStore();

  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showOperationLabel, setShowOperationLabel] = useState(true);

  const [currentDate, setCurrentDate] = useState<DashboardDate>({
    full: "",
    short: "",
  });

  const canViewOrders = ["ADMIN", "VENTAS", "LOGISTICA"].includes(
    user?.rol ?? "",
  );

  const canViewInventory = ["ADMIN", "INVENTARIO"].includes(
    user?.rol ?? "",
  );

  // Obtiene la información del Dashboard desde un único endpoint.
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result = await api<DashboardData>("dashboard");

      setData(result);
      setError("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo consultar la información del Dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const now = new Date();

    setCurrentDate({
      full: new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(now),

      short: new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(now),
    });

    void load();
  }, [load]);

  // Oculta "Operación diaria" después de cinco segundos.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowOperationLabel(false);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <section className="min-w-0">
      {/* Encabezado responsive */}
      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0">
          {showOperationLabel && (
            <p className="eyebrow mb-3">
              Operación diaria
            </p>
          )}

          <h1 className="page-title">
            La tienda, en orden.
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-(--text-secondary)">
            {user
              ? `${user.nombre.split(" ")[0]}, estos`
              : "Estos"}{" "}
            son los asuntos que requieren atención.
          </p>
        </div>

        {/* Fecha y botón de actualización */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 lg:shrink-0 lg:justify-end lg:pt-1">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-(--text-secondary) sm:gap-2 sm:text-sm">
            <CalendarDays
              size={15}
              strokeWidth={1.8}
              aria-hidden="true"
              className="shrink-0"
            />

            <span className="whitespace-nowrap sm:hidden">
              {currentDate.short}
            </span>

            <span className="hidden whitespace-nowrap sm:inline">
              {currentDate.full}
            </span>
          </div>

          <Button
            variant="edit"
            size="compact"
            busy={loading}
            onClick={() => void load()}
            className="min-h-8! w-auto shrink-0 gap-1! rounded-md! px-2! py-1! text-[11px]! sm:min-h-9! sm:px-3! sm:text-xs!"
          >
            <RefreshCw
              size={13}
              strokeWidth={2}
              aria-hidden="true"
            />
            Actualizar
          </Button>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="panel p-5 text-sm text-(--action-danger)"
        >
          {error}
        </p>
      ) : !data ? (
        <p
          role="status"
          className="text-sm text-(--text-secondary)"
        >
          Consultando operación…
        </p>
      ) : (
        <>
          {/* Indicadores principales */}
          <div className="mb-7">
            <DashboardSummary metrics={data.metrics} />
          </div>

          {/* Actividad reciente y alertas prioritarias */}
          <div
            className={
              canViewInventory
                ? "grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,0.8fr)]"
                : "min-w-0"
            }
          >
            <DashboardActivity
              activity={data.activity}
              canViewOrders={canViewOrders}
            />

            {canViewInventory && (
              <DashboardAlerts alerts={data.alerts} />
            )}
          </div>

          {/* Gráficas de ventas: visibles únicamente con datos autorizados */}
          {data.sales && (
            <div className="mt-8 min-w-0 sm:mt-10">
              <DashboardSales sales={data.sales} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

