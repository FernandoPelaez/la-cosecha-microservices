"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface OrderPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function OrderPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: OrderPaginationProps) {
  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / pageSize),
  );

  const current = Math.min(
    Math.max(1, currentPage),
    totalPages,
  );

  const first = totalItems
    ? (current - 1) * pageSize + 1
    : 0;

  const last = Math.min(
    current * pageSize,
    totalItems,
  );

  const visibleCount = Math.min(3, totalPages);

  const firstPage = Math.max(
    1,
    Math.min(
      current - 1,
      totalPages - visibleCount + 1,
    ),
  );

  const pageNumbers = Array.from(
    { length: visibleCount },
    (_, index) => firstPage + index,
  );

  return (
    <footer className="flex flex-col gap-4 border-t border-(--border) px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p
        aria-live="polite"
        className="text-xs text-(--text-secondary) sm:text-sm"
      >
        Mostrando {first} – {last} de {totalItems}{" "}
        {totalItems === 1 ? "pedido" : "pedidos"}
      </p>

      {totalPages > 1 && (
        <nav
          aria-label="Paginación de pedidos"
          className="flex items-center gap-1.5 self-end sm:gap-2"
        >
          <button
            type="button"
            aria-label="Página anterior"
            disabled={current === 1}
            onClick={() => onPageChange(current - 1)}
            className="flex size-9 items-center justify-center rounded-lg border border-(--border) text-(--text-primary) hover:bg-(--surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={17} aria-hidden="true" />
          </button>

          {pageNumbers.map((number) => (
            <button
              key={number}
              type="button"
              aria-label={`Página ${number}`}
              aria-current={
                current === number ? "page" : undefined
              }
              onClick={() => onPageChange(number)}
              className={`flex size-9 items-center justify-center rounded-lg border text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) ${
                current === number
                  ? "border-(--brand-secondary) bg-(--brand-secondary) text-white"
                  : "border-(--border) text-(--text-primary) hover:bg-(--surface-soft)"
              }`}
            >
              {number}
            </button>
          ))}

          <button
            type="button"
            aria-label="Página siguiente"
            disabled={current === totalPages}
            onClick={() => onPageChange(current + 1)}
            className="flex size-9 items-center justify-center rounded-lg border border-(--border) text-(--text-primary) hover:bg-(--surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </nav>
      )}
    </footer>
  );
}

