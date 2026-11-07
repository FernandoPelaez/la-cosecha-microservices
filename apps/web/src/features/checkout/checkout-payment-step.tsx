"use client";

import { LockKeyhole } from "lucide-react";

export interface CheckoutPaymentMethod {
  id: number;
  nombre: string;
  disponible: boolean;
}

interface CheckoutPaymentStepProps {
  methods: CheckoutPaymentMethod[];
  selectedMethodId: number;
  onSelectMethod: (id: number) => void;
}

export function CheckoutPaymentStep({
  methods,
  selectedMethodId,
  onSelectMethod,
}: CheckoutPaymentStepProps) {
  return (
    <>
      <p className="eyebrow mb-3">Método de pago</p>
      <h2 className="font-display text-3xl leading-tight text-(--text-primary) sm:text-4xl">
        Selecciona cómo pagar
      </h2>
      <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
        Elige un método de pago para continuar con tu compra.
      </p>

      <fieldset className="mt-8 border-t border-(--border)">
        <legend className="sr-only">Métodos de pago disponibles</legend>
        {methods.map((item) => (
          <label
            key={item.id}
            className={`flex min-h-16 items-center gap-3 border-b border-(--border) py-4 text-sm ${
              item.disponible
                ? "cursor-pointer text-(--text-primary)"
                : "cursor-not-allowed text-(--text-secondary)"
            }`}
          >
            <input
              type="radio"
              name="checkout-payment"
              value={item.id}
              checked={selectedMethodId === item.id}
              disabled={!item.disponible}
              onChange={() => onSelectMethod(item.id)}
              className="h-4 w-4 shrink-0 accent-(--brand-secondary)"
            />
            <span className="min-w-0 flex-1 font-medium">
              {item.nombre}
            </span>
            {!item.disponible && (
              <span className="shrink-0 text-xs text-(--action-danger)">
                No disponible
              </span>
            )}
          </label>
        ))}
      </fieldset>

      {!methods.some((item) => item.disponible) && (
        <p className="mt-5 text-sm text-(--text-secondary)">
          Los pagos en línea aún no están disponibles. Tu carrito se conserva.
        </p>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs leading-6 text-(--text-secondary)">
        <LockKeyhole
          size={16}
          className="mt-1 shrink-0"
          aria-hidden="true"
        />
        La captura y validación de tu tarjeta se realiza en la página segura
        del procesador de pagos.
      </p>
    </>
  );
}
