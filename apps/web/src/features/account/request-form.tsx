"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";
import { send } from "@/lib/api";
import type { Order } from "./types";

interface RequestFormProps {
  orders: Order[];
  onSaved: () => void;
}

type RequestKind = "returns" | "warranties";

const FIELD_CLASS =
  "h-11 w-full min-w-0 rounded-xl border border-(--border) bg-(--surface) px-3.5 text-sm text-(--text-primary) focus:border-(--brand-secondary) focus-visible:outline-none! disabled:cursor-not-allowed disabled:opacity-60";

const LABEL_CLASS =
  "mb-1.5 block text-sm font-semibold text-(--text-primary)";

export function RequestForm({
  orders,
  onSaved,
}: RequestFormProps) {
  const [kind, setKind] = useState<RequestKind>("returns");
  const [sale, setSale] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { notify } = useFeedback();

  // Identificar los productos de la compra seleccionada.
  const order = orders.find(
    (item) => String(item.id_venta) === sale,
  );

  // Registrar una devolución o garantía.
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    const data = Object.fromEntries(
      new FormData(event.currentTarget),
    );

    try {
      await send(kind, "POST", {
        ...data,
        id_venta: Number(data.id_venta),
        id_producto: Number(data.id_producto),
        cantidad:
          kind === "returns"
            ? Number(data.cantidad)
            : undefined,
      });

      notify("Solicitud registrada correctamente");
      onSaved();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby="register-request-title"
      aria-busy={busy}
      className="min-w-0"
    >
      {/* Encabezado */}
      <div className="mb-6">
        <h2
          id="register-request-title"
          className="font-display text-2xl text-(--brand-secondary) sm:text-3xl"
        >
          Registrar una solicitud
        </h2>

        <p className="mt-1.5 text-sm text-(--text-secondary)">
          Completa los siguientes datos para iniciar el proceso.
        </p>
      </div>

      {/* Datos de la solicitud */}
      <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-12">
        {/* Tipo de solicitud */}
        <div
          className={`min-w-0 ${
            kind === "returns"
              ? "xl:col-span-3"
              : "xl:col-span-4"
          }`}
        >
          <label
            htmlFor="request-kind"
            className={LABEL_CLASS}
          >
            Tipo de solicitud
            <span className="ml-1 text-(--action-danger)">
              *
            </span>
          </label>

          <select
            id="request-kind"
            value={kind}
            disabled={busy}
            onChange={(event) =>
              setKind(event.target.value as RequestKind)
            }
            className={FIELD_CLASS}
          >
            <option value="returns">Devolución</option>
            <option value="warranties">Garantía</option>
          </select>
        </div>

        {/* Compra */}
        <div
          className={`min-w-0 ${
            kind === "returns"
              ? "xl:col-span-3"
              : "xl:col-span-4"
          }`}
        >
          <label
            htmlFor="sale-id"
            className={LABEL_CLASS}
          >
            Compra
            <span className="ml-1 text-(--action-danger)">
              *
            </span>
          </label>

          <select
            id="sale-id"
            name="id_venta"
            required
            disabled={busy}
            value={sale}
            onChange={(event) =>
              setSale(event.target.value)
            }
            className={FIELD_CLASS}
          >
            <option value="">
              Selecciona una compra
            </option>

            {orders
              .filter((item) => item.id_venta)
              .map((item) => (
                <option
                  key={item.id_venta}
                  value={item.id_venta!}
                >
                  Pedido #{item.id_pedido}
                </option>
              ))}
          </select>
        </div>

        {/* Producto */}
        <div className="min-w-0 xl:col-span-4">
          <label
            htmlFor="request-product"
            className={LABEL_CLASS}
          >
            Producto
            <span className="ml-1 text-(--action-danger)">
              *
            </span>
          </label>

          <select
            key={sale}
            id="request-product"
            name="id_producto"
            required
            disabled={busy}
            className={FIELD_CLASS}
          >
            <option value="">
              Selecciona el producto
            </option>

            {order?.items.map((item) => (
              <option
                key={item.id_producto}
                value={item.id_producto}
              >
                {item.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Cantidad: únicamente para devoluciones */}
        {kind === "returns" && (
          <div className="min-w-0 xl:col-span-2">
            <label
              htmlFor="request-qty"
              className={LABEL_CLASS}
            >
              Cantidad
              <span className="ml-1 text-(--action-danger)">
                *
              </span>
            </label>

            <input
              id="request-qty"
              name="cantidad"
              type="number"
              min="1"
              max="10000"
              defaultValue="1"
              required
              disabled={busy}
              className={FIELD_CLASS}
            />
          </div>
        )}
      </div>

      {/* Motivo y envío */}
      <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end xl:gap-4">
        <div className="min-w-0">
          <label
            htmlFor="request-reason"
            className={LABEL_CLASS}
          >
            Motivo
            <span className="ml-1 text-(--action-danger)">
              *
            </span>
          </label>

          <textarea
            id="request-reason"
            name="motivo"
            required
            maxLength={2000}
            rows={3}
            disabled={busy}
            placeholder="Describe el motivo de tu solicitud..."
            className="min-h-20 w-full min-w-0 resize-y rounded-xl border border-(--border) bg-(--surface) px-3.5 py-3 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--brand-secondary) focus-visible:outline-none! disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <Button
          type="submit"
          variant="save"
          size="compact"
          busy={busy}
          className="shrink-0 justify-self-end"
        >
          <Send
            size={15}
            strokeWidth={1.8}
            aria-hidden="true"
          />
          Enviar solicitud
        </Button>
      </div>

      {/* Errores del servidor */}
      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-(--action-danger)"
        >
          {error}
        </p>
      )}
    </form>
  );
}
