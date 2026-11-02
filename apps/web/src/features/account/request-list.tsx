"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import type { RecordData } from "@/types";

interface RequestListProps {
  requests: RecordData[];
}

const PAGE_SIZE = 3;

const GRID_COLUMNS =
  "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,0.85fr)]";

const PAGE_BUTTON_CLASS =
  "inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border px-2.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) disabled:cursor-not-allowed disabled:opacity-40 sm:px-3";

export function RequestList({ requests }: RequestListProps) {
  const [page, setPage] = useState(1);

  // Calcular las páginas disponibles.
  const totalPages = Math.max(
    1,
    Math.ceil(requests.length / PAGE_SIZE),
  );

  // Evitar páginas inexistentes si cambia el historial.
  const currentPage = Math.min(page, totalPages);

  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const visibleRequests = requests.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  // Mostrar hasta tres números de página.
  const firstVisiblePage = Math.min(
    Math.max(currentPage - 1, 1),
    Math.max(totalPages - 2, 1),
  );

  const visiblePages = Array.from(
    { length: Math.min(totalPages, 3) },
    (_, index) => firstVisiblePage + index,
  );

  return (
    <section
      aria-labelledby="requests-history-title"
      className="mt-8 min-w-0 border-t border-(--border) pt-7 sm:mt-10 sm:pt-8"
    >
      {/* Encabezado */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="requests-history-title"
            className="font-display text-2xl text-(--brand-secondary) sm:text-3xl"
          >
            Mis solicitudes
          </h2>

          <p className="mt-1.5 text-sm text-(--text-secondary)">
            Consulta el estado de tus garantías y devoluciones.
          </p>
        </div>

        <span className="text-xs text-(--text-secondary)">
          {requests.length}{" "}
          {requests.length === 1
            ? "solicitud"
            : "solicitudes"}
        </span>
      </header>

      {/* Historial vacío */}
      {requests.length === 0 ? (
        <p className="border-y border-(--border) py-8 text-sm text-(--text-secondary)">
          No tienes solicitudes registradas.
        </p>
      ) : (
        <>
          {/* Tabla sin tarjetas */}
          <div className="min-w-0">
            {/* Encabezados de escritorio */}
            <div
              className={`hidden gap-x-4 border-b border-(--border-strong) pb-3 text-xs font-semibold uppercase tracking-wider text-(--text-muted) lg:grid ${GRID_COLUMNS}`}
            >
              <span>Solicitud</span>
              <span>Producto</span>
              <span>Motivo</span>
              <span>Estado</span>
            </div>

            {/* Filas de solicitudes */}
            <div className="divide-y divide-(--border) border-b border-(--border)">
              {visibleRequests.map((request) => {
                const type = String(request.tipo ?? "");
                const id = String(request.id ?? "");
                const product = String(request.nombre ?? "");
                const reason = String(request.motivo ?? "");
                const state = String(request.estado ?? "");

                return (
                  <article
                    key={`${type}-${id}`}
                    className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 py-4 lg:items-center lg:gap-y-0 lg:py-5 ${GRID_COLUMNS}`}
                  >
                    {/* Solicitud */}
                    <div className="col-start-1 row-start-1 min-w-0">
                      <h3 className="wrap-break-word text-sm font-semibold text-(--brand-secondary)">
                        {type} #{id}
                      </h3>

                      <p className="mt-1 text-xs text-(--text-muted)">
                        {type}
                      </p>
                    </div>

                    {/* Producto */}
                    <div className="col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1">
                      <p className="mb-1 text-xs text-(--text-muted) lg:hidden">
                        Producto
                      </p>

                      <p className="wrap-break-word text-sm font-medium text-(--text-primary)">
                        {product}
                      </p>
                    </div>

                    {/* Motivo y resolución */}
                    <div className="col-span-2 row-start-3 min-w-0 lg:col-span-1 lg:col-start-3 lg:row-start-1">
                      <p className="mb-1 text-xs text-(--text-muted) lg:hidden">
                        Motivo
                      </p>

                      <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-(--text-secondary)">
                        {reason}
                      </p>

                      {request.resolucion ? (
                        <p className="mt-2 whitespace-pre-wrap wrap-break-word text-xs leading-5 text-(--text-secondary)">
                          <span className="font-semibold">
                            Resolución:
                          </span>{" "}
                          {String(request.resolucion)}
                        </p>
                      ) : null}
                    </div>

                    {/* Estado */}
                    <div className="col-start-2 row-start-1 justify-self-end lg:col-start-4 lg:justify-self-start">
                      <StatusBadge state={state} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <nav
              aria-label="Paginación de solicitudes"
              className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row"
            >
              <p
                aria-live="polite"
                className="text-center text-xs text-(--text-secondary) sm:text-left"
              >
                Mostrando {startIndex + 1}–
                {Math.min(
                  startIndex + PAGE_SIZE,
                  requests.length,
                )}{" "}
                de {requests.length} solicitudes
              </p>

              <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
                {/* Anterior */}
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setPage(currentPage - 1)
                  }
                  className={`${PAGE_BUTTON_CLASS} border-(--border) bg-transparent text-(--text-primary)`}
                >
                  <ChevronLeft
                    size={15}
                    aria-hidden="true"
                  />
                  Anterior
                </button>

                {/* Números de página */}
                {visiblePages.map((pageNumber) => {
                  const active =
                    pageNumber === currentPage;

                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      aria-label={`Ir a la página ${pageNumber}`}
                      aria-current={
                        active ? "page" : undefined
                      }
                      onClick={() =>
                        setPage(pageNumber)
                      }
                      className={`${PAGE_BUTTON_CLASS} min-w-9 ${
                        active
                          ? "border-(--brand-secondary) bg-(--brand-secondary) text-white"
                          : "border-(--border) bg-transparent text-(--text-primary)"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                {/* Siguiente */}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setPage(currentPage + 1)
                  }
                  className={`${PAGE_BUTTON_CLASS} border-(--border) bg-transparent text-(--text-primary)`}
                >
                  Siguiente
                  <ChevronRight
                    size={15}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

