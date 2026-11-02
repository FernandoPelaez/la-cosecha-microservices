"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Review } from "./use-product";
import { ProductReviewSummary } from "./product-review-summary";
import { ProductReviewForm } from "./product-review-form";

type ProductReviewsProps = {
  id: number;
  reviews: Review[];
  error: string;
  loading: boolean;
  onRefresh: () => Promise<void>;
};

type SortOrder = "recent" | "highest" | "lowest";

const REVIEWS_PER_PAGE = 5;

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Formatear la fecha de cada opinión.
function reviewDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : dateFormatter.format(date);
}

export function ProductReviews({
  id,
  reviews,
  error,
  loading,
  onRefresh,
}: ProductReviewsProps) {
  const [sortOrder, setSortOrder] =
    useState<SortOrder>("recent");

  const [page, setPage] = useState(1);

  // Ordenar una copia sin modificar los datos del backend.
  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      if (sortOrder === "highest") {
        return (
          b.calificacion - a.calificacion ||
          b.id - a.id
        );
      }

      if (sortOrder === "lowest") {
        return (
          a.calificacion - b.calificacion ||
          b.id - a.id
        );
      }

      return (
        (Date.parse(b.fecha) || 0) -
          (Date.parse(a.fecha) || 0) ||
        b.id - a.id
      );
    });
  }, [reviews, sortOrder]);

  // Calcular la paginación de las opiniones.
  const totalPages = Math.max(
    1,
    Math.ceil(
      sortedReviews.length / REVIEWS_PER_PAGE,
    ),
  );

  const currentPage = Math.min(page, totalPages);
  const visibleReviews = sortedReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE,
  );

  return (
    <section
      aria-label="Opiniones de clientes"
      className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10"
    >
      {/* Listado de opiniones */}
      <div className="min-w-0">
        {loading ? (
          <p
            role="status"
            className="py-4 text-sm text-(--text-secondary)"
          >
            Consultando opiniones…
          </p>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 py-4"
          >
            <p className="text-sm text-(--action-danger)">
              {error}
            </p>

            <Button
              type="button"
              size="compact"
              onClick={() => void onRefresh()}
            >
              Reintentar
            </Button>
          </div>
        ) : reviews.length === 0 ? (
          <p className="border-b border-(--border) py-5 text-sm text-(--text-secondary)">
            Todavía no hay opiniones para esta salsa.
          </p>
        ) : (
          <>
            {/* Resumen de calificaciones */}
            <ProductReviewSummary reviews={reviews} />

            {/* Ordenamiento y paginación */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border) py-4">
              <label className="flex flex-wrap items-center gap-2 text-xs text-(--text-primary)">
                Ordenar por

                <select
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(
                      event.target.value as SortOrder,
                    );

                    setPage(1);
                  }}
                  className="min-h-10 max-w-full rounded-lg border border-(--border-strong) bg-(--surface) px-3 text-sm text-(--text-primary) focus:border-(--brand-secondary) focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none focus-visible:shadow-none"
                >
                  <option value="recent">
                    Más recientes
                  </option>

                  <option value="highest">
                    Mejor calificados
                  </option>

                  <option value="lowest">
                    Menor calificación
                  </option>
                </select>
              </label>

              {/* Controles de paginación */}
              {totalPages > 1 && (
                <nav
                  aria-label="Páginas de opiniones"
                  className="flex items-center gap-2"
                >
                  <span className="mr-1 text-xs text-(--text-secondary)">
                    Página {currentPage} de {totalPages}
                  </span>

                  {/* Página anterior */}
                  <button
                    type="button"
                    aria-label="Página anterior de opiniones"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setPage(currentPage - 1)
                    }
                    className="flex size-9 items-center justify-center rounded-lg border border-(--border-strong) text-(--brand-secondary) focus-visible:outline-2 focus-visible:outline-(--brand-secondary) disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft
                      size={17}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Página siguiente */}
                  <button
                    type="button"
                    aria-label="Página siguiente de opiniones"
                    disabled={
                      currentPage === totalPages
                    }
                    onClick={() =>
                      setPage(currentPage + 1)
                    }
                    className="flex size-9 items-center justify-center rounded-lg bg-(--brand-secondary) text-white focus-visible:outline-2 focus-visible:outline-(--brand-secondary) disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight
                      size={17}
                      aria-hidden="true"
                    />
                  </button>
                </nav>
              )}
            </div>

            {/* Comentarios de los clientes */}
            <ul
              className="divide-y divide-(--border)"
              aria-live="polite"
            >
              {visibleReviews.map((review) => {
                const fecha = reviewDate(
                  review.fecha,
                );

                return (
                  <li
                    key={review.id}
                    className="py-4"
                  >
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        {/* Nombre del cliente */}
                        <strong className="block wrap-break-word text-sm text-(--text-primary)">
                          {review.nombre}
                        </strong>

                        {/* Fecha de publicación */}
                        {fecha && (
                          <span className="mt-1 block text-xs text-(--text-secondary)">
                            {fecha}
                          </span>
                        )}
                      </div>

                      {/* Estrellas de calificación */}
                      <span
                        aria-label={`${review.calificacion} de 5 estrellas`}
                        className="flex shrink-0 gap-0.5 text-(--brand-orange)"
                      >
                        {Array.from(
                          { length: 5 },
                          (_, index) => (
                            <Star
                              key={index}
                              size={14}
                              aria-hidden="true"
                              fill={
                                index <
                                review.calificacion
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          ),
                        )}
                      </span>
                    </div>

                    {/* Texto de la opinión */}
                    <p className="mt-2 whitespace-pre-line wrap-break-word text-sm leading-6 text-(--text-secondary)">
                      {review.comentario}
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Formulario independiente para publicar opiniones */}
      <ProductReviewForm
        id={id}
        onRefresh={onRefresh}
        onPublished={() => setPage(1)}
      />
    </section>
  );
}
