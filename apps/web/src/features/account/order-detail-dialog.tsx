"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  CreditCard,
  FileDown,
  Mail,
  MapPin,
  Package,
  Truck,
  XCircle,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { money } from "@/lib/api";
import type { Order, OrderLine } from "./types";

const PRODUCTS_PER_PAGE = 3;

type BusyAction = "payment" | "email" | "cancel" | null;

interface OrderDetailDialogProps {
  order: Order;
  busy: BusyAction;
  formatDate: (value: string) => string;
  onClose: () => void;
  onPay: (id: number) => void;
  onCancel: (id: number) => void;
  onEmail: (id: number) => void;
}

// Presenta cada producto sin tarjetas individuales.
function OrderProductRow({ item }: { item: OrderLine }) {
  const discount = Number(item.descuento_unitario);
  const unitPrice = Number(item.precio_unitario) - discount;
  const total = unitPrice * item.cantidad;

  return (
    <li className="flex min-w-0 items-center gap-3 py-3 sm:gap-4 sm:py-4">
      <div className="flex h-17 w-15 shrink-0 items-center justify-center rounded-lg border border-(--border) bg-(--surface-soft)">
        <Image
          src={item.imagen || "/logo/la-cosecha.png"}
          alt={item.nombre}
          width={52}
          height={60}
          className="h-15 w-13 object-contain"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold wrap-break-word text-(--text-primary)">
          {item.nombre}
        </p>

        <p className="mt-1 text-xs text-(--text-secondary)">
          {item.cantidad} × {money(unitPrice)}
        </p>

        {discount > 0 && (
          <p className="mt-1 text-xs text-(--brand-secondary)">
            Descuento por unidad: {money(discount)}
          </p>
        )}
      </div>

      <strong className="shrink-0 text-right text-sm font-semibold whitespace-nowrap text-(--text-primary)">
        {money(total)}
      </strong>
    </li>
  );
}

// Paginación interna: máximo tres productos por página.
function OrderProducts({ items }: { items: OrderLine[] }) {
  const [requestedPage, setRequestedPage] = useState(0);

  const totalPages = Math.ceil(
    items.length / PRODUCTS_PER_PAGE,
  );

  const page = Math.min(
    requestedPage,
    Math.max(totalPages - 1, 0),
  );

  const start = page * PRODUCTS_PER_PAGE;

  const visibleItems = items.slice(
    start,
    start + PRODUCTS_PER_PAGE,
  );

  return (
    <>
      <ul
        className={`mt-2 divide-y divide-(--border) ${
          totalPages > 1 ? "lg:min-h-75" : ""
        }`}
      >
        {visibleItems.map((item) => (
          <OrderProductRow
            key={item.id_producto}
            item={item}
          />
        ))}
      </ul>

      {totalPages > 1 && (
        <>
          <nav
            aria-label="Paginación de productos"
            className="mt-2 flex flex-wrap items-center justify-center gap-1 pb-1"
          >
            {Array.from(
              { length: totalPages },
              (_, index) => {
                const isActive = index === page;

                const firstProduct =
                  index * PRODUCTS_PER_PAGE + 1;

                const lastProduct = Math.min(
                  (index + 1) * PRODUCTS_PER_PAGE,
                  items.length,
                );

                return (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Ver productos ${firstProduct} al ${lastProduct}`}
                    aria-current={
                      isActive ? "page" : undefined
                    }
                    onClick={() => setRequestedPage(index)}
                    className="group inline-flex size-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary)"
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-2 rounded-full ${
                        isActive
                          ? "w-7 bg-(--brand-secondary)"
                          : "w-2 bg-(--border) group-hover:bg-(--brand-secondary)"
                      }`}
                    />
                  </button>
                );
              },
            )}
          </nav>

          <p
            className="sr-only"
            aria-live="polite"
          >
            Mostrando productos {start + 1} al{" "}
            {Math.min(
              start + PRODUCTS_PER_PAGE,
              items.length,
            )}{" "}
            de {items.length}
          </p>
        </>
      )}
    </>
  );
}

