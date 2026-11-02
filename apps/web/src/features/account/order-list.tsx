"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Package } from "lucide-react";
import { useFeedback } from "@/components/ui/feedback";
import { send } from "@/lib/api";
import { OrderFilters } from "./order-filters";
import { OrderTable } from "./order-table";
import { OrderPagination } from "./order-pagination";
import { OrderDetailDialog } from "./order-detail-dialog";
import type { Order } from "./types";

const PAGE_SIZE = 4;

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  pagado: "Pagado",
  preparacion: "En preparación",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

type OrderAction = "payment" | "email" | "cancel" | null;

interface OrderListProps {
  orders: Order[];
  onRefresh?: () => void;
}

function formatOrderDate(value: string) {
  const normalized = value.replace(" ", "T");

  const parsed = new Date(
    /[Zz]|[+-]\d\d:\d\d$/.test(normalized)
      ? normalized
      : normalized + "Z",
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
}: OrderListProps) {
  const { notify, confirm } = useFeedback();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState<OrderAction>(null);

  const statuses = useMemo(
    () => [...new Set(orders.map((order) => order.estado))],
    [orders],
  );

  // Filtra los pedidos por estado, número, folio o producto.
  const filteredOrders = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase("es-MX");

    return orders.filter((order) => {
      const matchesStatus =
        status === "all" || order.estado === status;

      const matchesSearch =
        !normalizedSearch ||
        String(order.id_pedido).includes(normalizedSearch) ||
        (order.folio || "")
          .toLocaleLowerCase("es-MX")
          .includes(normalizedSearch) ||
        order.items.some((item) =>
          item.nombre
            .toLocaleLowerCase("es-MX")
            .includes(normalizedSearch),
        );

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, status]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;

  const visibleOrders = filteredOrders.slice(
    start,
    start + PAGE_SIZE,
  );

  const selectedOrder = orders.find(
    (order) => order.id_pedido === selected,
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  async function pay(id: number) {
    if (busy) return;

    setBusy("payment");

    try {
      const result = await send<{ url: string }>(
        `retry-payment/${id}`,
        "POST",
      );

      const url = new URL(result.url);

      if (
        url.protocol !== "https:" ||
        url.hostname !== "checkout.stripe.com"
      ) {
        throw new Error("Enlace de pago inválido");
      }

      window.location.assign(url.href);
    } catch (error) {
      notify((error as Error).message, true);
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
    } catch (error) {
      notify((error as Error).message, true);
    } finally {
      setBusy(null);
    }
  }

  async function cancel(id: number) {
    // Personaliza únicamente la confirmación de cancelar pedidos.
    // Las demás confirmaciones conservan sus estilos originales.
    if (
      busy ||
      !(await confirm(
        "Cancelar pedido",
        "Se consultará el estado del pago antes de liberar la reserva.",
        "delete",
        {
          cancelLabel: "Volver",
          confirmLabel: "Sí, cancelar pedido",
          neutralCancel: true,
        },
      ))
    ) {
      return;
    }

    setBusy("cancel");

    try {
      await send(`cancel-order/${id}`, "POST");

      notify("Pedido cancelado");
      setSelected(null);
      onRefresh?.();
    } catch (error) {
      notify((error as Error).message, true);
      onRefresh?.();
    } finally {
      setBusy(null);
    }
  }

  if (!orders.length) {
    return (
      <div className="panel p-10 text-center">
        <Package
          size={32}
          className="mx-auto mb-4 text-(--brand-olive)"
          aria-hidden="true"
        />

        <h2 className="font-display text-2xl">
          Todavía no tienes pedidos
        </h2>

        <p className="mt-3 mb-6 text-sm text-(--text-secondary)">
          Aquí encontrarás tus compras, comprobantes y seguimiento.
        </p>

        <Link href="/#salsas" className="action-link">
          Elegir mis salsas
        </Link>
      </div>
    );
  }

  return (
    <section
      aria-label="Historial de pedidos"
      className="min-w-0"
    >
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <Package
            size={34}
            strokeWidth={1.7}
            aria-hidden="true"
            className="mt-1 shrink-0 text-(--brand-secondary)"
          />

          <div className="min-w-0">
            <h2 className="font-display text-2xl sm:text-3xl">
              Historial de pedidos
            </h2>

            <p className="mt-2 text-sm text-(--text-secondary)">
              Consulta, filtra y da seguimiento a todas tus compras.
            </p>
          </div>
        </div>

        <span className="shrink-0 text-sm font-semibold text-(--brand-secondary)">
          {orders.length}{" "}
          {orders.length === 1 ? "pedido" : "pedidos"}
        </span>
      </header>

      <OrderFilters
        search={search}
        status={status}
        statuses={statuses}
        statusLabels={STATUS_LABELS}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
      />

      <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--surface)">
        <OrderTable
          orders={visibleOrders}
          formatDate={formatOrderDate}
          onViewOrder={setSelected}
        />

        <OrderPagination
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {selectedOrder && (
        <OrderDetailDialog
          order={selectedOrder}
          busy={busy}
          formatDate={formatOrderDate}
          onClose={() => setSelected(null)}
          onPay={(id) => void pay(id)}
          onCancel={(id) => void cancel(id)}
          onEmail={(id) => void email(id)}
        />
      )}
    </section>
  );
}
