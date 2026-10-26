"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { Profile } from "./profile";
import { Package, MapPin, MessageSquare, Undo2, UserRound } from "lucide-react";
import { useStore } from "@/components/providers";
import { Button } from "@/components/ui/button";

import { api } from "@/lib/api";
import type { Address, RecordData } from "@/types";
import type { Order } from "./types";
import { OrderList } from "./order-list";
import { AddressList } from "./address-list";
import { RequestForm } from "./request-form";
import { MyReviews } from "./reviews";
import { VerificationNotice } from "./verification-notice";

const tabs = [
  { id: "profile", label: "Mis datos", Icon: UserRound },
  { id: "orders", label: "Mis pedidos", Icon: Package },
  { id: "addresses", label: "Mis domicilios", Icon: MapPin },
  { id: "reviews", label: "Mis reseñas", Icon: MessageSquare },
  { id: "requests", label: "Garantías y devoluciones", Icon: Undo2 },
];

export function Account() {
  const { user, loadingUser } = useStore();

  const params = useSearchParams(),
    router = useRouter();
  const chosen = params.get("seccion") || "orders";
  const tab = tabs.some((t) => t.id === chosen) ? chosen : "orders";
  const [orders, setOrders] = useState<Order[]>([]),
    [addresses, setAddresses] = useState<Address[]>([]),
    [requests, setRequests] = useState<RecordData[]>([]),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // Una caída en posventa no impide consultar domicilios ni pedidos.
    const [o, a, r, w] = await Promise.allSettled([
      api<Order[]>("history"),
      api<Address[]>("addresses"),
      api<RecordData[]>("returns"),
      api<RecordData[]>("warranties"),
    ]);

    const failures: Record<string, string> = {};

    if (o.status === "fulfilled") {
      setOrders(o.value);
    } else {
      failures.orders = o.reason.message;
    }

    if (a.status === "fulfilled") {
      setAddresses(a.value);
    } else {
      failures.addresses = a.reason.message;
    }

    const list: RecordData[] = [];

    if (r.status === "fulfilled") {
      list.push(
        ...r.value.map((v) => ({
          ...v,
          tipo: "Devolución",
        })),
      );
    } else {
      failures.requests = r.reason.message;
    }

    if (w.status === "fulfilled") {
      list.push(
        ...w.value.map((v) => ({
          ...v,
          tipo: "Garantía",
        })),
      );
    } else {
      failures.requests = w.reason.message;
    }

    setRequests(list);
    setErrors(failures);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.rol === "CLIENTE" && user.clienteId) {
      void load();
    }
  }, [user?.clienteId, user?.rol, load]);

  if (loadingUser) {
    return (
      <div className="page" role="status">
        Cargando tu cuenta…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <div className="panel p-8 text-center">
          <h1 className="page-title">Mi cuenta</h1>

          <p className="my-4 text-sm text-(--text-secondary)">
            Consulta tus pedidos y domicilios desde tu cuenta.
          </p>

          <Link href="/iniciar-sesion" className="action-link">
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-(--border) pb-5">
        <div>
          <p className="eyebrow mb-1.5">Mi cuenta</p>

          <h1 className="page-title">Tu espacio, a tu manera.</h1>
        </div>
      </div>

      {!user.correo_verificado && <VerificationNotice />}

      {user.rol !== "CLIENTE" ? (
        <Link href="/admin" className="action-link">
          Abrir administración
        </Link>
      ) : (
        <>
          <nav
            aria-label="Secciones de mi cuenta"
            className="mb-5 grid grid-cols-2 border-b border-(--border) sm:flex sm:flex-wrap"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                className="tab text-xs! sm:text-sm!"
                aria-pressed={tab === t.id}
                onClick={() =>
                  router.replace(`/cuenta?seccion=${t.id}`, { scroll: false })
                }
              >
                <t.Icon size={16} className="shrink-0" />
                {t.label}
              </button>
            ))}
          </nav>

          {errors[tab] && (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center gap-3 text-sm text-(--action-danger)"
            >
              {errors[tab]}

              <Button onClick={() => void load()}>Reintentar</Button>
            </div>
          )}

          {tab === "profile" ? (
            <Profile />
          ) : loading ? (
            <p role="status" className="py-5 text-sm">
              Consultando tu información…
            </p>
          ) : (
            <div key={tab}>
              {tab === "orders" ? (
                !errors.orders && (
                  <OrderList orders={orders} onRefresh={() => void load()} />
                )
              ) : tab === "addresses" ? (
                !errors.addresses && (
                  <AddressList
                    addresses={addresses}
                    onSaved={() => void load()}
                  />
                )
              ) : tab === "reviews" ? (
                <MyReviews />
              ) : (
                <div className="grid items-start gap-5 lg:grid-cols-2">
                  <RequestForm orders={orders} onSaved={() => void load()} />

                  <div className="space-y-3">
                    {requests.length ? (
                      requests.map((r) => (
                        <article
                          key={`${r.tipo}-${r.id}`}
                          className="panel p-5"
                        >
                          <div className="flex flex-wrap justify-between gap-2">
                            <h2 className="text-sm font-semibold">
                              {String(r.tipo)} #{String(r.id)}
                            </h2>

                            <StatusBadge state={String(r.estado)} />
                          </div>

                          <p className="mt-3 text-sm">
                            {String(r.nombre)} · {String(r.motivo)}
                          </p>

                          {r.resolucion ? (
                            <p className="mt-2 text-sm text-(--text-secondary)">
                              {String(r.resolucion)}
                            </p>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <p className="p-5 text-sm text-(--text-secondary)">
                        No tienes solicitudes registradas.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
