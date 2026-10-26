"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { FileDown, Mail, Package, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFeedback } from "@/components/ui/feedback";
import { money, send } from "@/lib/api";
import type { Order } from "./types";
const PAGE_SIZE = 5;
function date(value: string) {
  const normalized = value.replace(" ", "T");
  const parsed = new Date(
    /[Zz]|[+-]\d\d:\d\d$/.test(normalized) ? normalized : normalized + "Z",
  );
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
}
export function OrderList({
  orders,
  onRefresh,
}: {
  orders: Order[];
  onRefresh?: () => void;
}) {
  const { notify, confirm } = useFeedback();
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState<number | null>(null),
    [busy, setBusy] = useState<"payment" | "email" | "cancel" | null>(null);
  const pages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE)),
    current = Math.min(page, pages);
  const order = orders.find((o) => o.id_pedido === selected);
  async function pay(id: number) {
    if (busy) return;
    setBusy("payment");
    try {
      const result = await send<{ url: string }>(`retry-payment/${id}`, "POST"),
        url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
        throw new Error("Enlace de pago inválido");
      window.location.assign(url.href);
    } catch (e) {
      notify((e as Error).message, true);
      setBusy(null);
    }
  }
  async function email(id: number) {
    if (busy) return;
    setBusy("email");
    try {
      await send(`receipts/${id}/email`, "POST");
      notify(
        "El servidor de correo aceptó el comprobante. Revisa también correo no deseado.",
      );
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  }
  async function cancel(id: number) {
    if (
      busy ||
      !(await confirm(
        "Cancelar pedido",
        "Se consultará el estado del pago antes de liberar la reserva.",
        "delete",
      ))
    )
      return;
    setBusy("cancel");
    try {
      await send(`cancel-order/${id}`, "POST");
      notify("Pedido cancelado");
      setSelected(null);
      onRefresh?.();
    } catch (e) {
      notify((e as Error).message, true);
      onRefresh?.();
    } finally {
      setBusy(null);
    }
  }
  if (!orders.length)
    return (
      <div className="panel p-10 text-center">
        <Package size={32} className="mx-auto text-(--brand-olive) mb-4" />
        <h2 className="font-display text-2xl">Todavía no tienes pedidos</h2>
        <p className="mt-3 mb-6 text-sm text-(--text-secondary)">
          Aquí encontrarás tus compras, comprobantes y seguimiento.
        </p>
        <Link href="/#salsas" className="action-link">
          Elegir mis salsas
        </Link>
      </div>
    );
  return (
    <section aria-label="Historial de pedidos">
      <div className="flex flex-wrap justify-between items-end gap-3 mb-5">
        <div>
          <h2 className="font-display text-2xl">Historial de pedidos</h2>
          <p className="text-xs text-(--text-secondary) mt-2">
            Tus compras más recientes y sus comprobantes.
          </p>
        </div>
        <span className="text-xs">{orders.length} pedidos</span>
      </div>
      <div className="space-y-3">
        {orders
          .slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
          .map((o) => (
            <article key={o.id_pedido} className="panel p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-xl">
                    Pedido #{o.id_pedido}
                  </h3>
                  <p className="text-[11px] mt-1 text-(--text-secondary)">
                    {date(o.fecha)}
                    {o.folio ? ` · ${o.folio}` : ""}
                  </p>
                </div>
                <StatusBadge state={o.estado} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 mt-4 border-t border-(--border) pt-4">
                <div className="flex items-center gap-2">
                  {o.items.slice(0, 3).map((item) => (
                    <Image
                      key={item.id_producto}
                      src={item.imagen || "/logo/la-cosecha.png"}
                      alt={item.nombre}
                      width={45}
                      height={52}
                      className="object-contain rounded bg-(--surface-soft) h-13"
                    />
                  ))}
                  <span className="text-xs ml-2">
                    {o.items.reduce((s, i) => s + i.cantidad, 0)} unidades
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <strong className="text-base">{money(o.total)}</strong>
                  <Button
                    size="compact"
                    aria-haspopup="dialog"
                    onClick={() => setSelected(o.id_pedido)}
                  >
                    Ver pedido
                    <ArrowUpRight size={14} />
                  </Button>
                </div>
              </div>
            </article>
          ))}
      </div>
      {pages > 1 && (
        <nav
          aria-label="Paginación de pedidos"
          className="flex flex-wrap items-center justify-between gap-3 mt-5"
        >
          <span className="text-xs" aria-live="polite">
            Página {current} de {pages}
          </span>
          <div className="flex gap-2">
            <Button
              size="compact"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </Button>
            <Button
              size="compact"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Siguiente
            </Button>
          </div>
        </nav>
      )}
      {order && (
        <Dialog
          wide
          title={`Pedido #${order.id_pedido}`}
          onClose={() => setSelected(null)}
        >
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-3 justify-between border-b border-(--border) pb-4">
              <div>
                <h3 className="font-display text-2xl">Tu compra, en detalle</h3>
                <p className="text-xs mt-2 text-(--text-secondary)">
                  {date(order.fecha)} ·{" "}
                  {order.folio || `Pedido #${order.id_pedido}`}
                </p>
              </div>
              <StatusBadge state={order.estado} />
            </div>
            <div className="divide-y divide-(--border)">
              {order.items.map((item) => (
                <div
                  key={item.id_producto}
                  className="flex items-center gap-4 py-4"
                >
                  <Image
                    src={item.imagen || "/logo/la-cosecha.png"}
                    alt={item.nombre}
                    width={65}
                    height={75}
                    className="object-contain w-14 h-18 shrink-0"
                  />
                  <div className="min-w-0 grow">
                    <p className="text-sm font-semibold">{item.nombre}</p>
                    <p className="text-xs mt-1 text-(--text-secondary)">
                      {item.cantidad} ×{" "}
                      {money(
                        Number(item.precio_unitario) -
                          Number(item.descuento_unitario),
                      )}
                    </p>
                    {Number(item.descuento_unitario) > 0 && (
                      <p className="text-xs mt-1 text-(--brand-olive)">
                        Descuento por unidad: {money(item.descuento_unitario)}
                      </p>
                    )}
                  </div>
                  <strong className="text-sm">
                    {money(
                      (Number(item.precio_unitario) -
                        Number(item.descuento_unitario)) *
                        item.cantidad,
                    )}
                  </strong>
                </div>
              ))}
            </div>
            <div className="border-y border-(--border) py-4 flex justify-between">
              <span>Total · MXN</span>
              <strong>{money(order.total)}</strong>
            </div>
            {order.estado_pago && (
              <div className="mt-4 flex gap-2 items-center text-xs">
                Pago
                <StatusBadge state={order.estado_pago} />
              </div>
            )}
            {Number(order.total_reembolsado) > 0 && (
              <p className="mt-3 text-sm text-purple-800">
                Reembolsado: {money(order.total_reembolsado || 0)}
              </p>
            )}
            {order.domicilio_snapshot && (
              <section className="mt-5">
                <h4 className="text-sm font-semibold">
                  Domicilio registrado en la compra
                </h4>
                <p className="text-sm text-(--text-secondary) mt-2">
                  {order.domicilio_snapshot.calle_numero},{" "}
                  {order.domicilio_snapshot.colonia}
                  <br />
                  {order.domicilio_snapshot.ciudad}, C.P.{" "}
                  {order.domicilio_snapshot.codigo_postal}
                </p>
              </section>
            )}
            {order.estado_envio && (
              <section className="mt-5">
                <h4 className="text-sm font-semibold mb-2">Seguimiento</h4>
                <StatusBadge state={order.estado_envio} />
                {order.num_guia && (
                  <p className="text-sm mt-3">
                    {order.paqueteria} · Guía {order.num_guia}
                  </p>
                )}
                {order.fecha_envio && (
                  <p className="text-xs mt-2">
                    Salida: {date(order.fecha_envio)}
                  </p>
                )}
                {order.fecha_entrega_real && (
                  <p className="text-xs mt-2">
                    Entrega registrada: {date(order.fecha_entrega_real)}
                  </p>
                )}
              </section>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {order.estado === "pendiente" && (
                <Button
                  variant="buy"
                  busy={busy === "payment"}
                  disabled={busy !== null}
                  onClick={() => void pay(order.id_pedido)}
                >
                  Continuar al pago
                </Button>
              )}
              {order.estado === "pendiente" && (
                <Button
                  variant="cancel"
                  busy={busy === "cancel"}
                  disabled={busy !== null}
                  onClick={() => void cancel(order.id_pedido)}
                >
                  Cancelar pedido
                </Button>
              )}
              {order.id_venta && (
                <>
                  <a
                    href={`/api/receipts/${order.id_venta}/pdf`}
                    className="action-link"
                  >
                    <FileDown size={16} />
                    Comprobante PDF
                  </a>
                  <Button
                    variant="send"
                    busy={busy === "email"}
                    disabled={busy !== null}
                    onClick={() => void email(order.id_venta!)}
                  >
                    <Mail size={16} />
                    Enviar por correo
                  </Button>
                </>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}
