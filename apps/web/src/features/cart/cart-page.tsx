"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";

import type { CartLine } from "@/types";
import { useStore } from "@/components/providers";
import { useFeedback } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { CartItem } from "./cart-item";
import { CartSummary } from "./cart-summary";

export function CartPage() {
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
  const [busy, setBusy] = useState(false);

  async function changeQuantity(id: number, quantity: number) {
    if (busy) return;

    setBusy(true);

    try {
      await updateCart(id, quantity);

      if (quantity === 0) {
        notify("Producto eliminado del carrito");
      }
    } catch (cause) {
      notify(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar el carrito.",
        true,
      );
    } finally {
      setBusy(false);
    }
  }

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

  if (loadingUser || loadingCart) {
    return (
      <div className="page" role="status">
        Cargando carrito…
      </div>
    );
  }

  const items = cart?.items ?? [];

  const productCount = items.reduce(
    (sum, item) => sum + item.cantidad,
    0,
  );

  const total =
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

  return (
    <div className="page">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-9 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 sm:mb-12">
          <div className="min-w-0">
            <p className="eyebrow mb-3">Tu selección</p>

            <h1 className="font-display text-4xl leading-tight text-(--text-primary) sm:text-5xl">
              Mi carrito
            </h1>

            <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
              Revisa tus productos antes de continuar con la compra.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-(--brand-secondary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Seguir comprando
          </Link>
        </header>

        {cartError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-4 border-y border-(--border) py-7"
          >
            <p className="text-sm text-(--action-danger)">
              {cartError}
            </p>

            <Button
              size="compact"
              onClick={() => void refreshCart()}
            >
              Reintentar
            </Button>
          </div>
        ) : !user || items.length === 0 ? (
          <section className="flex flex-col items-center border-y border-(--border) py-12 text-center">
            <ShoppingBag
              size={36}
              strokeWidth={1.5}
              aria-hidden="true"
              className="mb-4 text-(--brand-secondary)"
            />

            <h2 className="font-display text-2xl text-(--text-primary) sm:text-3xl">
              {user
                ? "Tu carrito está esperando su primera salsa"
                : "Guarda tu selección"}
            </h2>

            <p className="mt-3 max-w-sm text-sm leading-6 text-(--text-secondary)">
              {user
                ? "Elige tus variedades desde el catálogo."
                : "Inicia sesión para conservar los productos de tu compra."}
            </p>

            <Link
              href={user ? "/" : "/iniciar-sesion"}
              className="mt-6 inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl bg-(--brand-secondary) px-5 py-2.5 text-sm font-semibold text-white hover:bg-(--brand-secondary-hover) focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {user ? "Ir a la tienda" : "Iniciar sesión"}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <div className="grid min-w-0 items-start gap-x-12 gap-y-9 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section
              className="min-w-0"
              aria-label="Productos en tu carrito"
            >
              <p className="border-b border-(--border) pb-4 text-xs font-medium uppercase tracking-wider text-(--text-secondary)">
                {productCount}{" "}
                {productCount === 1 ? "producto" : "productos"} en tu
                carrito
              </p>

              <ul className="divide-y divide-(--border)">
                {items.map((item) => (
                  <CartItem
                    key={item.id_producto}
                    item={item}
                    variant="page"
                    busy={busy}
                    onChange={(id, quantity) =>
                      void changeQuantity(id, quantity)
                    }
                    onRemove={(selected) =>
                      void removeProduct(selected)
                    }
                  />
                ))}
              </ul>
            </section>

            <CartSummary
              productCount={productCount}
              total={total}
              hasStockIssue={hasStockIssue}
              busy={busy}
            />
          </div>
        )}
      </div>
    </div>
  );
}