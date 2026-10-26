"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import {
  ArrowUpRight,
  Plus,
  Star,
  Check,
} from "lucide-react";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useStore } from "@/components/providers";
import { money } from "@/lib/api";
import type { Product } from "@/types";

// Propiedades de la tarjeta del producto.
type ProductCardProps = {
  product: Product;
  index?: number;
  priority?: boolean;
  onOpen: () => void;
};

export function ProductCard({
  product,
  index = 0,
  priority = false,
  onOpen,
}: ProductCardProps) {
  const root = useRef<HTMLElement>(null);
  const { addToCart } = useStore();
  const [busy, setBusy] = useState(false);
  const { contextSafe } = useGSAP({
    scope: root,
  });

  // Animación de la imagen al pasar el cursor.
  const pose = contextSafe((active: boolean) => {
    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
    ) {
      return;
    }

    gsap.to(
      root.current?.querySelector(".product-photo img") || [],
      {
        y: active ? -6 : 0,
        rotate: active ? -2 : 0,
        duration: 0.45,
        ease: "power2.out",
        overwrite: true,
      },
    );
  });

  // Agregar el producto al carrito.
  const handleAddToCart = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await addToCart(product.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      ref={root}
      className="product-card"
      onPointerEnter={() => pose(true)}
      onPointerLeave={() => pose(false)}
    >
      {/* Imagen principal del producto */}
      <button
        type="button"
        className="product-photo"
        onClick={onOpen}
        aria-label={`Ver ${product.nombre}`}
      >
        <Image
          src={product.imagen || "/logo/la-cosecha.png"}
          alt={product.nombre}
          fill
          sizes="(max-width: 600px) 45vw, (max-width: 1100px) 30vw, 23vw"
          priority={priority}
        />

        {/* Número del producto */}
        <span className="product-number">
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Icono para abrir los detalles */}
        <span className="product-open">
          <ArrowUpRight size={15} />
        </span>
      </button>

      {/* Categoría */}
      <p className="product-category">
        {product.categoria || "LA COSECHA"}
      </p>

      {/* Nombre del producto */}
      <h3 className="product-name">
        <button
          type="button"
          onClick={onOpen}
        >
          {product.nombre}
        </button>
      </h3>

      {/* Calificaciones y opiniones */}
      {Number(product.review_count) > 0 && (
        <p className="text-xs mb-2 inline-flex gap-1 items-center">
          <Star size={12} />

          {Number(product.rating).toFixed(1)}
          {" · "}
          {product.review_count} opiniones
        </p>
      )}

      {/* Precio y botón para agregar al carrito */}
      <div className="product-buy-row">
        <div className="product-price">
          {Number(product.precio_final) <
            Number(product.precio) && (
            <s>{money(product.precio)}</s>
          )}

          {money(product.precio_final)}

          {" "}
          <small>MXN</small>
        </div>

        {/* Botón de agregar al carrito */}
        <button
          type="button"
          className="product-add"
          aria-label={`Agregar ${product.nombre} al carrito`}
          aria-busy={busy}
          disabled={busy || product.stock_actual <= 0}
          onClick={handleAddToCart}
        >
          {busy ? (
            <span aria-label="Procesando">
              …
            </span>
          ) : (
            <Plus size={18} />
          )}
        </button>
      </div>

      {/* Disponibilidad del producto */}
      <p className="product-availability">
        {product.stock_actual > 0 ? (
          <>
            <Check
              className="inline mr-1"
              size={11}
            />
            Disponible
          </>
        ) : (
          "Temporalmente agotada"
        )}
      </p>
    </article>
  );
}

