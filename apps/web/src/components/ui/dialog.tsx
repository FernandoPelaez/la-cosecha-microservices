"use client";

import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

type DialogProps = {
  title: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  onClose: () => void;
  wide?: boolean;

  // Opciones adicionales para modales con encabezado personalizado.
  size?: "default" | "medium";
  titleIcon?: ReactNode;
  description?: string;
};

export function Dialog({
  title,
  children,
  onClose,
  wide = false,
  size = "default",
  titleIcon,
  description,
}: DialogProps) {
  const root = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const id = useId();

  const expandedHeader = Boolean(titleIcon || description);

  // Conserva los tamaños originales y permite uno intermedio.
  const widthClass = wide
    ? "max-w-225"
    : size === "medium"
      ? "max-w-xl"
      : "max-w-md";

  // Apertura del modal y restauración del estado al cerrarlo.
  const { contextSafe } = useGSAP(
    () => {
      const dialog = root.current!;

      const previous =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      const overflow = document.body.style.overflow;

      closing.current = false;
      dialog.showModal();

      document.body.style.overflow = "hidden";

      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          dialog,
          {
            opacity: 0,
            y: 12,
            scale: 0.985,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.22,
            ease: "power2.out",
          },
        );
      });

      return () => {
        media.revert();
        dialog.close();

        document.body.style.overflow = overflow;

        if (previous?.isConnected) {
          previous.focus({ preventScroll: true });
        }
      };
    },
    { scope: root },
  );

  // Cierre animado del modal.
  const close = contextSafe(() => {
    if (closing.current) return;

    closing.current = true;

    gsap.to(root.current, {
      opacity: 0,
      y: 6,
      duration: window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
        ? 0
        : 0.16,
      overwrite: true,
      onComplete: onClose,
    });
  });

  return (
    <dialog
      ref={root}
      aria-labelledby={id}
      aria-describedby={
        description ? `${id}-description` : undefined
      }
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-(--border) bg-white p-0 shadow-xl ${widthClass}`}
    >
      {/* Encabezado normal o personalizado, según las propiedades recibidas. */}
      <div
        className={`sticky top-0 z-10 flex justify-between gap-3 border-b border-(--border) bg-white ${
          expandedHeader
            ? "items-start px-4 py-4 sm:px-6 sm:py-5"
            : "items-center px-4 py-2 sm:px-6"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {titleIcon && (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-(--surface-soft) text-(--brand-secondary)">
              {titleIcon}
            </div>
          )}

          <div className="min-w-0">
            <h2
              id={id}
              className={
                expandedHeader
                  ? "font-display text-xl leading-tight text-(--text-primary) sm:text-2xl"
                  : "text-sm font-semibold"
              }
            >
              {title}
            </h2>

            {description && (
              <p
                id={`${id}-description`}
                className="mt-1 text-xs leading-5 text-(--text-secondary) sm:text-sm"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          autoFocus
          aria-label="Cerrar ventana"
          onClick={close}
          className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-(--surface-soft)"
        >
          <X
            size={20}
            aria-hidden="true"
          />
        </button>
      </div>

      {typeof children === "function"
        ? children(close)
        : children}
    </dialog>
  );
}

