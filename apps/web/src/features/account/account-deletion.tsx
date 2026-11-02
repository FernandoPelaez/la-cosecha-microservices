"use client";

import { useRef, useState, type FormEvent } from "react";
import { AlertTriangle, Eye, EyeOff, Trash2, X } from "lucide-react";
import { send } from "@/lib/api";

interface AccountDeletionResult {
  completed: boolean;
  accountClosed: boolean;
}

export function AccountDeletion() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [passwordActual, setPasswordActual] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function openDialog() {
    setError("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (busy) return;
    dialogRef.current?.close();
  }

  function resetDialog() {
    setPasswordActual("");
    setConfirmacion("");
    setShowPassword(false);
    setError("");
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || !passwordActual || confirmacion !== "ELIMINAR") {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result = await send<AccountDeletionResult>(
        "auth/account",
        "DELETE",
        {
          passwordActual,
          confirmacion,
        },
      );

      if (!result.completed || !result.accountClosed) {
        throw new Error("No se pudo confirmar el cierre de la cuenta.");
      }

      setPasswordActual("");
      setConfirmacion("");

      // El gateway elimina la cookie tras el cierre exitoso.
      window.location.replace("/");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo procesar la solicitud. Inténtalo nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="account-deletion-title"
      className="mt-8 w-full min-w-0"
    >
      <div className="flex flex-col gap-4 border-b border-(--border-strong) pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Trash2
            size={28}
            strokeWidth={1.7}
            className="mt-1 shrink-0 text-(--action-danger)"
          />

          <div className="min-w-0">
            <h3
              id="account-deletion-title"
              className="font-display text-2xl text-(--text-primary)"
            >
              Zona de cuenta
            </h3>

            <p className="mt-1 text-sm text-(--text-secondary)">
              Administra la eliminación de tu cuenta y tus datos personales.
            </p>

            <p className="mt-2 text-sm text-(--text-secondary)">
              Esta acción puede ser irreversible. Antes de continuar,
              asegúrate de comprender sus consecuencias.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openDialog}
          className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-(--action-danger) px-4 text-sm font-semibold text-white hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--action-danger) sm:w-40"
        >
          <Trash2 size={16} />
          Eliminar cuenta
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-account-dialog-title"
        aria-describedby="delete-account-dialog-description"
        onClose={resetDialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        className="fixed top-1/2 left-1/2 m-0 h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-(--border) bg-(--surface) p-0 text-(--text-primary) shadow-2xl backdrop:bg-black/50"
      >
        <div className="flex items-start justify-between gap-4 border-b border-(--border) px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle
              size={24}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-(--action-danger)"
            />

            <div className="min-w-0">
              <h4
                id="delete-account-dialog-title"
                className="font-display text-xl text-(--text-primary)"
              >
                Eliminar cuenta
              </h4>

              <p className="mt-1 text-sm text-(--text-secondary)">
                Operación sensible
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDialog}
            disabled={busy}
            aria-label="Cerrar ventana"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-(--text-secondary) hover:bg-(--surface-soft) disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleDelete}>
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <p
              id="delete-account-dialog-description"
              className="text-sm leading-6 text-(--text-primary)"
            >
              Al confirmar, se cerrará tu cuenta y perderás el acceso
              a ella. Esta operación no se puede deshacer desde tu perfil.
            </p>

            <div className="flex items-start gap-3 rounded-lg bg-(--surface-soft) p-4">
              <AlertTriangle
                size={19}
                className="mt-0.5 shrink-0 text-(--action-danger)"
              />

              <p className="text-sm leading-6 text-(--text-secondary)">
                Los registros comerciales que deban conservarse, como
                pedidos, pagos y comprobantes, permanecerán almacenados.
                Parte de la información histórica puede conservar datos
                personales.
              </p>
            </div>

            <div>
              <label
                htmlFor="delete-account-password"
                className="mb-2 block text-sm font-semibold text-(--text-primary)"
              >
                Contraseña actual
              </label>

              <div className="relative">
                <input
                  id="delete-account-password"
                  type={showPassword ? "text" : "password"}
                  className="field w-full pr-12"
                  value={passwordActual}
                  onChange={(event) =>
                    setPasswordActual(event.target.value)
                  }
                  autoComplete="current-password"
                  maxLength={72}
                  disabled={busy}
                  placeholder="Ingresa tu contraseña"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={busy}
                  aria-label={
                    showPassword
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-(--text-secondary) hover:text-(--brand-secondary) disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="delete-account-confirmation"
                className="mb-2 block text-sm font-semibold text-(--text-primary)"
              >
                Confirmación
              </label>

              <p className="mb-2 text-sm text-(--text-secondary)">
                Escribe <strong>ELIMINAR</strong> para confirmar.
              </p>

              <input
                id="delete-account-confirmation"
                type="text"
                className="field w-full"
                value={confirmacion}
                onChange={(event) =>
                  setConfirmacion(event.target.value)
                }
                autoComplete="off"
                maxLength={8}
                disabled={busy}
                placeholder="ELIMINAR"
                required
              />
            </div>

            {error && (
              <p
                role="alert"
                className="text-sm text-(--action-danger)"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-(--border) px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={closeDialog}
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-(--brand-secondary) px-4 text-sm font-semibold text-white hover:bg-(--brand-secondary-hover) disabled:cursor-not-allowed disabled:opacity-50 sm:w-32"
            >
              <X size={16} />
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                busy ||
                !passwordActual ||
                confirmacion !== "ELIMINAR"
              }
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-(--action-danger) px-4 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Trash2 size={16} />
              {busy ? "Procesando..." : "Eliminar mi cuenta"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
