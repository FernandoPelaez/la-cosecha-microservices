"use client";
import { useState, type FormEvent } from "react";
import { UserRound, Save } from "lucide-react";
import { useStore } from "@/components/providers";
import { useFeedback } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { send } from "@/lib/api";
export function Profile() {
  const { user, refreshUser } = useStore(),
    { notify } = useFeedback();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!user) return null;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = new FormData(event.currentTarget);
    try {
      await send("auth/profile", "PUT", {
        nombre: values.get("nombre"),
        telefono: values.get("telefono"),
      });
      await refreshUser();
      notify("Tus datos quedaron actualizados");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel p-6 max-w-2xl">
      <div className="flex gap-3 items-center mb-5">
        <UserRound size={22} />
        <h2 className="font-display text-2xl">Mis datos</h2>
      </div>
      <form onSubmit={save} className="space-y-5">
        <div>
          <label className="label" htmlFor="profile-name">
            Nombre completo
          </label>
          <input
            id="profile-name"
            name="nombre"
            className="field"
            defaultValue={user.nombre}
            autoComplete="name"
            required
            minLength={3}
            maxLength={150}
            placeholder="Ej. Fernando Pérez López"
          />
        </div>
        <div>
          <label className="label" htmlFor="profile-phone">
            Teléfono
          </label>
          <input
            id="profile-phone"
            name="telefono"
            className="field"
            defaultValue={user.telefono || ""}
            autoComplete="tel-national"
            required
            inputMode="tel"
            pattern="[0-9]{10}"
            maxLength={10}
            placeholder="Ej. 6681234567"
            aria-describedby="phone-hint"
          />
          <p id="phone-hint" className="text-xs text-(--text-secondary) mt-2">
            10 dígitos, sin espacios.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="profile-email">
            Correo de acceso
          </label>
          <input
            id="profile-email"
            className="field"
            value={user.correo}
            readOnly
            type="email"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-(--action-danger)">
            {error}
          </p>
        )}
        <Button type="submit" variant="edit" busy={busy}>
          <Save size={16} />
          Actualizar datos
        </Button>
      </form>
    </section>
  );
}
