"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Save, X } from "lucide-react";
import type { Address } from "@/types";
import { api, send, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";

interface AddressFormProps {
  value?: Address;
  onSaved: () => void;
  onCancel: () => void;
}

interface PostalCodeResult {
  codigo_postal: string;
  ciudad: string;
  estado: string;
  colonias: string[];
}

type PostalStatus = "idle" | "loading" | "valid" | "error";

const INPUT_CLASS =
  "h-10 w-full min-w-0 rounded-lg border border-(--border) bg-(--surface) px-3 text-base text-(--text-primary) outline-none focus:border-(--brand-secondary) focus-visible:outline-none! disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm";

const LABEL_CLASS =
  "mb-1.5 block text-sm font-medium text-(--text-primary)";

export function AddressForm({
  value,
  onSaved,
  onCancel,
}: AddressFormProps) {
  const { notify } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  const [codigoPostal, setCodigoPostal] = useState(
    value?.codigo_postal ?? "",
  );
  const [colonia, setColonia] = useState(value?.colonia ?? "");
  const [ciudad, setCiudad] = useState("");
  const [colonias, setColonias] = useState<string[]>([]);
  const [postalStatus, setPostalStatus] = useState<PostalStatus>("idle");
  const [postalError, setPostalError] = useState("");

  // Consulta el código postal y descarta respuestas de búsquedas anteriores.
  useEffect(() => {
    if (!/^\d{5}$/.test(codigoPostal)) return;

    const controller = new AbortController();
    setPostalStatus("loading");
    setPostalError("");

    const timer = window.setTimeout(async () => {
      try {
        const result = await api<PostalCodeResult>(
          `addresses/postal-code/${codigoPostal}`,
          { signal: controller.signal },
        );

        if (
          result.codigo_postal !== codigoPostal ||
          result.ciudad !== "Los Mochis" ||
          !Array.isArray(result.colonias) ||
          result.colonias.length === 0
        ) {
          throw new Error("No se pudo validar este código postal.");
        }

        if (controller.signal.aborted) return;

        setColonias(result.colonias);
        setCiudad(result.ciudad);
        setColonia((actual) => {
          const coincidencia = result.colonias.find(
            (nombre) =>
              nombre.localeCompare(actual, "es-MX", {
                sensitivity: "base",
              }) === 0,
          );

          return coincidencia ??
            (result.colonias.length === 1 ? result.colonias[0] : "");
        });
        setPostalStatus("valid");
      } catch (cause) {
        if (controller.signal.aborted) return;

        setColonias([]);
        setColonia("");
        setCiudad("");
        setPostalStatus("error");
        setPostalError(
          cause instanceof Error
            ? cause.message
            : "No se pudo consultar el código postal.",
        );
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [codigoPostal]);

  function cambiarCodigoPostal(valor: string) {
    const siguiente = valor.replace(/\D/g, "").slice(0, 5);
    if (siguiente === codigoPostal) return;

    setCodigoPostal(siguiente);
    setColonia("");
    setCiudad("");
    setColonias([]);
    setPostalStatus("idle");
    setPostalError("");
    setError("");
    setFields({});
  }

  // Conserva el alta y la edición existentes; el backend valida la cobertura.
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (postalStatus !== "valid" || !colonia) {
      setError("Valida el código postal y selecciona una colonia.");
      return;
    }

    setBusy(true);
    setError("");
    setFields({});

    try {
      const data = {
        ...Object.fromEntries(new FormData(event.currentTarget)),
        codigo_postal: codigoPostal,
        colonia,
        ciudad,
      };

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
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar el domicilio.",
      );

      if (cause instanceof ApiError) {
        setFields(cause.fields);
      }
    } finally {
      setBusy(false);
    }
  }

  const puedeGuardar = postalStatus === "valid" && Boolean(colonia);

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-xl min-w-0 px-3 py-4 sm:px-5 sm:py-5"
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="address-codigo-postal" className={LABEL_CLASS}>
            Código postal <span className="text-(--action-danger)">*</span>
          </label>
          <input
            id="address-codigo-postal"
            name="codigo_postal"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            pattern="[0-9]{5}"
            required
            value={codigoPostal}
            onChange={(event) => cambiarCodigoPostal(event.target.value)}
            aria-invalid={Boolean(postalError || fields.codigo_postal)}
            aria-describedby={
              postalError || fields.codigo_postal || postalStatus === "loading"
                ? "address-codigo-postal-status"
                : undefined
            }
            className={INPUT_CLASS}
          />
          {(postalStatus === "loading" ||
            postalError ||
            fields.codigo_postal) && (
            <p
              id="address-codigo-postal-status"
              role={postalError || fields.codigo_postal ? "alert" : "status"}
              className={`mt-1 text-xs ${
                postalError || fields.codigo_postal
                  ? "text-(--action-danger)"
                  : "text-(--text-secondary)"
              }`}
            >
              {postalError ||
                fields.codigo_postal ||
                "Consultando código postal..."}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <label htmlFor="address-ciudad" className={LABEL_CLASS}>
            Ciudad <span className="text-(--action-danger)">*</span>
          </label>
          <input
            id="address-ciudad"
            name="ciudad"
            type="text"
            value={ciudad}
            readOnly
            required
            placeholder="Se completa automáticamente"
            aria-invalid={Boolean(fields.ciudad)}
            className={`${INPUT_CLASS} read-only:cursor-default`}
          />
          {fields.ciudad && (
            <p className="mt-1 text-xs text-(--action-danger)">
              {fields.ciudad}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <label htmlFor="address-colonia" className={LABEL_CLASS}>
            Colonia <span className="text-(--action-danger)">*</span>
          </label>
          <select
            id="address-colonia"
            name="colonia"
            value={colonia}
            onChange={(event) => {
              setColonia(event.target.value);
              setError("");
            }}
            disabled={postalStatus !== "valid"}
            required
            aria-invalid={Boolean(fields.colonia)}
            className={INPUT_CLASS}
          >
            <option value="">Selecciona una colonia</option>
            {colonias.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
          {fields.colonia && (
            <p className="mt-1 text-xs text-(--action-danger)">
              {fields.colonia}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <label htmlFor="address-calle-numero" className={LABEL_CLASS}>
            Calle y número <span className="text-(--action-danger)">*</span>
          </label>
          <input
            id="address-calle-numero"
            name="calle_numero"
            type="text"
            autoComplete="street-address"
            defaultValue={value?.calle_numero ?? ""}
            maxLength={255}
            required
            aria-invalid={Boolean(fields.calle_numero)}
            className={INPUT_CLASS}
          />
          {fields.calle_numero && (
            <p className="mt-1 text-xs text-(--action-danger)">
              {fields.calle_numero}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="address-referencias" className={LABEL_CLASS}>
          Referencias{" "}
          <span className="font-normal text-(--text-secondary)">
            (opcional)
          </span>
        </label>
        <textarea
          id="address-referencias"
          name="referencias"
          defaultValue={value?.referencias ?? ""}
          maxLength={1000}
          rows={2}
          aria-invalid={Boolean(fields.referencias)}
          className={`${INPUT_CLASS} h-auto min-h-16 resize-y py-2`}
        />
        {fields.referencias && (
          <p className="mt-1 text-xs text-(--action-danger)">
            {fields.referencias}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-(--action-danger)">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-(--border) pt-4">
        <Button
          type="button"
          variant="cancel"
          size="compact"
          className="whitespace-nowrap"
          disabled={busy}
          onClick={onCancel}
        >
          <X size={15} strokeWidth={1.8} aria-hidden="true" />
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="edit"
          size="compact"
          className="whitespace-nowrap"
          busy={busy}
          disabled={!puedeGuardar}
        >
          <Save size={15} strokeWidth={1.8} aria-hidden="true" />
          Guardar domicilio
        </Button>
      </div>
    </form>
  );
}