"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  PackageCheck,
  TriangleAlert,
  RefreshCw,
} from "lucide-react";
import { api, money } from "@/lib/api";
import type { RecordData } from "@/types";
import { Button } from "@/components/ui/button";
import { useStore } from "@/components/providers";
interface DashboardData {
  alerts: RecordData[];
  orders: RecordData[];
  activity: RecordData[];
}
export function Dashboard() {
  const { user } = useStore();
  const [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      setData(await api<DashboardData>("dashboard"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Operación diaria</p>
          <h1 className="page-title">La tienda, en orden.</h1>
          <p className="mt-2 text-sm text-(--text-secondary)">
            {user ? `${user.nombre.split(" ")[0]}, estos` : "Estos"} son los
            asuntos que requieren atención.
          </p>
        </div>
        <Button variant="edit" busy={loading} onClick={() => void load()}>
          <RefreshCw size={16} />
          Actualizar
        </Button>
      </div>
      {error ? (
        <p role="alert" className="panel p-5 text-sm text-(--action-danger)">
          {error}
        </p>
      ) : !data ? (
        <p role="status">Consultando operación…</p>
      ) : (
        <>
          <div className="panel grid overflow-hidden lg:grid-cols-[1.3fr_1fr]">
            <section className="min-w-0 p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <PackageCheck size={19} className="text-(--action-buy)" />
                  Pedidos por preparar
                </h2>
                {["ADMIN", "VENTAS", "LOGISTICA"].includes(user?.rol || "") && (
                  <Link
                    href="/admin/pedidos"
                    className="flex min-h-11 items-center gap-1 text-xs text-(--action-edit)"
                  >
                    Ver pedidos
                    <ArrowUpRight size={15} />
                  </Link>
                )}
              </div>
              {data.orders.length ? (
                <ul className="divide-y divide-(--border)">
                  {data.orders.map((o) => (
                    <li
                      key={String(o.id)}
                      className="flex flex-wrap items-center justify-between gap-3 py-4"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          Pedido #{String(o.id)}
                        </p>
                        <p className="mt-1 text-xs text-(--text-secondary)">
                          {String(o.fecha).slice(0, 10)} ·{" "}
                          {String(o.nombre || "")}
                        </p>
                      </div>
                      <div className="text-right">
                        <strong className="text-sm">
                          {money(String(o.total))}
                        </strong>
                        <p className="mt-1 text-[11px] capitalize text-(--action-buy)">
                          {String(o.estado)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-5 text-sm text-(--text-secondary)">
                  No hay pedidos pendientes de preparación.
                </p>
              )}
            </section>
            <section className="border-t border-(--border) bg-(--surface-soft)/50 p-5 sm:p-6 lg:border-l lg:border-t-0">
              <h2 className="mb-5 flex items-center gap-2 text-base font-semibold">
                <TriangleAlert size={19} className="text-(--brand-orange)" />
                Atención al inventario
              </h2>
              {data.alerts.length ? (
                <ul className="divide-y divide-(--border)">
                  {data.alerts.slice(0, 6).map((a) => (
                    <li
                      key={String(a.id)}
                      className="flex justify-between gap-3 py-3 text-sm"
                    >
                      <span>{String(a.nombre)}</span>
                      <span className="shrink-0 text-right">
                        <strong>{String(a.stock_actual)}</strong>
                        <small className="block text-[10px] text-(--brand-primary)">
                          {String(a.alerta)}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-5 text-sm text-(--text-secondary)">
                  Las existencias están dentro de los límites establecidos.
                </p>
              )}
              {["ADMIN", "INVENTARIO"].includes(user?.rol || "") && (
                <Link
                  href="/admin/inventario"
                  className="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-(--action-edit)"
                >
                  Consultar inventario
                  <ArrowUpRight size={15} />
                </Link>
              )}
            </section>
          </div>
          {data.activity.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 text-sm font-semibold">Actividad reciente</h2>
              <ul className="divide-y divide-(--border)">
                {data.activity.slice(0, 6).map((a) => (
                  <li
                    key={String(a.id)}
                    className="flex flex-wrap justify-between gap-2 py-3 text-xs"
                  >
                    <span>
                      {String(a.nombre)} · {String(a.motivo)}
                    </span>
                    <time className="text-(--text-muted)">
                      {String(a.fecha)}
                    </time>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </section>
  );
}
