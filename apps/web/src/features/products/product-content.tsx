"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import {
  BadgeCheck,
  ChevronRight,
  Leaf,
  MapPin,
  ShoppingBag,
  Star,
} from "lucide-react";

import { useStore } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Quantity } from "@/components/ui/quantity";
import { money } from "@/lib/api";
import { ProductImageZoom } from "./product-image-zoom";
import { useProduct } from "./use-product";
import { ProductReviews } from "./product-reviews";

type ProductContentProps = {
  id: number;
  standalone?: boolean;
};

type ProductTab = "information" | "reviews";

export function ProductContent({
  id,
  standalone = false,
}: ProductContentProps) {
  const {
    product,
    reviews,
    error,
    reviewError,
    loadingReviews,
    reloadReviews,
  } = useProduct(id);

  const { addToCart } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] =
    useState<ProductTab>("information");

  const detailsRef = useRef<HTMLDivElement>(null);

  // Manejo de errores al consultar el producto.
  if (error && !product) {
    return (
      <p
        role="alert"
        className="py-6 text-sm text-(--action-danger)"
      >
        {error}
      </p>
    );
  }

  // Estado de carga.
  if (!product) {
    return (
      <p role="status" className="py-6 text-sm">
        Consultando salsa…
      </p>
    );
  }

  // Existencias reales del producto.
  const stock = Math.max(
    0,
    Number(product.stock_actual),
  );

  const Heading = standalone ? "h1" : "h3";

  // Calificación promedio.
  const average = reviews.length
    ? reviews.reduce(
        (sum, review) =>
          sum + review.calificacion,
        0,
      ) / reviews.length
    : 0;

  // Ir a la sección de opiniones.
  function showReviews() {
    setTab("reviews");

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    detailsRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  // Conservar la integración original del carrito.
  async function handleAddToCart() {
    if (busy || stock <= 0) return;

    setBusy(true);

    try {
      await addToCart(id, quantity);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-w-0">
      {/* Navegación del producto */}
      <nav
        aria-label="Ruta de navegación"
        className="mb-6 flex min-w-0 flex-wrap items-center gap-2 text-xs text-(--text-secondary) sm:text-sm"
      >
        <Link
          href="/#salsas"
          className="inline-flex min-h-10 items-center font-medium text-(--brand-secondary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary)"
        >
          Mi tienda
        </Link>

        <ChevronRight
          size={14}
          aria-hidden="true"
        />

        <span className="min-w-0 wrap-break-word font-medium text-(--text-primary)">
          {product.nombre}
        </span>
      </nav>

      {/* Distribución principal del producto */}
      <div className="grid min-w-0 items-start gap-6 md:grid-cols-2 md:gap-8 lg:gap-12">
        {/* Fotografía con zoom */}
        <div className="flex min-w-0 justify-center md:justify-start">
          <ProductImageZoom
            key={product.imagen || product.id}
            src={
              product.imagen ||
              "/logo/la-cosecha.png"
            }
            alt={product.nombre}
            priority={standalone}
          />
        </div>

        {/* Información comercial */}
        <div className="min-w-0 md:pt-2 lg:pt-4">
          {/* Categoría */}
          <p className="eyebrow mb-2">
            {product.categoria || "LA COSECHA"}
          </p>

          {/* Nombre del producto */}
          <Heading className="font-display text-3xl leading-tight text-(--text-primary) sm:text-4xl lg:text-[42px]">
            {product.nombre}
          </Heading>

          {/* Calificaciones */}
          <button
            type="button"
            onClick={showReviews}
            className="mt-3 inline-flex min-h-10 items-center gap-2 text-left text-xs text-(--text-secondary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) sm:text-sm"
          >
            <Star
              size={15}
              aria-hidden="true"
              className="shrink-0 text-(--brand-orange)"
              fill={
                average
                  ? "currentColor"
                  : "none"
              }
            />

            {loadingReviews
              ? "Consultando opiniones…"
              : reviewError
                ? "Opiniones no disponibles"
                : reviews.length
                  ? `${average.toFixed(1)} / 5 · ${reviews.length} opiniones`
                  : "Sin calificaciones"}
          </button>

          {/* Precio y descuentos */}
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <strong className="text-3xl tracking-tight text-(--text-primary) sm:text-4xl">
              {money(product.precio_final)}
            </strong>

            <span className="text-xs text-(--text-secondary)">
              MXN
            </span>

            {Number(product.precio_final) <
              Number(product.precio) && (
              <s className="text-sm text-(--text-muted)">
                {money(product.precio)}
              </s>
            )}
          </div>

          {/* Existencias */}
          <p
            className={`mt-4 text-sm ${
              stock > 0
                ? "text-(--brand-secondary)"
                : "text-(--text-muted)"
            }`}
          >
            {stock > 0
              ? `${stock} unidades disponibles`
              : "Temporalmente agotado"}
          </p>

          {/* Selector de cantidad y carrito */}
          <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3">
            <Quantity
              value={quantity}
              max={stock}
              disabled={stock <= 0 || busy}
              onChange={setQuantity}
            />

            <Button
              type="button"
              variant="add"
              disabled={stock <= 0}
              busy={busy}
              onClick={handleAddToCart}
              className="max-w-full shrink-0 px-5 focus-visible:outline-(--brand-secondary)"
            >
              <ShoppingBag
                size={17}
                aria-hidden="true"
              />

              Agregar al carrito
            </Button>
          </div>

          {/* Características y zona de entrega */}
          <ul
            aria-label="Características y zona de entrega"
            className="mt-6 grid grid-cols-3 divide-x divide-(--border) border-y border-(--border) py-4"
          >
            {/* Ingredientes naturales */}
            <li className="flex min-w-0 flex-col items-center gap-1 px-2 text-center sm:px-3">
              <Leaf
                size={21}
                strokeWidth={1.8}
                aria-hidden="true"
                className="shrink-0 text-(--brand-secondary)"
              />

              <span className="text-[11px] leading-4 text-(--text-primary) sm:text-xs">
                Ingredientes
                <br />
                100% naturales
              </span>
            </li>

            {/* Sin conservadores */}
            <li className="flex min-w-0 flex-col items-center gap-1 px-2 text-center sm:px-3">
              <BadgeCheck
                size={21}
                strokeWidth={1.8}
                aria-hidden="true"
                className="shrink-0 text-(--brand-secondary)"
              />

              <span className="text-[11px] leading-4 text-(--text-primary) sm:text-xs">
                Sin
                <br />
                conservadores
              </span>
            </li>

            {/* Entrega local */}
            <li className="flex min-w-0 flex-col items-center gap-1 px-2 text-center sm:px-3">
              <MapPin
                size={21}
                strokeWidth={1.8}
                aria-hidden="true"
                className="shrink-0 text-(--brand-secondary)"
              />

              <span className="text-[11px] leading-4 text-(--text-primary) sm:text-xs">
                Entrega en
                <br />
                Los Mochis, Sinaloa
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Sección de descripción y opiniones */}
      <div
        ref={detailsRef}
        className="mt-9 min-w-0 scroll-mt-6 sm:mt-12"
      >
        {/* Navegación de pestañas */}
        <div className="flex flex-wrap gap-1 border-b border-(--border)">
          <button
            type="button"
            className="tab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary)"
            aria-pressed={tab === "information"}
            onClick={() =>
              setTab("information")
            }
          >
            Descripción
          </button>

          <button
            type="button"
            className="tab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary)"
            aria-pressed={tab === "reviews"}
            onClick={showReviews}
          >
            Opiniones{" "}
            {!loadingReviews && !reviewError
              ? `(${reviews.length})`
              : ""}
          </button>
        </div>

        {/* Contenido de la pestaña seleccionada */}
        <div className="min-w-0 pt-6">
          {tab === "information" ? (
            <p className="max-w-3xl whitespace-pre-line wrap-break-word text-sm leading-7 text-(--text-secondary)">
              {product.descripcion ||
                "La descripción de esta salsa aún no está disponible."}
            </p>
          ) : (
            <ProductReviews
              id={id}
              reviews={reviews}
              error={reviewError}
              loading={loadingReviews}
              onRefresh={reloadReviews}
            />
          )}
        </div>
      </div>
    </section>
  );
}
