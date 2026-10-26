"use client";
import { useState } from "react";
import type { Order } from "./types";
import { send } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";
export function RequestForm({
  orders,
  onSaved,
}: {
  orders: Order[];
  onSaved: () => void;
}) {
  const [kind, setKind] = useState("returns"),
    [sale, setSale] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { notify } = useFeedback();
  const order = orders.find((o) => String(o.id_venta) === sale);
  return (
    <form
      className="panel p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        const d = Object.fromEntries(new FormData(e.currentTarget));
        try {
          await send(kind, "POST", {
            ...d,
            id_venta: Number(d.id_venta),
            id_producto: Number(d.id_producto),
            cantidad: kind === "returns" ? Number(d.cantidad) : undefined,
          });
          notify("Solicitud registrada correctamente");
          onSaved();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="mb-5 font-display text-2xl">Registrar una solicitud</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="request-kind" className="label">
            Tipo de solicitud
          </label>
          <select
            id="request-kind"
            className="field"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="returns">Devolución</option>
            <option value="warranties">Garantía</option>
          </select>
        </div>
        <div>
          <label htmlFor="sale-id" className="label">
            Compra
          </label>
          <select
            id="sale-id"
            name="id_venta"
            className="field"
            required
            value={sale}
            onChange={(e) => setSale(e.target.value)}
          >
            <option value="">Selecciona una compra</option>
            {orders
              .filter((o) => o.id_venta)
              .map((o) => (
                <option key={o.id_venta} value={o.id_venta!}>
                  Pedido #{o.id_pedido}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="request-product" className="label">
            Producto
          </label>
          <select
            key={sale}
            id="request-product"
            name="id_producto"
            className="field"
            required
          >
            <option value="">Selecciona el producto</option>
            {order?.items.map((i) => (
              <option key={i.id_producto} value={i.id_producto}>
                {i.nombre}
              </option>
            ))}
          </select>
        </div>
        {kind === "returns" && (
          <div>
            <label htmlFor="request-qty" className="label">
              Cantidad
            </label>
            <input
              id="request-qty"
              name="cantidad"
              type="number"
              min="1"
              max="10000"
              defaultValue="1"
              required
              className="field"
            />
          </div>
        )}
      </div>
      <label htmlFor="request-reason" className="label mt-4">
        Motivo
      </label>
      <textarea
        id="request-reason"
        name="motivo"
        required
        maxLength={2000}
        rows={3}
        className="field"
      />
      {error && (
        <p role="alert" className="my-3 text-sm text-(--action-danger)">
          {error}
        </p>
      )}
      <Button className="mt-4" variant="send" type="submit" busy={busy}>
        Enviar solicitud
      </Button>
    </form>
  );
}
