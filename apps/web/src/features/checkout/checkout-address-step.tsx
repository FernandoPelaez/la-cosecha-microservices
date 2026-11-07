"use client";

import { ChevronDown, MapPin, Plus } from "lucide-react";
import type { Address } from "@/types";
import { AddressForm } from "@/features/account/address-form";

interface CheckoutAddressStepProps {
  addresses: Address[];
  selectedAddress: Address | undefined;
  selectedAddressId: number;
  isAddingAddress: boolean;
  onSelectAddress: (id: number) => void;
  onAddAddress: () => void;
  onSavedAddress: () => void;
  onCancelAddress: () => void;
}

// Mantiene las opciones legibles en el selector nativo de pantallas pequeñas.
function addressOptionLabel(item: Address, index: number): string {
  const label = `${index + 1}. ${item.calle_numero} · ${item.colonia}`;
  const maxLength = 29;

  return label.length > maxLength
    ? `${label.slice(0, maxLength - 1).trimEnd()}…`
    : label;
}

export function CheckoutAddressStep({
  addresses,
  selectedAddress,
  selectedAddressId,
  isAddingAddress,
  onSelectAddress,
  onAddAddress,
  onSavedAddress,
  onCancelAddress,
}: CheckoutAddressStepProps) {
  return (
    <>
      <p className="eyebrow mb-3">Dirección de entrega</p>

      <h2 className="font-display text-3xl leading-tight text-(--text-primary) sm:text-4xl">
        ¿Dónde recibes tu pedido?
      </h2>

      <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
        Selecciona uno de tus domicilios guardados.
      </p>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="checkout-address"
            className="text-[11px] font-semibold uppercase tracking-widest text-(--text-secondary)"
          >
            Elige tu domicilio
          </label>

          <span className="text-[11px] text-(--text-secondary)">
            {addresses.length}{" "}
            {addresses.length === 1
              ? "domicilio guardado"
              : "domicilios guardados"}
          </span>
        </div>

        <div className="relative mt-3">
          <MapPin
            size={19}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-(--brand-secondary)"
          />

          <select
            id="checkout-address"
            value={selectedAddressId || ""}
            onChange={(event) =>
              onSelectAddress(Number(event.target.value))
            }
            className="min-h-14 w-full min-w-0 appearance-none border-0 border-b-2 border-(--brand-secondary) bg-transparent py-3 pl-8 pr-9 text-sm font-medium text-(--text-primary) outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) sm:text-base"
          >
            <option value="">Selecciona un domicilio</option>

            {addresses.map((item, index) => (
              <option key={item.id} value={item.id}>
                {addressOptionLabel(item, index)}
              </option>
            ))}
          </select>

          <ChevronDown
            size={19}
            aria-hidden="true"
            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-(--brand-secondary)"
          />
        </div>

        {selectedAddress && (
          <div className="mt-4 space-y-1 text-sm leading-6">
            <p className="font-medium text-(--text-primary)">
              {selectedAddress.calle_numero}
            </p>

            <p className="text-(--text-secondary)">
              {selectedAddress.colonia}, {selectedAddress.ciudad} · CP{" "}
              {selectedAddress.codigo_postal}
            </p>
          </div>
        )}

        {addresses.length === 0 && !isAddingAddress && (
          <p className="mt-4 text-sm text-(--text-secondary)">
            Todavía no tienes domicilios registrados.
          </p>
        )}

        {!isAddingAddress ? (
          <button
            type="button"
            onClick={onAddAddress}
            className="mt-6 inline-flex min-h-11 max-w-full items-center gap-2 text-left text-sm font-semibold text-(--brand-secondary) underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary)"
          >
            <Plus
              size={18}
              className="shrink-0"
              aria-hidden="true"
            />
            Agregar otro domicilio
          </button>
        ) : (
          <div className="mt-6 min-w-0 border-t border-(--border) pt-4">
            <AddressForm
              onSaved={onSavedAddress}
              onCancel={onCancelAddress}
            />
          </div>
        )}
      </div>
    </>
  );
}