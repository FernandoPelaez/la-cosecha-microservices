"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { money } from "@/lib/api";
import type { Order } from "./types";

interface OrderTableProps {
  orders: Order[];
  formatDate: (value: string) => string;
  onViewOrder: (id: number) => void;
}

const TABLE_COLUMNS =
  "xl:grid-cols-[minmax(90px,1fr)_minmax(140px,1.3fr)_minmax(105px,1.2fr)_minmax(80px,.8fr)_minmax(120px,1fr)_auto]";

export function OrderTable({
  orders,
  formatDate,
  onViewOrder,
}: OrderTableProps) {
  return (
    <div role="table" aria-label="Listado de pedidos">
      {/* Encabezados visibles en pantallas amplias. */}
      <div role="rowgroup">
        <div
          role="row"
          className={`hidden items-center gap-3 bg-(--surface-soft) px-5 py-4 text-xs font-semibold text-(--text-primary) xl:grid ${TABLE_COLUMNS}`}
        >
          <span role="columnheader">Pedido</span>
          <span role="columnheader">Fecha de compra</span>
          <span role="columnheader">Productos</span>
          <span role="columnheader">Total</span>
          <span role="columnheader">Estatus</span>
          <span role="columnheader">Acciones</span>
        </div>
      </div>

      {/* Filas responsivas del historial. */}
      <div role="rowgroup" className="divide-y divide-(--border)">
        {orders.length === 0 ? (
          <div
            role="row"
            className="px-5 py-12 text-center"
          >
            <p
              role="cell"
              className="text-sm text-(--text-secondary)"
            >
              No se encontraron pedidos con los filtros seleccionados.
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id_pedido}
              role="row"
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-4 py-4 sm:px-5 xl:gap-3 xl:py-3 ${TABLE_COLUMNS}`}
            >
              <div
                role="cell"
                className="col-start-1 row-start-1 min-w-0 xl:col-auto xl:row-auto"
              >
                <span
                  title={
                    order.folio ||
                    `Pedido #${order.id_pedido}`
                  }
                  className="inline-block max-w-full truncate rounded-lg bg-(--surface-soft) px-3 py-2 text-sm font-semibold text-(--text-primary)"
                >
                  {order.folio || `#${order.id_pedido}`}
                </span>
              </div>

              <div
                role="cell"
                className="col-span-2 row-start-2 min-w-0 text-xs text-(--text-secondary) sm:text-sm xl:col-auto xl:row-auto"
              >
                {formatDate(order.fecha)}
              </div>

              <div
                role="cell"
                className="col-span-2 row-start-3 min-w-0 xl:col-auto xl:row-auto"
              >
                {order.items.length > 0 ? (
                  <div className="flex min-w-0 items-center gap-2">
                    {order.items.slice(0, 3).map((item) => (
                      <Image
                        key={item.id_producto}
                        src={
                          item.imagen ||
                          "/logo/la-cosecha.png"
                        }
                        alt={item.nombre}
                        title={item.nombre}
                        width={36}
                        height={44}
                        className="h-11 w-9 shrink-0 rounded-md bg-(--surface-soft) object-contain"
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-(--text-secondary)">
                    Sin productos
                  </span>
                )}
              </div>

              <strong
                role="cell"
                className="col-start-1 row-start-4 text-sm font-semibold text-(--text-primary) xl:col-auto xl:row-auto"
              >
                {money(order.total)}
              </strong>

              {/* Estados exclusivos del módulo Mis pedidos. */}
              <div
                role="cell"
                className="col-start-2 row-start-1 xl:col-auto xl:row-auto"
              >
                <StatusBadge
                  state={order.estado}
                  variant="orders"
                />
              </div>

              <div
                role="cell"
                className="col-start-2 row-start-4 xl:col-auto xl:row-auto"
              >
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`Ver pedido número ${order.id_pedido}`}
                  onClick={() =>
                    onViewOrder(order.id_pedido)
                  }
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-(--brand-secondary) px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-(--brand-secondary) hover:bg-(--surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary)"
                >
                  Ver pedido

                  <ArrowUpRight
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

