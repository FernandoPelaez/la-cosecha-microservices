"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export const REVIEWS_PER_PAGE = 4;

interface ReviewPaginationProps {
  page: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

const BUTTON_CLASS =
  "inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm";

export function ReviewPagination({
  page,
  totalItems,
  onPageChange,
}: ReviewPaginationProps) {
  const totalPages = Math.ceil(
    totalItems / REVIEWS_PER_PAGE,
  );

  if (totalPages <= 1) {
    return null;
  }

  const currentPage = Math.min(
    Math.max(page, 1),
    totalPages,
  );

  const firstItem =
    (currentPage - 1) * REVIEWS_PER_PAGE + 1;

  const lastItem = Math.min(
    currentPage * REVIEWS_PER_PAGE,
    totalItems,
  );

  const firstVisiblePage = Math.min(
    Math.max(currentPage - 1, 1),
    Math.max(totalPages - 2, 1),
  );

  const visiblePages = Array.from(
    { length: Math.min(totalPages, 3) },
    (_, index) => firstVisiblePage + index,
  );

  return (
    <nav
      aria-label="Paginación de reseñas"
      className="mt-6 flex min-w-0 flex-col items-center justify-between gap-4 border-t border-(--border) pt-5 sm:flex-row"
    >
      <p
        aria-live="polite"
        className="text-center text-xs text-(--text-secondary) sm:text-left"
      >
        Mostrando {firstItem}–{lastItem} de {totalItems} reseñas
      </p>

      <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`${BUTTON_CLASS} border-(--border) bg-transparent text-(--text-primary)`}
        >
          <ChevronLeft
            size={15}
            aria-hidden="true"
          />
          Anterior
        </button>

        {visiblePages.map((pageNumber) => {
          const active = pageNumber === currentPage;

          return (
            <button
              key={pageNumber}
              type="button"
              aria-label={`Ir a la página ${pageNumber}`}
              aria-current={active ? "page" : undefined}
              onClick={() => onPageChange(pageNumber)}
              className={`${BUTTON_CLASS} min-w-10 ${
                active
                  ? "border-(--brand-secondary) bg-(--brand-secondary) text-white"
                  : "border-(--border) bg-transparent text-(--text-primary)"
              }`}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`${BUTTON_CLASS} border-(--border) bg-transparent text-(--text-primary)`}
        >
          Siguiente
          <ChevronRight
            size={15}
            aria-hidden="true"
          />
        </button>
      </div>
    </nav>
  );
}

