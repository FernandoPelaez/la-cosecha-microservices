"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Pencil,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";

import { useStore } from "@/components/providers";
import { Dialog } from "@/components/ui/dialog";
import { useFeedback } from "@/components/ui/feedback";
import { api, send } from "@/lib/api";

import { ReviewList, type Review } from "./review-list";
import { ReviewEditForm } from "./review-edit-form";
import {
  ReviewPagination,
  REVIEWS_PER_PAGE,
} from "./review-pagination";

// Normalizar texto para búsquedas sin acentos ni mayúsculas.
function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

/**
 * Administración de reseñas del cliente.
 * El servidor restringe la edición y eliminación
 * al propietario de cada reseña.
 */
export function MyReviews() {
  const { products } = useStore();
  const { notify, confirm } = useFeedback();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editing, setEditing] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("all");
  const [page, setPage] = useState(1);

  // Consultar las reseñas del usuario.
  const load = useCallback(async () => {
    try {
      const data = await api<Review[]>("reviews");

      setReviews(data);
      setError("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Abrir formulario de edición.
  function startEdit(review: Review) {
    if (busy) return;

    setEditError("");
    setEditing(review);
  }

  // Cerrar formulario de edición.
  function closeEdit() {
    setEditing(null);
    setEditError("");
  }

  // Guardar los cambios de una reseña.
  async function saveReview(
    values: Pick<Review, "calificacion" | "comentario">,
  ) {
    if (!editing || busy) return;

    setBusy(true);
    setEditError("");

    try {
      await send(`reviews/${editing.id}`, "PUT", values);

      closeEdit();
      notify("Reseña actualizada");

      await load();
    } catch (error) {
      setEditError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Eliminar una reseña previa confirmación.
  async function deleteReview(review: Review) {
    if (busy) return;

    const accepted = await confirm(
      "Eliminar reseña",
      `¿Deseas eliminar tu reseña de ${review.nombre}?`,
      "delete",
      {
        cancelLabel: "Cancelar",
        confirmLabel: "Eliminar",
        neutralCancel: true,
      },
    );

    if (!accepted) return;

    setBusy(true);

    try {
      await send(`reviews/${review.id}`, "DELETE");

      notify("Reseña eliminada");

      await load();
    } catch (error) {
      notify((error as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  // Filtrar por producto, comentario y calificación.
  const normalizedSearch = normalizeText(search);

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      !normalizedSearch ||
      normalizeText(
        `${review.nombre} ${review.comentario}`,
      ).includes(normalizedSearch);

    const matchesRating =
      rating === "all" ||
      review.calificacion === Number(rating);

    return matchesSearch && matchesRating;
  });

  // Calcular las reseñas visibles según la página.
  const totalPages = Math.max(
    1,
    Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE),
  );

  const currentPage = Math.min(page, totalPages);

  const visibleReviews = filteredReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE,
  );

  return (
    <section
      aria-labelledby="my-reviews-title"
      className="min-w-0"
    >
      {/* Encabezado de la sección */}
      <header className="mb-6 flex min-w-0 items-start gap-3 border-b border-(--border) pb-6 sm:gap-4">
        <Star
          size={32}
          strokeWidth={1.8}
          className="mt-1 shrink-0 text-(--brand-secondary)"
          aria-hidden="true"
        />

        <div className="min-w-0">
          <h2
            id="my-reviews-title"
            className="font-display text-2xl text-(--text-primary) sm:text-3xl"
          >
            Mis reseñas
          </h2>

          <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
            Administra las reseñas que has realizado
            sobre nuestras salsas.
          </p>
        </div>
      </header>

      {/* Errores de consulta */}
      {error && (
        <p
          role="alert"
          className="mb-5 text-sm text-(--action-danger)"
        >
          {error}
        </p>
      )}

      {/* Buscador y filtro por calificación */}
      {reviews.length > 0 && (
        <div className="mb-5 flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="shrink-0 text-sm font-semibold text-(--text-primary)">
            {reviews.length}{" "}
            {reviews.length === 1 ? "reseña" : "reseñas"}
          </p>

          <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:max-w-160">
            {/* Buscador */}
            <label className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl border border-(--border) bg-(--surface) px-3.5 focus-within:border-(--brand-secondary)">
              <Search
                size={17}
                strokeWidth={1.8}
                className="shrink-0 text-(--brand-secondary)"
                aria-hidden="true"
              />

              <span className="sr-only">
                Buscar en mis reseñas
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar en mis reseñas..."
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-(--text-primary) outline-none placeholder:text-(--text-muted) focus-visible:outline-none!"
              />
            </label>

            {/* Filtro */}
            <label className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl border border-(--border) bg-(--surface) px-3.5 focus-within:border-(--brand-secondary)">
              <SlidersHorizontal
                size={17}
                strokeWidth={1.8}
                className="shrink-0 text-(--brand-secondary)"
                aria-hidden="true"
              />

              <span className="sr-only">
                Filtrar por calificación
              </span>

              <select
                value={rating}
                onChange={(event) => {
                  setRating(event.target.value);
                  setPage(1);
                }}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-(--text-primary) outline-none focus-visible:outline-none!"
              >
                <option value="all">
                  Todas las calificaciones
                </option>
                <option value="5">5 estrellas</option>
                <option value="4">4 estrellas</option>
                <option value="3">3 estrellas</option>
                <option value="2">2 estrellas</option>
                <option value="1">1 estrella</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {/* Contenido de reseñas */}
      {loading ? (
        <p
          role="status"
          className="py-8 text-center text-sm text-(--text-secondary)"
        >
          Cargando tus reseñas...
        </p>
      ) : reviews.length === 0 ? (
        !error && (
          <div className="border-y border-(--border) px-4 py-12 text-center">
            <Star
              size={32}
              strokeWidth={1.5}
              className="mx-auto mb-4 text-(--brand-secondary)"
              aria-hidden="true"
            />

            <h3 className="font-display text-xl text-(--text-primary)">
              Aún no tienes reseñas
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-(--text-secondary)">
              Puedes escribir una reseña desde el detalle
              de los productos que hayas comprado.
            </p>
          </div>
        )
      ) : filteredReviews.length === 0 ? (
        <div className="border-y border-(--border) px-4 py-10 text-center">
          <Search
            size={28}
            strokeWidth={1.5}
            className="mx-auto mb-3 text-(--brand-secondary)"
            aria-hidden="true"
          />

          <h3 className="text-base font-semibold text-(--text-primary)">
            No se encontraron reseñas
          </h3>

          <p className="mt-2 text-sm text-(--text-secondary)">
            Prueba con otra búsqueda o calificación.
          </p>
        </div>
      ) : (
        <>
          {/* Listado de reseñas */}
          <ReviewList
            reviews={visibleReviews}
            products={products}
            busy={busy}
            onEdit={startEdit}
            onDelete={deleteReview}
          />

          {/* Paginación: cuatro reseñas por página */}
          <ReviewPagination
            page={currentPage}
            totalItems={filteredReviews.length}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Modal de edición */}
      {editing && (
        <Dialog
          size="medium"
          title="Editar reseña"
          titleIcon={
            <Pencil
              size={24}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          }
          description="Actualiza tu calificación y comentario sobre el producto."
          onClose={closeEdit}
        >
          <ReviewEditForm
            key={editing.id}
            review={editing}
            busy={busy}
            error={editError}
            onSave={saveReview}
            onCancel={closeEdit}
          />
        </Dialog>
      )}
    </section>
  );
}

