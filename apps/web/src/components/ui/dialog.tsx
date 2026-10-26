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
};

export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: DialogProps) {
  const root = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const id = useId();

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
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
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
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-(--border) bg-white p-0 shadow-xl ${
        wide ? "max-w-225" : "max-w-md"
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-(--border) bg-white px-4 py-2 sm:px-6">
        <h2 id={id} className="text-sm font-semibold">
          {title}
        </h2>

        <button
          type="button"
          autoFocus
          aria-label="Cerrar ventana"
          onClick={close}
          className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-(--surface-soft)"
        >
          <X size={20} />
        </button>
      </div>

      {typeof children === "function" ? children(close) : children}
    </dialog>
  );
}
