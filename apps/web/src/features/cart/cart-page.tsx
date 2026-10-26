"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Trash2, ArrowRight, ArrowLeft, ShoppingBag } from "lucide-react";
import { useStore } from "@/components/providers";
import { useFeedback } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Quantity } from "@/components/ui/quantity";

import { money } from "@/lib/api";
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
  async function update(id: number, quantity: number) {
    if (busy) return;
    setBusy(true);
    try {
      await updateCart(id, quantity);
      if (!quantity) notify("Producto eliminado del carrito");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  if (loadingUser || loadingCart)
    return (
      <div className="page" role="status">
        Cargando carrito…
      </div>
    );
  const total =
    (cart?.items.reduce(
      (sum, i) => sum + Math.round(Number(i.precio_final) * 100) * i.cantidad,
      0,
    ) || 0) / 100;
  return (
    <div className="page">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">Tu selección</p>
          <h1 className="page-title">Mi carrito</h1>
        </div>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm"
        >
          <ArrowLeft size={15} />
          Seguir comprando
        </Link>
      </div>
      {cartError ? (
        <div role="alert" className="panel flex flex-wrap gap-4 p-6">
          {cartError}
          <Button onClick={() => void refreshCart()}>Reintentar</Button>
        </div>
      ) : !user || !cart?.items.length ? (
        <div className="panel flex flex-col items-center p-8 text-center">
          <ShoppingBag size={34} className="mb-4 text-(--brand-primary)" />
          <h2 className="font-display text-2xl">
            {user
              ? "Tu carrito está esperando su primera salsa"
              : "Guarda tu selección"}
          </h2>
          <p className="my-3 text-sm text-(--text-secondary)">
            {user
              ? "Elige tus variedades desde el catálogo."
              : "Inicia sesión para conservar los productos de tu compra."}
          </p>
          <Link
            href={user ? "/" : "/iniciar-sesion"}
            className="action-link mt-2"
          >
            {user ? "Ir a la tienda" : "Iniciar sesión"}
            <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="panel min-w-0 overflow-hidden">
            <div className="border-b border-(--border) px-5 py-3 text-xs font-semibold">
              {cart.items.reduce((s, i) => s + i.cantidad, 0)} productos en tu
              carrito
            </div>
            <ul className="divide-y divide-(--border)">
              {cart.items.map((i) => (
                <li
                  key={i.id_producto}
                  className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 p-4 sm:grid-cols-[90px_minmax(0,1fr)_auto] sm:p-5"
                >
                  <Image
                    src={i.imagen || "/logo/la-cosecha.png"}
                    alt={i.nombre}
                    width={90}
                    height={90}
                    className="h-auto w-full object-contain"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/producto/${i.id_producto}`}
                      className="text-sm font-semibold"
                    >
                      {i.nombre}
                    </Link>
                    <p className="mb-3 mt-1 text-xs text-(--text-secondary)">
                      {money(i.precio_final)} por unidad
                    </p>
                    <Quantity
                      value={i.cantidad}
                      max={i.stock_actual}
                      disabled={busy}
                      label={`Cantidad de ${i.nombre}`}
                      onChange={(q) => void update(i.id_producto, q)}
                    />
                    {i.cantidad > i.stock_actual && (
                      <p
                        role="alert"
                        className="mt-2 text-xs text-(--action-danger)"
                      >
                        Quedan {i.stock_actual} unidades. Ajusta la cantidad.
                      </p>
                    )}
                  </div>
                  <div className="col-start-2 flex items-center justify-between gap-3 sm:col-start-auto sm:flex-col sm:items-end">
                    <strong className="text-sm">
                      {money(Number(i.precio_final) * i.cantidad)}
                    </strong>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Eliminar ${i.nombre}`}
                      onClick={async () => {
                        if (
                          await confirm(
                            "Eliminar producto",
                            `¿Quieres quitar ${i.nombre} de tu carrito?`,
                          )
                        )
                          void update(i.id_producto, 0);
                      }}
                      className="flex min-h-11 items-center gap-1.5 text-xs text-(--action-danger)"
                    >
                      <Trash2 size={15} />
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel p-5">
            <p className="eyebrow mb-2">Resumen</p>
            <h2 className="font-display text-2xl">Tu próxima cosecha</h2>
            <div className="my-5 flex justify-between border-y border-(--border) py-4 text-sm">
              <span>Total</span>
              <strong className="text-xl">{money(total)}</strong>
            </div>
            <p className="mb-4 text-xs text-(--text-secondary)">
              Importes en pesos mexicanos.
            </p>
            {cart.items.some((i) => i.cantidad > i.stock_actual) ? (
              <p role="alert" className="text-sm text-(--action-danger)">
                Ajusta los productos sin disponibilidad para continuar.
              </p>
            ) : (
              <Link href="/checkout" className="action-link w-full">
                Continuar con la compra
                <ArrowRight size={17} />
              </Link>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
