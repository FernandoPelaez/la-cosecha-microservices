"use client";
import { useState, type FormEvent } from "react";
import type { Address } from "@/types";
import { send, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";
export function AddressForm({
  value,
  onSaved,
  onCancel,
}: {
  value?: Address;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({});
  const { notify } = useFeedback();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setFields({});
    try {
      await send(
        value ? `addresses/${value.id}` : "addresses",
        value ? "PUT" : "POST",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      notify(
        value
          ? "Domicilio actualizado correctamente"
          : "Domicilio registrado correctamente",
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError) setFields(e.fields);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="panel p-5">
      <h3 className="mb-5 font-display text-xl">
        {value ? "Editar domicilio" : "Nuevo domicilio"}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { key: "calle_numero", label: "Calle y número", max: 255 },
          { key: "colonia", label: "Colonia", max: 150 },
          { key: "ciudad", label: "Ciudad", max: 150 },
          { key: "codigo_postal", label: "Código postal", max: 5 },
        ].map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key} className="label">
              {f.label}
            </label>
            <input
              id={f.key}
              name={f.key}
              defaultValue={String(value?.[f.key as keyof Address] || "")}
              maxLength={f.max}
              required
              pattern={f.key === "codigo_postal" ? "[0-9]{5}" : undefined}
              className="field"
            />
            {fields[f.key] && (
              <p className="text-xs text-(--action-danger)">{fields[f.key]}</p>
            )}
          </div>
        ))}
      </div>
      <label className="label mt-4" htmlFor="referencias">
        Referencias (opcional)
      </label>
      <textarea
        id="referencias"
        name="referencias"
        maxLength={1000}
        defaultValue={value?.referencias || ""}
        className="field"
        rows={2}
      />
      {error && (
        <p role="alert" className="my-3 text-sm text-(--action-danger)">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="cancel" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant={value ? "edit" : "save"} busy={busy}>
          Guardar domicilio
        </Button>
      </div>
    </form>
  );
}
