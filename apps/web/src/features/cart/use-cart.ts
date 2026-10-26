"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, send } from "@/lib/api";
import type { Cart } from "@/types";

export function useCart(clientId: number | null) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loadingCart, setLoading] = useState(false);
  const [cartError, setError] = useState("");
  const queue = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);

  const refreshCart = useCallback(async () => {
    if (!clientId) return;

    const current = generation.current;
    setLoading(true);

    try {
      const data = await api<Cart>("cart");

      if (current === generation.current) {
        setCart(data);
        setError("");
      }
    } catch (error) {
      if (current === generation.current) {
        setError((error as Error).message);
      }
    } finally {
      if (current === generation.current) {
        setLoading(false);
      }
    }
  }, [clientId]);

  useEffect(() => {
    generation.current += 1;
    setCart(null);
    setError("");
    setLoading(Boolean(clientId));

    if (clientId) void refreshCart();

    return () => {
      generation.current += 1;
    };
  }, [clientId, refreshCart]);

  const mutateCart = useCallback(
    (id: number, quantity: number, add = false) => {
      const current = generation.current;

      // Procesar las operaciones en orden para conservar las cantidades.
      const operation = queue.current.then(async () => {
        if (current !== generation.current) {
          throw new Error("La sesión cambió. Vuelve a abrir tu carrito.");
        }

        const latest = add ? await api<Cart>("cart") : null;
        const previous =
          latest?.items.find((item) => item.id_producto === id)?.cantidad || 0;

        const result = await send<Cart>(`cart/${id}`, "PUT", {
          cantidad: quantity + previous,
        });

        if (current === generation.current) {
          setCart(result);
          setError("");
        }
      });

      queue.current = operation.catch(() => {});
      return operation;
    },
    [],
  );

  return { cart, loadingCart, cartError, refreshCart, mutateCart };
}

