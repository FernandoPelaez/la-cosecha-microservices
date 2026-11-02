"use client";

import { Minus, Plus } from "lucide-react";

interface QuantityProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}

export function Quantity({
  value,
  max,
  onChange,
  disabled = false,
  label = "Cantidad",
}: QuantityProps) {
  const maxQuantity = Math.max(1, max);

  // Mantener la cantidad dentro de los límites permitidos.
  function handleChange(input: string) {
    const quantity = Math.trunc(Number(input) || 1);

    onChange(
      Math.max(1, Math.min(maxQuantity, quantity)),
    );
  }

  return (
    <div className="inline-flex h-11 shrink-0 items-center rounded-lg border border-(--border-strong) bg-white">
      {/* Disminuir cantidad */}
      <button
        type="button"
        aria-label={`Disminuir ${label.toLowerCase()}`}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
        className="flex h-11 w-10 items-center justify-center rounded-l-lg text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Minus
          size={15}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>

      {/* Cantidad actual */}
      <input
        type="number"
        aria-label={label}
        inputMode="numeric"
        min={1}
        max={maxQuantity}
        value={value}
        disabled={disabled}
        onChange={(event) =>
          handleChange(event.target.value)
        }
        className="h-9 w-9 bg-transparent text-center text-sm font-semibold text-(--text-primary) [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      {/* Aumentar cantidad */}
      <button
        type="button"
        aria-label={`Aumentar ${label.toLowerCase()}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        className="flex h-11 w-10 items-center justify-center rounded-r-lg text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Plus
          size={15}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

