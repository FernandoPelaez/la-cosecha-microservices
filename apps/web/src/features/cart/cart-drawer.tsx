"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ShoppingBasket, Trash2, X, } from "lucide-react";
import gsap from "gsap";
import { useStore } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";
import { Quantity } from "@/components/ui/quantity";
import { money } from "@/lib/api";

import type { CartLine } from "@/types";

// Propiedades del carrito lateral.
interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

// Propiedades de cada producto.
interface CartItemProps {
  item: CartLine;
  busy: boolean;
  onChange: (id: number, quantity: number) => void;
  onRemove: (item: CartLine) => void;
  onNavigate: () => void;
}

/**
 * Presentación de un producto del carrito.
 * No realiza operaciones directas con la API.
 */
function CartItem({
  item,
  busy,
  onChange,
  onRemove,
  onNavigate,
}: CartItemProps) {
  const href = `/producto/${item.id_producto}`;
  const lineTotal = Number(item.precio_final) * item.cantidad;

  return (
    <li className="flex min-w-0 items-start gap-3 py-4 sm:gap-4">
      {/* Imagen */}
      <Link
        href={href}
        onClick={onNavigate}
        aria-label={`Ver ${item.nombre}`}
        className="flex h-20 w-16 shrink-0 items-center justify-center sm:h-24 sm:w-20"
      >
        <Image
          src={item.imagen || "/logo/la-cosecha.png"}
          alt={item.nombre}
          width={80}
          height={96}
          className="h-full w-full object-contain"
        />
      </Link>

      {/* Información */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={href}
            onClick={onNavigate}
            className="min-w-0 wrap-break-word text-sm font-semibold leading-5"
          >
            {item.nombre}
          </Link>

          <button
            type="button"
            disabled={busy}
            onClick={() => onRemove(item)}
            aria-label={`Eliminar ${item.nombre}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-(--action-danger) hover:bg-(--surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          >
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-1 text-xs text-(--text-secondary)">
          {money(item.precio_final)} por unidad
        </p>

        {/* Cantidad y precio */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Quantity
            value={item.cantidad}
            max={item.stock_actual}
            disabled={busy}
            label={`Cantidad de ${item.nombre}`}
            onChange={(quantity) =>
              onChange(item.id_producto, quantity)
            }
          />

          <strong className="text-sm text-(--brand-secondary)">
            {money(lineTotal)}
          </strong>
        </div>

        {/* Disponibilidad */}
        {item.cantidad > item.stock_actual && (
          <p
            role="alert"
            className="mt-2 text-xs text-(--action-danger)"
          >
            Quedan {item.stock_actual} unidades.
            Ajusta la cantidad.
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Carrito lateral de LA COSECHA.
 * Reutiliza el estado y las operaciones existentes.
 */
export function CartDrawer({
  open,
  onClose,
}: CartDrawerProps) {
  const {
    user,
    loadingUser,
    cart,
    loadingCart,
    cartError,
    refreshCart,
    updateCart,
  } = useStore();

  const { notify, confirm } = useFeedback();
  const pathname = usePathname();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);

  // Apertura lateral y gestión de accesibilidad.
  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    dialog.showModal();
    document.body.style.overflow = "hidden";

    closeRef.current?.focus({
      preventScroll: true,
    });

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const tween = gsap.fromTo(
      dialog,
      {
        xPercent: reduceMotion ? 0 : 100,
      },
      {
        xPercent: 0,
        duration: reduceMotion ? 0 : 0.25,
        ease: "power2.out",
      },
    );

    return () => {
      tween.kill();

      if (dialog.open) {
        dialog.close();
      }

      document.body.style.overflow = previousOverflow;

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus({
          preventScroll: true,
        });
      }
    };
  }, [open]);

  // Actualización mediante useStore.
  async function changeQuantity(
    id: number,
    quantity: number,
  ) {
    if (busy) return;

    setBusy(true);

    try {
      await updateCart(id, quantity);

      if (quantity === 0) {
        notify("Producto eliminado del carrito");
      }
    } catch (error) {
      notify((error as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  // Confirmación antes de eliminar.
  async function removeProduct(item: CartLine) {
    if (busy) return;

    const accepted = await confirm(
      "Eliminar producto",
      `¿Quieres quitar ${item.nombre} de tu carrito?`,
      "delete",
      {
        cancelLabel: "Cancelar",
        confirmLabel: "Eliminar",
        neutralCancel: true,
      },
    );

    if (accepted) {
      await changeQuantity(item.id_producto, 0);
    }
  }

  // Información derivada del carrito.
  const loading = loadingUser || loadingCart;
  const items = cart?.items ?? [];

  const itemCount = items.reduce(
    (sum, item) => sum + item.cantidad,
    0,
  );

  const subtotal =
    items.reduce(
      (sum, item) =>
        sum +
        Math.round(Number(item.precio_final) * 100) *
          item.cantidad,
      0,
    ) / 100;

  const hasStockIssue = items.some(
    (item) => item.cantidad > item.stock_actual,
  );

  const hasItems = Boolean(user && items.length);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none overflow-hidden border-0 bg-(--surface) p-0 text-(--text-primary) shadow-2xl backdrop:bg-black/40 sm:max-w-md"
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Encabezado */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-(--border) px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <ShoppingBasket
              size={24}
              className="shrink-0 text-(--brand-secondary)"
              aria-hidden="true"
            />

            <h2
              id={titleId}
              className="font-display text-xl sm:text-2xl"
            >
              Mi carrito
            </h2>

            {!loading && (
              <span className="text-sm text-(--text-secondary)">
                ({itemCount})
              </span>
            )}
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar carrito"
            className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-(--surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <X size={21} aria-hidden="true" />
          </button>
        </header>

        {/* Contenido desplazable */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6">
          {loading ? (
            <div
              role="status"
              className="flex min-h-full items-center justify-center py-10 text-sm text-(--text-secondary)"
            >
              Cargando carrito…
            </div>
          ) : cartError ? (
            <div
              role="alert"
              className="flex min-h-full flex-col items-center justify-center gap-4 py-10 text-center"
            >
              <p className="text-sm text-(--action-danger)">
                {cartError}
              </p>

              <Button
                type="button"
                size="compact"
                onClick={() => void refreshCart()}
              >
                Reintentar
              </Button>
            </div>
          ) : !hasItems ? (
            /* Carrito vacío */
            <div className="flex min-h-full flex-col items-center justify-center py-10 text-center">
              <ShoppingBasket
                size={52}
                strokeWidth={1.4}
                className="mb-5 text-(--brand-secondary)"
                aria-hidden="true"
              />

              <h3 className="font-display text-2xl sm:text-3xl">
                {user
                  ? "Tu carrito está vacío"
                  : "Guarda tu selección"}
              </h3>

              <p className="mt-3 max-w-xs text-sm leading-6 text-(--text-secondary)">
                {user
                  ? "Explora nuestras salsas y agrega tus favoritas para comenzar tu pedido."
                  : "Inicia sesión para conservar los productos de tu compra."}
              </p>

              <div className="mt-6">
                {user && pathname === "/" ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-(--action-buy) px-5 py-2.5 text-sm font-semibold text-white hover:bg-(--brand-secondary-hover)"
                  >
                    Seguir comprando
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                ) : (
                  <Link
                    href={user ? "/" : "/iniciar-sesion"}
                    onClick={onClose}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-(--action-buy) px-5 py-2.5 text-sm font-semibold text-white hover:bg-(--brand-secondary-hover)"
                  >
                    {user ? "Ir a la tienda" : "Iniciar sesión"}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            /* Lista de productos */
            <section aria-label="Productos del carrito">
              <p className="border-b border-(--border) py-4 text-xs text-(--text-secondary)">
                {itemCount}{" "}
                {itemCount === 1
                  ? "producto en tu carrito"
                  : "productos en tu carrito"}
              </p>

              <ul className="divide-y divide-(--border)">
                {items.map((item) => (
                  <CartItem
                    key={item.id_producto}
                    item={item}
                    busy={busy}
                    onChange={(id, quantity) =>
                      void changeQuantity(id, quantity)
                    }
                    onRemove={(selected) =>
                      void removeProduct(selected)
                    }
                    onNavigate={onClose}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Resumen de compra */}
        {!loading && !cartError && hasItems && (
          <footer className="shrink-0 border-t border-(--border) bg-(--surface) px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">
                Subtotal
              </span>

              <strong className="text-lg text-(--brand-secondary)">
                {money(subtotal)}
              </strong>
            </div>

            <p className="mt-1 text-xs text-(--text-secondary)">
              Importes en pesos mexicanos.
            </p>

            {hasStockIssue ? (
              <p
                role="alert"
                className="mt-4 text-sm text-(--action-danger)"
              >
                Ajusta los productos sin disponibilidad
                para continuar.
              </p>
            ) : (
              <Link
                href="/checkout"
                aria-disabled={busy}
                onClick={(event) => {
                  if (busy) {
                    event.preventDefault();
                  } else {
                    onClose();
                  }
                }}
                className={`mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-(--action-buy) px-4 py-2.5 text-sm font-semibold text-white ${
                  busy
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-(--brand-secondary-hover)"
                }`}
              >
                Proceder al pago
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl border border-(--brand-secondary) px-4 py-2 text-sm font-semibold text-(--brand-secondary)"
            >
              Seguir comprando
            </button>
          </footer>
        )}
      </div>
    </dialog>
  );
}

