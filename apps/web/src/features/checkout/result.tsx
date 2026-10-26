"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useFeedback } from "@/components/ui/feedback";
import { useStore } from "@/components/providers";
export function PurchaseResult({ id }: { id: number }) {
  const [state, setState] = useState<{
      estado: string;
      venta_id: number | null;
    } | null>(null),
    [error, setError] = useState("");
  const shown = useRef(false);
  const { confirm } = useFeedback();
  const { refreshCart, refreshProducts } = useStore();
  useEffect(() => {
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const r = await api<{ estado: string; venta_id: number | null }>(
          `order-result/${id}`,
        );
        if (!active) return;
        setState(r);
        if (r.venta_id && !shown.current) {
          shown.current = true;
          void confirm(
            "Compra realizada correctamente",
            `Tu pedido #${id} quedó registrado. Puedes consultar el comprobante en tu cuenta.`,
            "success",
          );
          void refreshCart();
          void refreshProducts();
        } else if (r.estado === "pendiente" && attempts++ < 10)
          timer = setTimeout(poll, 3000);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, confirm, refreshCart, refreshProducts]);
  return (
    <div className="page text-center">
      <h1 className="page-title">
        {state?.venta_id
          ? "Gracias por tu compra"
          : state?.estado === "cancelado"
            ? "Pedido cancelado"
            : "Estamos verificando tu pago"}
      </h1>
      <p className="my-5 text-sm">
        {error ||
          (!state?.venta_id
            ? "Tu compra solo se confirmará cuando el procesador valide el pago. Puedes revisar el estado en tu cuenta."
            : `Pedido #${id}`)}
      </p>
      {state?.venta_id && (
        <a className="link mr-5" href={`/api/receipts/${state.venta_id}/pdf`}>
          Descargar comprobante
        </a>
      )}
      <Link className="link" href="/cuenta">
        Ver mis pedidos
      </Link>
    </div>
  );
}