export function OrderDetailDialog({
  order,
  busy,
  formatDate,
  onClose,
  onPay,
  onCancel,
  onEmail,
}: OrderDetailDialogProps) {
  const reference = order.folio || `#${order.id_pedido}`;
  const isPending = order.estado === "pendiente";
  const hasActions = isPending || Boolean(order.id_venta);

  const refundedAmount = Number(
    order.total_reembolsado || 0,
  );

  const hasPaymentInfo =
    Boolean(order.estado_pago) || refundedAmount > 0;

  return (
    <Dialog
      wide
      title={`Pedido ${reference}`}
      onClose={onClose}
    >
      <div className="min-w-0">
        <div className="px-4 pt-5 pb-5 sm:px-6 lg:px-8">
          {/* El folio aparece únicamente en la barra superior. */}
          <header className="border-b border-(--border) pb-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.16em] text-(--brand-secondary) uppercase">
                  LA COSECHA
                </p>

                <h3 className="font-display mt-1.5 text-2xl leading-tight text-(--text-primary) sm:text-3xl">
                  Detalle de tu compra
                </h3>
              </div>

              <div className="shrink-0 self-start">
                <StatusBadge
                  state={order.estado}
                  variant="orders"
                />
              </div>
            </div>

            <p className="mt-3 flex items-center gap-2 text-xs text-(--text-secondary) sm:text-sm">
              <CalendarDays
                size={16}
                strokeWidth={1.8}
                aria-hidden="true"
                className="shrink-0 text-(--brand-secondary)"
              />

              {formatDate(order.fecha)}
            </p>
          </header>

          {/* Dos columnas en escritorio y una en móvil. */}
          <div className="grid min-w-0 grid-cols-1 gap-6 pt-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-0">
            <section
              aria-labelledby="order-products-heading"
              className="min-w-0 lg:border-r lg:border-(--border) lg:pr-7"
            >
              <div className="flex items-center gap-2.5">
                <Package
                  size={20}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="shrink-0 text-(--brand-secondary)"
                />

                <h4
                  id="order-products-heading"
                  className="text-base font-semibold text-(--text-primary)"
                >
                  Productos
                </h4>
              </div>

              <OrderProducts
                key={order.id_pedido}
                items={order.items}
              />
            </section>

            {/* Resumen de todos los productos del pedido. */}
            <aside
              aria-label="Resumen del pedido"
              className="min-w-0 border-t border-(--border) pt-5 lg:border-t-0 lg:pt-0 lg:pl-7"
            >
              <section className="flex items-start justify-between gap-3 border-b border-(--border) pb-5">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-(--text-primary)">
                    Total del pedido
                  </h4>

                  <p className="mt-1 text-xs text-(--text-secondary)">
                    MXN
                  </p>
                </div>

                <strong className="font-display shrink-0 text-2xl whitespace-nowrap text-(--brand-secondary) sm:text-3xl">
                  {money(order.total)}
                </strong>
              </section>

              {hasPaymentInfo && (
                <section className="border-b border-(--border) py-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="flex items-center gap-2.5 text-sm font-semibold text-(--text-primary)">
                      <CreditCard
                        size={19}
                        strokeWidth={1.8}
                        aria-hidden="true"
                        className="shrink-0 text-(--brand-secondary)"
                      />

                      Pago
                    </h4>

                    {order.estado_pago && (
                      <StatusBadge
                        state={order.estado_pago}
                        variant="orders"
                      />
                    )}
                  </div>

                  {refundedAmount > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-(--text-secondary)">
                        Importe reembolsado
                      </p>

                      <p className="mt-1 text-sm font-semibold text-(--text-primary)">
                        {money(order.total_reembolsado || 0)}
                      </p>
                    </div>
                  )}
                </section>
              )}

              {order.domicilio_snapshot && (
                <section className="border-b border-(--border) py-5">
                  <h4 className="flex items-center gap-2.5 text-sm font-semibold text-(--text-primary)">
                    <MapPin
                      size={19}
                      strokeWidth={1.8}
                      aria-hidden="true"
                      className="shrink-0 text-(--brand-secondary)"
                    />

                    Domicilio de entrega
                  </h4>

                  <p className="mt-3 pl-7 text-sm leading-6 wrap-break-word text-(--text-secondary)">
                    {order.domicilio_snapshot.calle_numero},{" "}
                    {order.domicilio_snapshot.colonia}
                    <br />
                    {order.domicilio_snapshot.ciudad}, C.P.{" "}
                    {order.domicilio_snapshot.codigo_postal}
                  </p>
                </section>
              )}

              {order.estado_envio && (
                <section className="pt-5">
                  <h4 className="flex items-center gap-2.5 text-sm font-semibold text-(--text-primary)">
                    <Truck
                      size={19}
                      strokeWidth={1.8}
                      aria-hidden="true"
                      className="shrink-0 text-(--brand-secondary)"
                    />

                    Seguimiento
                  </h4>

                  <div className="mt-3 pl-7">
                    <StatusBadge
                      state={order.estado_envio}
                      variant="orders"
                    />

                    {order.num_guia && (
                      <p className="mt-3 text-xs leading-5 break-all text-(--text-secondary)">
                        {order.paqueteria && (
                          <>
                            {order.paqueteria} ·{" "}
                          </>
                        )}

                        Guía {order.num_guia}
                      </p>
                    )}

                    {order.fecha_envio && (
                      <p className="mt-2 text-xs leading-5 text-(--text-secondary)">
                        Salida: {formatDate(order.fecha_envio)}
                      </p>
                    )}

                    {order.fecha_entrega_real && (
                      <p className="mt-2 text-xs leading-5 text-(--text-secondary)">
                        Entrega:{" "}
                        {formatDate(order.fecha_entrega_real)}
                      </p>
                    )}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>

        {/* Acciones existentes, sin cambios funcionales. */}
        {hasActions && (
          <footer
            aria-label="Acciones del pedido"
            className="sticky bottom-0 z-10 border-t border-(--border) bg-(--surface) px-4 py-4 sm:px-6 lg:px-8"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
              {isPending && (
                <button
                  type="button"
                  disabled={busy !== null}
                  aria-busy={busy === "payment"}
                  onClick={() => onPay(order.id_pedido)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-(--brand-secondary) px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto"
                >
                  <CreditCard
                    size={17}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />

                  {busy === "payment"
                    ? "Redirigiendo..."
                    : "Continuar al pago"}
                </button>
              )}

              {isPending && (
                <button
                  type="button"
                  disabled={busy !== null}
                  aria-busy={busy === "cancel"}
                  onClick={() => onCancel(order.id_pedido)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-(--brand-primary) bg-(--surface) px-4 py-2.5 text-sm font-semibold text-(--brand-primary) hover:bg-(--surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-primary) disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto"
                >
                  <XCircle
                    size={17}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />

                  {busy === "cancel"
                    ? "Cancelando..."
                    : "Cancelar pedido"}
                </button>
              )}

              {order.id_venta && (
                <>
                  <a
                    href={`/api/receipts/${order.id_venta}/pdf`}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-(--brand-secondary) px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) sm:min-h-10 sm:w-auto"
                  >
                    <FileDown
                      size={17}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />

                    Comprobante PDF
                  </a>

                  <button
                    type="button"
                    disabled={busy !== null}
                    aria-busy={busy === "email"}
                    onClick={() => onEmail(order.id_venta!)}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-(--brand-secondary) bg-(--surface) px-4 py-2.5 text-sm font-semibold text-(--brand-secondary) hover:bg-(--surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto"
                  >
                    <Mail
                      size={17}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />

                    {busy === "email"
                      ? "Enviando..."
                      : "Enviar por correo"}
                  </button>
                </>
              )}
            </div>
          </footer>
        )}
      </div>
    </Dialog>
  );
}
