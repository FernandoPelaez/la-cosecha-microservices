"use client";
import { Minus, Plus } from "lucide-react";
export function Quantity({
  value,
  max,
  onChange,
  disabled = false,
  label = "Cantidad",
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="inline-flex h-11 shrink-0 items-center rounded-lg border border-(--border-strong) bg-white">
      <button
        type="button"
        aria-label={`Disminuir ${label.toLowerCase()}`}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
        className="flex h-11 w-10 items-center justify-center rounded-l-lg disabled:opacity-30"
      >
        <Minus size={15} />
      </button>
      <input
        aria-label={label}
        type="number"
        min={1}
        max={Math.max(1, max)}
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange(
            Math.max(
              1,
              Math.min(
                Math.max(1, max),
                Math.trunc(Number(e.target.value) || 1),
              ),
            ),
          )
        }
        className="h-9 w-9 appearance-none bg-transparent text-center text-sm font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`Aumentar ${label.toLowerCase()}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        className="flex h-11 w-10 items-center justify-center rounded-r-lg disabled:opacity-30"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
