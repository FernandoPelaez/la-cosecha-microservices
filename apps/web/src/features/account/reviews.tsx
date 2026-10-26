"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";
import { api, send } from "@/lib/api";
interface Review {
  id: number;
  id_producto: number;
  nombre: string;
  calificacion: number;
  comentario: string;
}
/** El servidor limita edición y borrado al propietario de cada reseña. */
export function MyReviews() {
  const [reviews, setReviews] = useState<Review[]>([]),
    [editing, setEditing] = useState<Review | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { notify, confirm } = useFeedback();
  const load = useCallback(async () => {
    try {
      setReviews(await api<Review[]>("reviews"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    try {
      await send(`reviews/${editing.id}`, "PUT", {
        calificacion: editing.calificacion,
        comentario: editing.comentario,
      });
      setEditing(null);
      notify("Reseña actualizada");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4" aria-label="Mis reseñas">
      {error && (
        <p role="alert" className="text-sm text-(--action-danger)">
          {error}
        </p>
      )}
      {editing && (
        <form onSubmit={save} className="panel space-y-4 p-5">
          <h2 className="font-display text-xl">
            Editar reseña de {editing.nombre}
          </h2>
          <label className="block text-sm">
            Calificación
            <select
              className="field mt-2"
              value={editing.calificacion}
              onChange={(e) =>
                setEditing({ ...editing, calificacion: Number(e.target.value) })
              }
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} de 5
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Comentario
            <textarea
              required
              maxLength={2000}
              className="field mt-2"
              value={editing.comentario}
              onChange={(e) =>
                setEditing({ ...editing, comentario: e.target.value })
              }
            />
          </label>
          <div className="flex gap-3">
            <Button type="submit" variant="edit" busy={busy}>
              Guardar reseña
            </Button>
            <Button variant="cancel" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
      {!reviews.length && !error && (
        <p className="panel p-6 text-sm">
          Aún no has publicado reseñas. Puedes escribirlas en el detalle de cada
          producto que hayas comprado.
        </p>
      )}
      {reviews.map((r) => (
        <article key={r.id} className="panel p-5">
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="font-semibold">{r.nombre}</h2>
            <span className="text-sm">{r.calificacion} de 5</span>
          </div>
          <p className="my-4 whitespace-pre-wrap text-sm">{r.comentario}</p>
          <div className="flex gap-3">
            <Button variant="edit" onClick={() => setEditing(r)}>
              Editar
            </Button>
            <Button
              variant="delete"
              disabled={busy}
              onClick={async () => {
                if (
                  !(await confirm(
                    "Eliminar reseña",
                    "¿Deseas eliminar tu reseña?",
                  ))
                )
                  return;
                setBusy(true);
                try {
                  await send(`reviews/${r.id}`, "DELETE");
                  notify("Reseña eliminada");
                  await load();
                } catch (e) {
                  notify((e as Error).message, true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Eliminar
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}
