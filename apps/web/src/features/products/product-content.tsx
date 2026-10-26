"use client";

import { useState } from "react";
import Image from "next/image";
import { ShoppingBag, Star } from "lucide-react";
import { useStore } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Quantity } from "@/components/ui/quantity";
import { money } from "@/lib/api";
import { useProduct } from "./use-product";
import { ProductReviews } from "./product-reviews";

type ProductContentProps = {
  id: number;
  standalone?: boolean;
};

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
  const [tab, setTab] = useState("information");

  if (error) {
    return (
      <p role="alert" className="p-6 text-sm text-(--action-danger)">
        {error}
      </p>
    );
  }

  if (!product) {
    return (
      <p role="status" className="p-6 text-sm">
        Consultando salsa…
      </p>
    );
  }

  const stock = Math.max(0, Number(product.stock_actual));
  const Heading = standalone ? "h1" : "h3";

  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.calificacion, 0) /
      reviews.length
    : 0;

  return (
    <div className="grid min-w-0 gap-5 p-4 sm:p-6 md:grid-cols-[.9fr_1.1fr] md:gap-7">
      {/* Imagen principal del producto. */}
      <div className="relative mx-auto aspect-square w-full max-w-56 self-start rounded-xl bg-white md:sticky md:top-20 md:max-w-none">
        <Image
          src={product.imagen || "/logo/la-cosecha.png"}
          alt={product.nombre}
          fill
          sizes="(max-width: 767px) 224px, 360px"
          className="object-contain p-2"
        />
      </div>

      <div className="min-w-0">
        <p className="eyebrow mb-2">{product.categoria || "LA COSECHA"}</p>

        <Heading className="font-display text-3xl leading-tight">
          {product.nombre}
        </Heading>

        {/* Calificaciones y opiniones. */}
        <button
          type="button"
          className="mt-3 flex min-h-9 items-center gap-1.5 text-xs text-(--text-secondary)"
          onClick={() => setTab("reviews")}
        >
          <Star
            size={14}
            className="text-(--brand-orange)"
            fill={average ? "currentColor" : "none"}
          />

          {loadingReviews
            ? "Consultando opiniones…"
            : reviewError
              ? "Opiniones no disponibles"
              : reviews.length
                ? `${average.toFixed(1)} / 5 · ${reviews.length} opiniones`
                : "Sin calificaciones"}
        </button>

        {/* Precio del producto. */}
        <div className="mt-3 flex items-baseline gap-2">
          <strong className="text-3xl tracking-tight">
            {money(product.precio_final)}
          </strong>

          <span className="text-xs text-(--text-secondary)">MXN</span>

          {Number(product.precio_final) < Number(product.precio) && (
            <s className="text-sm text-(--text-muted)">
              {money(product.precio)}
            </s>
          )}
        </div>

        {/* Disponibilidad del inventario. */}
        <p
          className={`my-3 text-xs ${
            stock ? "text-(--action-buy)" : "text-(--text-muted)"
          }`}
        >
          {stock ? `${stock} unidades disponibles` : "Temporalmente agotado"}
        </p>

        {/* Selección de cantidad y carrito. */}
        <div className="flex flex-wrap gap-2">
          <Quantity
            value={quantity}
            max={stock}
            disabled={!stock || busy}
            onChange={setQuantity}
          />

          <Button
            variant="add"
            disabled={!stock}
            busy={busy}
            className="grow"
            onClick={async () => {
              if (busy) return;

              setBusy(true);

              try {
                await addToCart(id, quantity);
              } finally {
                setBusy(false);
              }
            }}
          >
            <ShoppingBag size={17} />
            Agregar al carrito
          </Button>
        </div>

        {/* Navegación entre información y opiniones. */}
        <div className="mb-4 mt-5 flex border-b border-(--border)">
          <button
            type="button"
            className="tab"
            aria-pressed={tab === "information"}
            onClick={() => setTab("information")}
          >
            Información
          </button>

          <button
            type="button"
            className="tab"
            aria-pressed={tab === "reviews"}
            onClick={() => setTab("reviews")}
          >
            Opiniones {reviews.length ? `(${reviews.length})` : ""}
          </button>
        </div>

        {/* Contenido de la pestaña seleccionada. */}
        {tab === "information" ? (
          <p className="whitespace-pre-line wrap-break-word text-sm leading-6 text-(--text-secondary)">
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
  );
}
