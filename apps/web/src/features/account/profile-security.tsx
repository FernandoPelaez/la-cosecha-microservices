"use client";

import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Save,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { send } from "@/lib/api";

interface PasswordValues {
  passwordActual: string;
  passwordNueva: string;
  confirmacion: string;
}

interface PasswordFieldProps {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
  minLength?: number;
  hint?: string;
}

const initialValues: PasswordValues = {
  passwordActual: "",
  passwordNueva: "",
  confirmacion: "",
};

const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60";

function PasswordField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  autoComplete,
  disabled,
  minLength,
  hint,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="grid min-w-0 gap-2 border-b border-(--border) py-3 sm:grid-cols-[minmax(180px,32%)_minmax(0,1fr)] sm:items-center sm:gap-5">
      <label
        htmlFor={id}
        className="flex items-center gap-3 text-sm font-semibold"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--surface-soft) text-(--brand-secondary)">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        {label}
      </label>

      <div className="min-w-0">
        <div className="relative">
          <input
            id={id}
            type={visible ? "text" : "password"}
            className="field w-full pr-12"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete={autoComplete}
            disabled={disabled}
            minLength={minLength}
            maxLength={72}
            aria-describedby={hint ? `${id}-hint` : undefined}
            required
          />

          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-(--text-secondary) hover:text-(--brand-secondary)"
            onClick={() => setVisible((current) => !current)}
            disabled={disabled}
            aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>

        {hint && (
          <p
            id={`${id}-hint`}
            className="mt-2 text-xs text-(--text-secondary)"
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProfileSecurity() {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<PasswordValues>(initialValues);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  function updateField(field: keyof PasswordValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function cancelEditing() {
    if (busy) return;

    setEditing(false);
    setValues(initialValues);
    setError("");
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || completed) return;

    const { passwordActual, passwordNueva, confirmacion } = values;

    if (passwordNueva !== confirmacion) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    if (passwordActual === passwordNueva) {
      setError("La nueva contraseña debe ser diferente de la actual.");
      return;
    }

    if (new TextEncoder().encode(passwordNueva).byteLength > 72) {
      setError("La nueva contraseña no puede superar los 72 bytes.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      await send("auth/password", "PUT", {
        passwordActual,
        passwordNueva,
      });

      setValues(initialValues);
      setEditing(false);
      setCompleted(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo cambiar la contraseña. Inténtalo nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="profile-security-title"
      className="mt-8 w-full min-w-0"
    >
      <div className="flex flex-col gap-4 border-b border-(--border-strong) pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <LockKeyhole
            size={28}
            strokeWidth={1.7}
            className="mt-1 shrink-0 text-(--brand-secondary)"
          />

          <div className="min-w-0">
            <h3
              id="profile-security-title"
              className="font-display text-2xl text-(--text-primary)"
            >
              Seguridad
            </h3>

            <p className="mt-1 text-sm text-(--text-secondary)">
              Mantén tu cuenta protegida con una contraseña segura.
            </p>
          </div>
        </div>

        {!editing && !completed && (
          <button
            type="button"
            className={`${buttonClass} w-full shrink-0 border border-(--brand-secondary) text-(--brand-secondary) hover:bg-(--surface-soft) sm:w-auto`}
            onClick={() => setEditing(true)}
          >
            <KeyRound size={16} />
            Cambiar contraseña
          </button>
        )}
      </div>

      {editing && !completed && (
        <form onSubmit={changePassword} className="mt-3">
          <PasswordField
            id="security-password-current"
            label="Contraseña actual"
            icon={LockKeyhole}
            value={values.passwordActual}
            onChange={(value) => updateField("passwordActual", value)}
            autoComplete="current-password"
            disabled={busy}
          />

          <PasswordField
            id="security-password-new"
            label="Nueva contraseña"
            icon={KeyRound}
            value={values.passwordNueva}
            onChange={(value) => updateField("passwordNueva", value)}
            autoComplete="new-password"
            disabled={busy}
            minLength={12}
            hint="Usa al menos 12 caracteres, sin superar los 72 bytes."
          />

          <PasswordField
            id="security-password-confirm"
            label="Confirmar contraseña"
            icon={ShieldCheck}
            value={values.confirmacion}
            onChange={(value) => updateField("confirmacion", value)}
            autoComplete="new-password"
            disabled={busy}
            minLength={12}
          />

          {error && (
            <p
              role="alert"
              className="mt-4 text-sm text-(--action-danger)"
            >
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              className={`${buttonClass} w-full bg-(--action-danger) text-white hover:brightness-95 sm:w-40`}
              onClick={cancelEditing}
              disabled={busy}
            >
              <X size={16} />
              Cancelar
            </button>

            <button
              type="submit"
              className={`${buttonClass} w-full bg-(--action-edit) text-white hover:brightness-95 sm:w-auto`}
              disabled={busy}
            >
              <Save size={16} />
              {busy ? "Actualizando..." : "Guardar contraseña"}
            </button>
          </div>
        </form>
      )}

      {completed && (
        <div
          role="status"
          className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <CheckCircle2
              size={22}
              className="mt-0.5 shrink-0 text-(--brand-secondary)"
            />

            <div className="min-w-0">
              <p className="text-sm font-semibold text-(--text-primary)">
                Contraseña actualizada correctamente
              </p>

              <p className="mt-1 text-sm text-(--text-secondary)">
                Tu sesión se cerró por seguridad. Vuelve a iniciar
                sesión para continuar.
              </p>
            </div>
          </div>

          <a
            href="/"
            className={`${buttonClass} w-full shrink-0 border border-(--brand-secondary) text-(--brand-secondary) hover:bg-(--surface-soft) sm:w-auto`}
          >
            Volver a la tienda
          </a>
        </div>
      )}
    </section>
  );
}
