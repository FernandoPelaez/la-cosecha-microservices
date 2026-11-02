"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Address, RecordData } from "@/types";
import type { Order } from "./types";
import { Profile } from "./profile";
import { OrderList } from "./order-list";
import { AddressList } from "./address-list";
import { RequestForm } from "./request-form";
import { RequestList } from "./request-list";
import { MyReviews } from "./reviews";
import { VerificationNotice } from "./verification-notice";

const sections = [
  "profile",
  "orders",
  "addresses",
  "reviews",
  "requests",
];

function RequestHeaderIcon() {
  const primary = "var(--brand-secondary)";
  const detail = "var(--brand-cream)";

  return (
    <svg
      width={40}
      height={40}
      viewBox="0 0 64 64"
      fill="none"
      className="mt-1 size-9 shrink-0 sm:size-10"
      aria-hidden="true"
    >
      {/* Flecha circular superior */}
      <path
        d="M8.5 23.5C12.2 13.3 21.3 7 32 7c10.3 0 19.3 6.3 23 15.6"
        stroke={primary}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      <path
        d="m47.5 18.2 8.2 5.3.6-10"
        stroke={primary}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Flecha circular inferior */}
      <path
        d="M55.5 40.5C51.8 50.7 42.7 57 32 57c-10.3 0-19.3-6.3-23-15.6"
        stroke={primary}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      <path
        d="m16.5 45.8-8.2-5.3-.6 10"
        stroke={primary}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Caja central */}
      <path
        d="m20 25 12-4 12 4-12 4z"
        fill={primary}
      />

      <path
        d="m19.5 34 12.5 6 12.5-6v12L32 52l-12.5-6z"
        fill={primary}
      />

      <path
        d="m32 40 0 12"
        stroke={detail}
        strokeWidth="1.5"
      />

      <path
        d="m20 25-7.6 7.3 12.9 6.2L32 29z"
        fill={primary}
        stroke={detail}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      <path
        d="m44 25 7.6 7.3-12.9 6.2L32 29z"
        fill={primary}
        stroke={detail}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Account() {
  const { user, loadingUser } = useStore();
  const params = useSearchParams();
  const chosen = params.get("seccion") || "orders";
  const tab = sections.includes(chosen) ? chosen : "orders";
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [requests, setRequests] = useState<RecordData[]>([]);
  const [errors, setErrors] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] = useState(true);

  /**
   * Cargar la información de la cuenta.
   *
   * Las consultas se ejecutan de forma independiente
   * para que un error en un servicio no impida
   * consultar los demás módulos.
   */
  const load = useCallback(async () => {
    setLoading(true);

    const [o, a, r, w] = await Promise.allSettled([
      api<Order[]>("history"),
      api<Address[]>("addresses"),
      api<RecordData[]>("returns"),
      api<RecordData[]>("warranties"),
    ]);

    const failures: Record<string, string> = {};

    // Historial de pedidos.
    if (o.status === "fulfilled") {
      setOrders(o.value);
    } else {
      failures.orders = o.reason.message;
    }

    // Domicilios.
    if (a.status === "fulfilled") {
      setAddresses(a.value);
    } else {
      failures.addresses = a.reason.message;
    }

    // Unificar devoluciones y garantías.
    const list: RecordData[] = [];

    if (r.status === "fulfilled") {
      list.push(
        ...r.value.map((value) => ({
          ...value,
          tipo: "Devolución",
        })),
      );
    } else {
      failures.requests = r.reason.message;
    }

    if (w.status === "fulfilled") {
      list.push(
        ...w.value.map((value) => ({
          ...value,
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

  // Consultar información únicamente para clientes.
  useEffect(() => {
    if (user?.rol === "CLIENTE" && user.clienteId) {
      void load();
    }
  }, [user?.clienteId, user?.rol, load]);

  // Esperar la sesión del usuario.
  if (loadingUser) {
    return (
      <div className="page" role="status">
        Cargando tu cuenta…
      </div>
    );
  }

  // Usuario sin sesión.
  if (!user) {
    return (
      <div className="page">
        <div className="panel p-8 text-center">
          <h1 className="page-title">
            Mi cuenta
          </h1>

          <p className="my-4 text-sm text-(--text-secondary)">
            Consulta tus pedidos y domicilios desde tu cuenta.
          </p>

          <Link
            href="/iniciar-sesion"
            className="action-link"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Aviso de verificación del correo */}
      {!user.correo_verificado && (
        <VerificationNotice />
      )}

      {/* Acceso de administración */}
      {user.rol !== "CLIENTE" ? (
        <Link
          href="/admin"
          className="action-link"
        >
          Abrir administración
        </Link>
      ) : (
        <>
          {/* Errores específicos de cada módulo */}
          {errors[tab] && (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center gap-3 text-sm text-(--action-danger)"
            >
              {errors[tab]}

              <Button onClick={() => void load()}>
                Reintentar
              </Button>
            </div>
          )}

          {/* Datos personales */}
          {tab === "profile" ? (
            <Profile />
          ) : loading ? (
            <p
              role="status"
              className="py-5 text-sm"
            >
              Consultando tu información…
            </p>
          ) : (
            <div key={tab}>
              {/* Historial de pedidos */}
              {tab === "orders" ? (
                !errors.orders && (
                  <OrderList
                    orders={orders}
                    onRefresh={() => void load()}
                  />
                )
              ) : tab === "addresses" ? (
                /* Domicilios */
                !errors.addresses && (
                  <AddressList
                    addresses={addresses}
                    onSaved={() => void load()}
                  />
                )
              ) : tab === "reviews" ? (
                /* Reseñas */
                <MyReviews />
              ) : (
                /* Garantías y devoluciones */
                <section
                  aria-labelledby="requests-title"
                  className="min-w-0"
                >
                  {/* Encabezado principal */}
                  <header className="mb-7 flex min-w-0 items-start gap-3 border-b border-(--border) pb-6 sm:gap-4">
                    <RequestHeaderIcon />

                    <div className="min-w-0">
                      <h1
                        id="requests-title"
                        className="font-display text-2xl text-(--brand-secondary) sm:text-3xl lg:text-4xl"
                      >
                        Garantías y devoluciones
                      </h1>

                      <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
                        Registra una solicitud o consulta el estado
                        de tus garantías y devoluciones.
                      </p>
                    </div>
                  </header>

                  {/* Formulario de solicitudes */}
                  <RequestForm
                    orders={orders}
                    onSaved={() => void load()}
                  />

                  {/* Historial de solicitudes */}
                  <RequestList
                    requests={requests}
                  />
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

