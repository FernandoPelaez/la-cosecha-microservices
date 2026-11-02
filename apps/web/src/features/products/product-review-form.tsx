"use client";

import { useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { useStore } from "@/components/providers";
import { useFeedback } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { ApiError, send } from "@/lib/api";

type ProductReviewFormProps = {
  id: number;
  onRefresh: () => Promise<void>;
  onPublished: () => void;
};

export function ProductReviewForm({
  id,
  onRefresh,
  onPublished,
}: ProductReviewFormProps) {
  const { user } = useStore();
  const { notify } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [rating, setRating] = useState(5);

  // Mantener el permiso original:
  // solo los clientes pueden publicar reseñas.
  if (!user?.clienteId) return null;

  // Registrar una opinión utilizando el endpoint existente.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    setBusy(true);
    setFormError("");
    setFields({});

    try {
      await send("reviews", "POST", {
        id_producto: id,
        calificacion: rating,
        comentario: data.get("comentario"),
      });

      notify("Reseña registrada correctamente");

      form.reset();
      setRating(5);

      onPublished();
      await onRefresh();
    } catch (cause) {
      setFormError((cause as Error).message);

      if (cause instanceof ApiError) {
        setFields(cause.fields);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 rounded-xl border border-(--border) bg-(--surface) p-4 sm:p-6"
    >
      {/* Encabezado del formulario */}
      <h3 className="font-display text-2xl text-(--brand-secondary)">
        Escribe tu opinión
      </h3>

      <p className="mt-1 text-xs leading-5 text-(--text-secondary)">
        Puedes opinar sobre productos que hayas comprado.
      </p>

      {/* Selección de calificación */}
      <fieldset className="mt-5 min-w-0">
        <legend className="mb-2 text-sm font-semibold text-(--text-primary)">
          Calificación
        </legend>

        <div className="flex flex-wrap items-center gap-1.5">
          {Array.from({ length: 5 }, (_, index) => {
            const value = index + 1;

            return (
              <button
                key={value}
                type="button"
                aria-label={`${value} de 5 estrellas`}
                aria-pressed={rating === value}
                disabled={busy}
                onClick={() => setRating(value)}
                className="flex size-10 items-center justify-center rounded-lg text-(--brand-orange) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) disabled:opacity-50"
              >
                <Star
                  size={24}
                  fill={
                    value <= rating
                      ? "currentColor"
                      : "none"
                  }
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        {/* Error de calificación */}
        {fields.calificacion && (
          <p className="mt-1 text-xs text-(--action-danger)">
            {fields.calificacion}
          </p>
        )}
      </fieldset>

      {/* Etiqueta del campo de opinión */}
      <label
        htmlFor={`review-${id}`}
        className="mt-4 mb-2 block text-sm font-semibold text-(--text-primary)"
      >
        Tu opinión
      </label>

      {/* Campo de opinión sin contornos adicionales */}
      <textarea
        id={`review-${id}`}
        name="comentario"
        required
        maxLength={2000}
        rows={3}
        disabled={busy}
        placeholder="Cuéntanos qué te pareció la salsa..."
        aria-invalid={Boolean(fields.comentario)}
        style={{
          outline: "none",
          outlineOffset: 0,
          boxShadow: "none",
        }}
        className={`w-full min-w-0 resize-y rounded-lg border bg-(--surface) px-3 py-3 text-sm leading-6 text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--brand-secondary) focus-visible:border-(--brand-secondary) disabled:cursor-not-allowed disabled:opacity-60 ${
          fields.comentario
            ? "border-(--action-danger)"
            : "border-(--border-strong)"
        }`}
      />

      {/* Error del campo de opinión */}
      {fields.comentario && (
        <p className="mt-1 text-xs text-(--action-danger)">
          {fields.comentario}
        </p>
      )}

      {/* Error general de publicación */}
      {formError && (
        <p
          role="alert"
          className="mt-3 text-sm text-(--action-danger)"
        >
          {formError}
        </p>
      )}

      {/* Publicar opinión */}
      <Button
        variant="save"
        type="submit"
        busy={busy}
        className="mt-4 w-full focus-visible:outline-(--brand-secondary)"
      >
        Publicar opinión
      </Button>
    </form>
  );
}

