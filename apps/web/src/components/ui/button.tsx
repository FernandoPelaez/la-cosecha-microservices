"use client";

import { useRef, type ButtonHTMLAttributes } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// Variantes visuales existentes.
const variants = {
  add: "bg-(--action-buy) text-white",
  buy: "bg-(--action-buy) text-white",
  save: "bg-(--action-buy) text-white",
  edit: "bg-(--action-edit) text-white",
  send: "bg-(--action-edit) text-white",
  delete: "bg-(--action-danger) text-white",
  cancel: "bg-(--action-danger) text-white",
  secondary: "border border-(--border) bg-white text-(--text-primary)",
} as const;

// Tamaños disponibles sin modificar el diseño predeterminado.
const sizes = {
  default: "min-h-11 rounded-xl px-4 py-2 text-sm",
  compact: "min-h-10 rounded-lg px-3 py-1.5 text-xs sm:text-sm",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  busy?: boolean;
};

export function Button({
  variant = "secondary",
  size = "default",
  busy = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const { contextSafe } = useGSAP({
    scope: ref,
  });

  // Respeta la preferencia de accesibilidad para reducir animaciones.
  const hover = contextSafe((scale: number) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    gsap.to(ref.current, {
      scale,
      duration: 0.16,
      overwrite: true,
    });
  });

  return (
    <button
      ref={ref}
      type="button"
      {...props}
      disabled={disabled || busy}
      aria-busy={busy}
      onPointerEnter={() => hover(1.018)}
      onPointerLeave={() => hover(1)}
      onPointerDown={() => hover(0.98)}
      onPointerUp={() => hover(1)}
      className={`inline-flex items-center justify-center gap-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--action-edit) disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {busy ? "Procesando…" : children}
    </button>
  );
}
