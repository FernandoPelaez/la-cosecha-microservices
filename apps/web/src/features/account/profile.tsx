"use client";

import { useState, type FormEvent } from "react";
import { UserRound, Phone, Mail, Pencil, Save, X } from "lucide-react";
import { useStore } from "@/components/providers";
import { useFeedback } from "@/components/ui/feedback";
import { send } from "@/lib/api";
import { ProfileSecurity } from "./profile-security";
import { AccountDeletion } from "./account-deletion";

interface ProfileValues {
  nombre: string;
  telefono: string;
}

const buttonClass =
  "inline-flex h-10 w-40 max-w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60";

export function Profile() {
  const { user, refreshUser } = useStore();
  const { notify } = useFeedback();

  const [draft, setDraft] = useState<ProfileValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  const editing = draft !== null;

  function startEditing() {
    if (!user || busy) return;

    setDraft({
      nombre: user.nombre,
      telefono: user.telefono || "",
    });

    setError("");
  }

  function cancelEditing() {
    if (busy) return;

    setDraft(null);
    setError("");
  }

  function updateField(field: keyof ProfileValues, value: string) {
    setDraft((current) =>
      current ? { ...current, [field]: value } : current,
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft || busy) return;

    setError("");
    setBusy(true);

    const values = new FormData(event.currentTarget);

    try {
      await send("auth/profile", "PUT", {
        nombre: values.get("nombre"),
        telefono: values.get("telefono"),
      });

      await refreshUser();
      setDraft(null);
      notify("Tus datos quedaron actualizados");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="profile-title"
      className="w-full min-w-0 py-1 sm:py-2"
    >
      <div className="flex flex-col gap-4 border-b border-(--border-strong) pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <UserRound
            size={30}
            strokeWidth={1.7}
            className="mt-1 shrink-0 text-(--brand-secondary)"
          />

          <div className="min-w-0">
            <h2
              id="profile-title"
              className="font-display text-3xl text-(--text-primary)"
            >
              Mis datos
            </h2>

            <p className="mt-1 text-sm text-(--text-secondary)">
              Administra tu información personal y la seguridad de tu cuenta.
            </p>
          </div>
        </div>

        {!editing && (
          <button
            type="button"
            className={`${buttonClass} shrink-0 bg-(--action-buy) hover:bg-(--action-buy-hover)`}
            onClick={startEditing}
          >
            <Pencil size={16} />
            Editar datos
          </button>
        )}
      </div>

      <form onSubmit={save}>
        <dl className="mt-3">
          <div className="grid min-w-0 gap-2 border-b border-(--border) py-3 sm:grid-cols-[minmax(180px,32%)_minmax(0,1fr)] sm:items-center sm:gap-5">
            <dt
              id="profile-name-label"
              className="flex items-center gap-3 text-sm font-semibold"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--surface-soft) text-(--brand-secondary)">
                <UserRound size={18} strokeWidth={1.8} />
              </span>
              Nombre completo
            </dt>

            <dd className="min-w-0 text-sm sm:text-base">
              {editing ? (
                <input
                  id="profile-name"
                  name="nombre"
                  className="field"
                  value={draft.nombre}
                  onChange={(event) =>
                    updateField("nombre", event.target.value)
                  }
                  readOnly={busy}
                  aria-labelledby="profile-name-label"
                  autoComplete="name"
                  required
                  minLength={3}
                  maxLength={150}
                  placeholder="Ej. Fernando Pérez López"
                />
              ) : (
                <span className="block wrap-break-word text-(--text-primary)">
                  {user.nombre}
                </span>
              )}
            </dd>
          </div>

          <div className="grid min-w-0 gap-2 border-b border-(--border) py-3 sm:grid-cols-[minmax(180px,32%)_minmax(0,1fr)] sm:items-center sm:gap-5">
            <dt
              id="profile-phone-label"
              className="flex items-center gap-3 text-sm font-semibold"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--surface-soft) text-(--brand-secondary)">
                <Phone size={18} strokeWidth={1.8} />
              </span>
              Teléfono
            </dt>

            <dd className="min-w-0 text-sm sm:text-base">
              {editing ? (
                <>
                  <input
                    id="profile-phone"
                    name="telefono"
                    className="field"
                    value={draft.telefono}
                    onChange={(event) =>
                      updateField("telefono", event.target.value)
                    }
                    readOnly={busy}
                    aria-labelledby="profile-phone-label"
                    aria-describedby="phone-hint"
                    autoComplete="tel-national"
                    required
                    inputMode="tel"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    placeholder="Ej. 6681234567"
                  />

                  <p
                    id="phone-hint"
                    className="mt-2 text-xs text-(--text-secondary)"
                  >
                    10 dígitos, sin espacios.
                  </p>
                </>
              ) : (
                <span className="block text-(--text-primary)">
                  {user.telefono || "Sin registrar"}
                </span>
              )}
            </dd>
          </div>

          <div className="grid min-w-0 gap-2 border-b border-(--border) py-3 sm:grid-cols-[minmax(180px,32%)_minmax(0,1fr)] sm:items-center sm:gap-5">
            <dt
              id="profile-email-label"
              className="flex items-center gap-3 text-sm font-semibold"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--surface-soft) text-(--brand-secondary)">
                <Mail size={18} strokeWidth={1.8} />
              </span>
              Correo de acceso
            </dt>

            <dd className="min-w-0 text-sm sm:text-base">
              {editing ? (
                <input
                  id="profile-email"
                  className="field"
                  value={user.correo}
                  aria-labelledby="profile-email-label"
                  readOnly
                  type="email"
                />
              ) : (
                <span className="block break-all text-(--text-primary)">
                  {user.correo}
                </span>
              )}
            </dd>
          </div>
        </dl>

        {error && (
          <p
            role="alert"
            className="mt-4 text-sm text-(--action-danger)"
          >
            {error}
          </p>
        )}

        {editing && (
          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              className={`${buttonClass} bg-(--action-danger) hover:brightness-95`}
              disabled={busy}
              onClick={cancelEditing}
            >
              <X size={16} />
              Cancelar
            </button>

            <button
              type="submit"
              className={`${buttonClass} bg-(--action-edit) hover:brightness-95`}
              disabled={busy}
            >
              <Save size={16} />
              {busy ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}
      </form>

      <ProfileSecurity />

      <AccountDeletion />
    </section>
  );
}
