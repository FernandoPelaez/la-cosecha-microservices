"use client";

import Image from "next/image";
import { Pencil, Star, Trash2 } from "lucide-react";

import type { Product } from "@/types";

export interface Review {
  id: number;
  id_producto: number;
  nombre: string;
  calificacion: number;
  comentario: string;
}

interface ReviewListProps {
  reviews: Review[];
  products: Product[];
  busy?: boolean;
  onEdit: (review: Review) => void;
  onDelete: (review: Review) => void | Promise<void>;
}

const ACTION_CLASS =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-transparent px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";

function ReviewRating({ value }: { value: number }) {
  return (
    <div
      role="img"
      aria-label={`Calificación: ${value} de 5 estrellas`}
      className="mt-2 flex flex-wrap items-center gap-1"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={16}
          strokeWidth={1.8}
          fill={index < value ? "currentColor" : "none"}
          className={
            index < value
              ? "text-amber-500"
              : "text-(--border-strong)"
          }
          aria-hidden="true"
        />
      ))}

      <span
        aria-hidden="true"
        className="ml-2 text-xs text-(--text-secondary)"
      >
        {value} de 5
      </span>
    </div>
  );
}

export function ReviewList({
  reviews,
  products,
  busy = false,
  onEdit,
  onDelete,
}: ReviewListProps) {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0 divide-y divide-(--border) border-y border-(--border)">
      {reviews.map((review) => {
        const product = products.find(
          (item) => item.id === review.id_producto,
        );

        const image = product?.imagen || "/logo/la-cosecha.png";

        return (
          <article
            key={review.id}
            className="flex min-w-0 flex-col gap-4 py-5 sm:py-6 lg:flex-row lg:items-start lg:gap-6"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-5">
              <div className="relative size-20 shrink-0 sm:size-24">
                <Image
                  src={image}
                  alt={review.nombre}
                  fill
                  sizes="(max-width: 639px) 80px, 96px"
                  className="object-contain"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="wrap-break-word text-sm font-semibold text-(--text-primary) sm:text-base">
                  {review.nombre}
                </h3>

                <ReviewRating value={review.calificacion} />

                <p className="mt-3 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-(--text-secondary)">
                  {review.comentario}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 lg:pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => onEdit(review)}
                className={`${ACTION_CLASS} border-(--brand-secondary) text-(--brand-secondary)`}
                aria-label={`Editar reseña de ${review.nombre}`}
              >
                <Pencil
                  size={15}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                Editar
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void onDelete(review)}
                className={`${ACTION_CLASS} border-(--action-danger) text-(--action-danger)`}
                aria-label={`Eliminar reseña de ${review.nombre}`}
              >
                <Trash2
                  size={15}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                Eliminar
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

