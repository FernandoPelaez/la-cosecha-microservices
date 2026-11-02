"use client";

import { useState, type FormEvent } from "react";
import { Save, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Review } from "./review-list";

interface ReviewEditFormProps {
  review: Review;
  busy?: boolean;
  error?: string;
  onSave: (
    values: Pick<Review, "calificacion" | "comentario">,
  ) => void | Promise<void>;
  onCancel: () => void;
}

const FIELD_CLASS =
  "w-full min-w-0 rounded-xl border border-(--border) bg-(--surface) px-3.5 text-sm text-(--text-primary) focus:border-(--brand-secondary) focus-visible:outline-none! disabled:cursor-not-allowed disabled:opacity-60";

export function ReviewEditForm({
  review,
  busy = false,
  error,
  onSave,
  onCancel,
}: ReviewEditFormProps) {
  const [calificacion, setCalificacion] = useState(
    review.calificacion,
  );

  const [comentario, setComentario] = useState(
    review.comentario,
  );

  // Enviar los cambios al componente principal.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    void onSave({
      calificacion,
      comentario,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={busy}
      className="min-w-0 px-4 py-5 sm:px-6 sm:py-6"
    >
      {/* Información del producto */}
      <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-(--border) pb-5">
        <div className="min-w-0">
          <p className="text-xs text-(--text-secondary)">
            Producto reseñado
          </p>

          <h3 className="mt-1 wrap-break-word text-base font-semibold text-(--text-primary)">
            {review.nombre}
          </h3>
        </div>

        {/* Vista previa de la calificación */}
        <div
          role="img"
          aria-label={`${calificacion} de 5 estrellas`}
          className="flex shrink-0 items-center gap-1"
        >
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={18}
              strokeWidth={1.8}
              fill={
                index < calificacion
                  ? "currentColor"
                  : "none"
              }
              className={
                index < calificacion
                  ? "text-amber-500"
                  : "text-(--border-strong)"
              }
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      {/* Campos del formulario */}
      <div className="space-y-5">
        {/* Calificación */}
        <div>
          <label
            htmlFor="review-rating"
            className="mb-1.5 block text-sm font-semibold text-(--text-primary)"
          >
            Calificación
            <span
              aria-hidden="true"
              className="ml-1 text-(--action-danger)"
            >
              *
            </span>
          </label>

          <select
            id="review-rating"
            name="calificacion"
            required
            disabled={busy}
            value={calificacion}
            onChange={(event) =>
              setCalificacion(Number(event.target.value))
            }
            className={`${FIELD_CLASS} h-11`}
          >
            {[1, 2, 3, 4, 5].map((rating) => (
              <option key={rating} value={rating}>
                {rating} de 5 estrellas
              </option>
            ))}
          </select>
        </div>

        {/* Comentario */}
        <div>
          <label
            htmlFor="review-comment"
            className="mb-1.5 block text-sm font-semibold text-(--text-primary)"
          >
            Tu comentario
            <span
              aria-hidden="true"
              className="ml-1 text-(--action-danger)"
            >
              *
            </span>
          </label>

          <textarea
            id="review-comment"
            name="comentario"
            required
            maxLength={2000}
            rows={4}
            disabled={busy}
            value={comentario}
            onChange={(event) =>
              setComentario(event.target.value)
            }
            className={`${FIELD_CLASS} min-h-28 resize-y py-3`}
          />

          <p className="mt-1.5 text-right text-xs text-(--text-muted)">
            {comentario.length} / 2000 caracteres
          </p>
        </div>
      </div>

      {/* Mensajes de error */}
      {error && (
        <p
          role="alert"
          className="mt-4 text-sm text-(--action-danger)"
        >
          {error}
        </p>
      )}

      {/* Botones compactos y responsivos */}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-(--border) pt-4">
        <Button
          type="button"
          variant="cancel"
          size="compact"
          disabled={busy}
          onClick={onCancel}
        >
          <X
            size={15}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          Cancelar
        </Button>

        <Button
          type="submit"
          variant="edit"
          size="compact"
          busy={busy}
        >
          <Save
            size={15}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          Guardar reseña
        </Button>
      </div>
    </form>
  );
}
