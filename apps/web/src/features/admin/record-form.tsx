"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { RecordData } from "@/types";
import type { FieldSpec, ModuleConfig } from "./types";
import { api, send, ApiError } from "@/lib/api";
import { localDateTimeInput } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { ItemLines } from "./item-lines";

export function RecordForm({
  config,
  row,
  onSaved,
  onCancel,
}: {
  config: ModuleConfig;
  row: RecordData | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const fields =
    row && config.editFields
      ? config.editFields(row)
      : config.fields || [];

  const [options, setOptions] = useState<
    Record<string, RecordData[]>
  >({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<unknown[]>([]);

  const multiStep = fields.length > 8;
  const visible = multiStep
    ? fields.slice(step * 6, step * 6 + 6)
    : fields;

  const last =
    !multiStep ||
    step === Math.ceil(fields.length / 6) - 1;

  useEffect(() => {
    const sources = [
      ...new Set(
        fields.flatMap((field) =>
          field.source ? [field.source] : [],
        ),
      ),
    ];

    Promise.all(
      sources.map(
        async (source) =>
          [source, await api<RecordData[]>(source)] as const,
      ),
    )
      .then((result) => {
        setOptions(Object.fromEntries(result));
      })
      .catch((error) => {
        setError(error.message);
      });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    if (!last) {
      setStep((value) => value + 1);
      return;
    }

    setBusy(true);
    setError("");
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const data: RecordData = {};

    for (const field of fields) {
      data[field.key] =
        field.type === "checkbox"
          ? formData.has(field.key)
          : field.type === "multiselect"
            ? formData.getAll(field.key).map(Number)
            : field.type === "items"
              ? items
              : (formData.get(field.key) ?? "");
    }

    try {
      const endpoint = row
        ? config.editPath?.(row) ||
          `${config.writeEndpoint || config.endpoint}/${row.id}`
        : config.writeEndpoint || config.endpoint;

      const method = row
        ? config.editMethod || "PUT"
        : "POST";

      const payload = config.transform
        ? config.transform(data)
        : data;

      await send(endpoint, method, payload);

      onSaved();
    } catch (error) {
      setError((error as Error).message);

      if (error instanceof ApiError) {
        setErrors(error.fields);

        const invalid = fields.findIndex((field) =>
          Boolean(error.fields[field.key]),
        );

        setStep(Math.max(0, Math.floor(invalid / 6)));
      }
    } finally {
      setBusy(false);
    }
  }

  const invalidSelect = fields.some(
    (field) =>
      field.type === "select" &&
      field.options?.length === 0,
  );

  return (
    <form onSubmit={submit} className="p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-2xl">
          {row ? "Editar registro" : "Nuevo registro"}
        </h2>

        {multiStep && (
          <span className="text-xs text-(--text-secondary)">
            Paso {step + 1} de{" "}
            {Math.ceil(fields.length / 6)}
          </span>
        )}
      </div>

      {invalidSelect ? (
        <p className="mb-4 text-sm">
          Este registro ya no admite cambios de estado.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => {
            const isVisible = visible.includes(field);

            const fullWidth = [
              "textarea",
              "items",
              "multiselect",
            ].includes(field.type || "");

            return (
              <div
                key={field.key}
                hidden={!isVisible}
                className={
                  fullWidth ? "md:col-span-2" : ""
                }
              >
                <label
                  htmlFor={`field-${field.key}`}
                  className="label"
                >
                  {field.label}
                </label>

                <Field
                  field={field}
                  value={
                    row?.[field.key] ?? field.default
                  }
                  options={
                    options[field.source || ""] || []
                  }
                  onItems={setItems}
                  visible={isVisible}
                />

                {errors[field.key] && (
                  <p
                    role="alert"
                    className="mt-1 text-xs text-(--action-danger)"
                  >
                    {errors[field.key]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="my-4 text-sm text-(--action-danger)"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="cancel"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </Button>

        {step > 0 && (
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              setStep((value) => value - 1)
            }
          >
            Anterior
          </Button>
        )}

        <Button
          type="submit"
          variant={row ? "edit" : "save"}
          disabled={invalidSelect}
          busy={busy}
        >
          {last ? "Guardar cambios" : "Continuar"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  field,
  value,
  options,
  onItems,
  visible,
}: {
  field: FieldSpec;
  value: unknown;
  options: RecordData[];
  onItems: (items: unknown[]) => void;
  visible: boolean;
}) {
  const examples: Record<string, string> = {
    nombre: "Ej. Nombre del registro",
    descripcion: "Describe los datos confirmados del producto",
    motivo: "Explica el motivo de esta operación",
    destinatario: "Ej. Ana Pérez López",
    firma_evidencia:
      "https://ejemplo.com/evidencias/entrega.jpg",
    paqueteria: "Nombre de la paquetería contratada",
    num_guia: "Guía proporcionada por la paquetería",
    precio: "Ej. 65.00",
    costo: "Ej. 40.00, si está confirmado",
    cantidad: "Ej. 12",
    tipo_envase: "Ej. Frasco de vidrio",
    tipo_tapa: "Ej. Tapa roscada",
    observaciones: "Añade información relevante",
    correo: "compras@ejemplo.com",
    telefono: "Ej. 6681234567",
    direccion: "Calle, número, colonia y ciudad",
    rfc: "Ej. XAXX010101000",
    lote: "Ej. LOTE-2026-01",
    serie: "Identificador del producto",
    categoria: "Ej. Salsas",
    resolucion: "Describe la resolución autorizada",
  };

  const common = {
    id: `field-${field.key}`,
    name: field.key,
    required: visible && field.required,
    className: "field",
    placeholder:
      field.placeholder ||
      examples[field.key] ||
      (field.type === "number" ? "Ej. 10" : undefined),
  };

  if (field.type === "items") {
    return (
      <ItemLines
        products={options}
        onChange={onItems}
      />
    );
  }

  if (field.type === "checkbox") {
    return (
      <input
        {...common}
        required={false}
        type="checkbox"
        defaultChecked={Boolean(value)}
        className="h-5 w-5 accent-(--action-buy)"
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        {...common}
        maxLength={field.max || 4000}
        rows={3}
        defaultValue={String(value || "")}
      />
    );
  }

  if (
    field.type === "select" ||
    field.type === "multiselect"
  ) {
    const list =
      field.options ||
      options.map((option) => ({
        value: String(option.id),
        label: String(
          option[field.sourceLabel || "nombre"] ||
            option.id,
        ),
      }));

    const selected =
      field.type === "multiselect"
        ? String(value || "").split(",")
        : String(value ?? "");

    return (
      <select
        {...common}
        multiple={field.type === "multiselect"}
        defaultValue={selected}
        size={
          field.type === "multiselect"
            ? Math.min(6, list.length || 3)
            : undefined
        }
      >
        {field.type !== "multiselect" && (
          <option value="">
            Selecciona una opción
          </option>
        )}

        {list.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  let str = String(value ?? "");
  if (field.type === "datetime-local" && str) {
    str = localDateTimeInput(str);
  }

  if (field.type === "date" && str) {
    str = str.slice(0, 10);
  }

  return (
    <input
      {...common}
      defaultValue={str}
      type={field.type || "text"}
      min={field.min}
      max={
        field.type === "number"
          ? field.max
          : undefined
      }
      maxLength={
        field.type !== "number"
          ? field.max
          : undefined
      }
      step={field.step}
    />
  );
}

