"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { useStore } from "@/components/providers";
import { useFeedback } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { ApiError, send } from "@/lib/api";
import type { Review } from "./use-product";
export function ProductReviews({
  id,
  reviews,
  error,
  loading,
  onRefresh,
}: {
  id: number;
  reviews: Review[];
  error: string;
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const { user } = useStore(),
    { notify } = useFeedback();
  const [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({});
  return (
    <section>
      {loading ? (
        <p role="status" className="text-sm">
          Consultando opiniones…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 text-sm text-(--action-danger)"
        >
          {error}
          <Button onClick={() => void onRefresh()}>Reintentar</Button>
        </div>
      ) : !reviews.length ? (
        <p className="text-sm text-(--text-secondary)">
          Todavía no hay opiniones para esta salsa.
        </p>
      ) : (
        <ul className="max-h-48 divide-y divide-(--border) overflow-y-auto pr-2">
          {reviews.map((r) => (
            <li key={r.id} className="py-3 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-xs">{r.nombre}</strong>
                <span
                  aria-label={`${r.calificacion} de 5 estrellas`}
                  className="flex text-(--brand-orange)"
                >
                  {Array.from({ length: r.calificacion }, (_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill="currentColor"
                      aria-hidden="true"
                    />
                  ))}
                </span>
              </div>
              <p className="mt-1.5 break-words text-sm text-(--text-secondary)">
                {r.comentario}
              </p>
            </li>
          ))}
        </ul>
      )}
      {user?.clienteId && (
        <form
          className="mt-5 border-t border-(--border) pt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const form = e.currentTarget,
              data = new FormData(form);
            setBusy(true);
            setFormError("");
            setFields({});
            try {
              await send("reviews", "POST", {
                id_producto: id,
                calificacion: Number(data.get("calificacion")),
                comentario: data.get("comentario"),
              });
              notify("Reseña registrada correctamente");
              form.reset();
              await onRefresh();
            } catch (e) {
              setFormError((e as Error).message);
              if (e instanceof ApiError) setFields(e.fields);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="mb-3 text-xs text-(--text-secondary)">
            Puedes opinar sobre productos que hayas comprado.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold" htmlFor={`rating-${id}`}>
              Calificación
            </label>
            <select
              id={`rating-${id}`}
              name="calificacion"
              className="field w-auto!"
              aria-invalid={Boolean(fields.calificacion)}
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} / 5
                </option>
              ))}
            </select>
          </div>
          {fields.calificacion && (
            <p className="text-xs text-(--action-danger)">
              {fields.calificacion}
            </p>
          )}
          <label className="label mt-3" htmlFor={`review-${id}`}>
            Tu opinión
          </label>
          <textarea
            id={`review-${id}`}
            name="comentario"
            required
            maxLength={2000}
            rows={2}
            className="field"
            aria-invalid={Boolean(fields.comentario)}
          />
          {fields.comentario && (
            <p className="text-xs text-(--action-danger)">
              {fields.comentario}
            </p>
          )}
          {formError && (
            <p role="alert" className="mt-2 text-sm text-(--action-danger)">
              {formError}
            </p>
          )}
          <Button variant="send" type="submit" busy={busy} className="mt-3">
            Publicar opinión
          </Button>
        </form>
      )}
    </section>
  );
}
