"use client";

import { useState, type FormEvent } from "react";
import { Save, X } from "lucide-react";
import type { Address } from "@/types";
import { send, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";

interface AddressFormProps {
  value?: Address;
  onSaved: () => void;
  onCancel: () => void;
}

// Campos existentes y sus límites de longitud.
const ADDRESS_FIELDS = [
  {
    key: "calle_numero",
    label: "Calle y número",
    maxLength: 255,
  },
  {
    key: "colonia",
    label: "Colonia",
    maxLength: 150,
  },
  {
    key: "ciudad",
    label: "Ciudad",
    maxLength: 150,
  },
  {
    key: "codigo_postal",
    label: "Código postal",
    maxLength: 5,
  },
] as const;

// Estilos compartidos de los campos.
// El modificador ! evita el contorno azul definido en brand.css.
const BASE_FIELD_CLASS =
  "w-full min-w-0 rounded-xl border border-(--border) bg-(--surface) text-sm text-(--text-primary) outline-none focus:border-(--brand-secondary) focus-visible:outline-none! autofill:shadow-[inset_0_0_0_1000px_var(--surface)]";

const INPUT_CLASS = `${BASE_FIELD_CLASS} h-11 px-3.5`;

const TEXTAREA_CLASS =
  `${BASE_FIELD_CLASS} min-h-20 resize-y px-3.5 py-3`;

export function AddressForm({
  value,
  onSaved,
  onCancel,
}: AddressFormProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [fields, setFields] = useState<
    Record<string, string>
  >({});

  const { notify } = useFeedback();

  // Mantiene las operaciones originales de registro y edición.
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setFields({});

    try {
      const data = Object.fromEntries(
        new FormData(event.currentTarget),
      );

      await send(
        value ? `addresses/${value.id}` : "addresses",
        value ? "PUT" : "POST",
        data,
      );

      notify(
        value
          ? "Domicilio actualizado correctamente"
          : "Domicilio registrado correctamente",
      );

      onSaved();
    } catch (error) {
      setError((error as Error).message);

      if (error instanceof ApiError) {
        setFields(error.fields);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="min-w-0 px-4 py-5 sm:px-6 sm:py-6"
    >
      {/* Una columna en móvil y dos desde 640 px. */}
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        {ADDRESS_FIELDS.map((field) => {
          const fieldError = fields[field.key];
          const inputId = `address-${field.key}`;
          const errorId = `${inputId}-error`;

          return (
            <div key={field.key} className="min-w-0">
              <label
                htmlFor={inputId}
                className="mb-1.5 block text-sm font-semibold text-(--text-primary)"
              >
                {field.label}

                <span
                  aria-hidden="true"
                  className="ml-1 text-(--action-danger)"
                >
                  *
                </span>
              </label>

              <input
                id={inputId}
                name={field.key}
                type="text"
                defaultValue={String(
                  value?.[field.key as keyof Address] ?? "",
                )}
                maxLength={field.maxLength}
                required
                inputMode={
                  field.key === "codigo_postal"
                    ? "numeric"
                    : "text"
                }
                pattern={
                  field.key === "codigo_postal"
                    ? "[0-9]{5}"
                    : undefined
                }
                aria-invalid={Boolean(fieldError)}
                aria-describedby={
                  fieldError ? errorId : undefined
                }
                className={INPUT_CLASS}
              />

              {fieldError && (
                <p
                  id={errorId}
                  className="mt-1.5 text-xs text-(--action-danger)"
                >
                  {fieldError}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Referencias opcionales del domicilio. */}
      <div className="mt-4">
        <label
          htmlFor="address-referencias"
          className="mb-1.5 block text-sm font-semibold text-(--text-primary)"
        >
          Referencias

          <span className="ml-1 text-xs font-normal text-(--text-secondary)">
            (opcional)
          </span>
        </label>

        <textarea
          id="address-referencias"
          name="referencias"
          maxLength={1000}
          defaultValue={value?.referencias || ""}
          rows={3}
          aria-invalid={Boolean(fields.referencias)}
          aria-describedby={
            fields.referencias
              ? "address-referencias-error"
              : undefined
          }
          className={TEXTAREA_CLASS}
        />

        {fields.referencias && (
          <p
            id="address-referencias-error"
            className="mt-1.5 text-xs text-(--action-danger)"
          >
            {fields.referencias}
          </p>
        )}
      </div>

      {/* Errores devueltos por el backend. */}
      {error && (
        <p
          role="alert"
          className="mt-4 text-sm text-(--action-danger)"
        >
          {error}
        </p>
      )}

      {/* Botones compactos: cancelar rojo y guardar azul. */}
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
          Guardar domicilio
        </Button>
      </div>
    </form>
  );
}
