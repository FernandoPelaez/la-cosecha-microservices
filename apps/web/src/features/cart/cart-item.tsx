"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { CartLine } from "@/types";
import { Quantity } from "@/components/ui/quantity";
import { money } from "@/lib/api";

interface CartItemProps {
  item: CartLine;
  busy: boolean;
  variant: "page" | "drawer";
  onChange: (id: number, quantity: number) => void;
  onRemove: (item: CartLine) => void;
  onNavigate?: () => void;
}

export function CartItem({
  item,
  busy,
  variant,
  onChange,
  onRemove,
  onNavigate,
}: CartItemProps) {
  const isDrawer = variant === "drawer";
  const href = `/producto/${item.id_producto}`;
  const lineTotal = Number(item.precio_final) * item.cantidad;

  return (
    <li
      className={
        isDrawer
          ? "flex min-w-0 items-start gap-3 py-4 sm:gap-4"
          : "grid min-w-0 grid-cols-[72px_minmax(0,1fr)] items-start gap-x-3 gap-y-3 py-6 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:gap-x-5"
      }
    >
      <Link
        href={href}
        onClick={onNavigate}
        aria-label={`Ver ${item.nombre}`}
        className={
          isDrawer
            ? "flex h-20 w-16 shrink-0 items-center justify-center sm:h-24 sm:w-20"
             : "flex h-24 w-18 shrink-0 items-center justify-center sm:h-28 sm:w-24"
        }
      >
        <Image
          src={item.imagen || "/logo/la-cosecha.png"}
          alt={item.nombre}
          width={96}
          height={112}
          className="max-h-full w-full object-contain"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <Link
            href={href}
            onClick={onNavigate}
            className="min-w-0 wrap-break-word text-sm font-semibold leading-5 text-(--text-primary) hover:underline"
          >
            {item.nombre}
          </Link>

          {isDrawer && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(item)}
              aria-label={`Eliminar ${item.nombre}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-(--action-danger) hover:bg-(--surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
          )}
        </div>

        <p className="mt-1 text-xs text-(--text-secondary)">
          {money(item.precio_final)} por unidad
        </p>

        <div
          className={
            isDrawer
              ? "mt-3 flex flex-wrap items-center justify-between gap-3"
              : "mt-4"
          }
        >
          <Quantity
            value={item.cantidad}
            max={item.stock_actual}
            disabled={busy}
            label={`Cantidad de ${item.nombre}`}
            onChange={(quantity) => onChange(item.id_producto, quantity)}
          />

          {isDrawer && (
            <strong className="text-sm text-(--brand-secondary)">
              {money(lineTotal)}
            </strong>
          )}
        </div>

        {item.cantidad > item.stock_actual && (
          <p
            role="alert"
            className="mt-3 text-xs leading-5 text-(--action-danger)"
          >
            Quedan {item.stock_actual} unidades. Ajusta la cantidad.
          </p>
        )}
      </div>

      {!isDrawer && (
        <div className="col-start-2 flex flex-wrap items-center justify-between gap-3 sm:col-start-3 sm:row-start-1 sm:flex-col sm:items-end sm:gap-4">
          <strong className="text-sm font-semibold text-(--text-primary)">
            {money(lineTotal)}
          </strong>

          <button
            type="button"
            disabled={busy}
            onClick={() => onRemove(item)}
            aria-label={`Eliminar ${item.nombre}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-(--action-danger) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={15} aria-hidden="true" />
            Eliminar
          </button>
        </div>
      )}
    </li>
  );
}