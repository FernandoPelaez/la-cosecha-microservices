"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

type PopoverProps = {
  label: string;
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  showArrow?: boolean;
};

export function Popover({
  label,
  trigger,
  children,
  align = "right",
  showArrow = false,
}: PopoverProps) {
  const [open, setOpen] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);

  const id = useId();

  // Animación de apertura y ajuste de posición.
  const { contextSafe } = useGSAP(
    (_context, safe) => {
      if (!open || !panel.current) return;

      closing.current = false;

      const position = safe!(() => {
        const element = panel.current;

        if (!element) return;

        gsap.set(element, { x: 0 });

        const bounds = element.getBoundingClientRect();
        const available = document.documentElement.clientWidth;

        const x =
          bounds.left < 16
            ? 16 - bounds.left
            : bounds.right > available - 16
              ? available - 16 - bounds.right
              : 0;

        gsap.set(element, { x });
      });

      position();
      window.addEventListener("resize", position);

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.fromTo(
        panel.current,
        { opacity: 0, y: -5 },
        {
          opacity: 1,
          y: 0,
          duration: reducedMotion ? 0 : 0.18,
          ease: "power2.out",
        },
      );

      return () => {
        window.removeEventListener("resize", position);
      };
    },
    {
      scope: root,
      dependencies: [open],
      revertOnUpdate: true,
    },
  );

  // Cierre animado del menú.
  const close = contextSafe(() => {
    if (closing.current || !open) return;

    if (!panel.current) {
      setOpen(false);
      return;
    }

    closing.current = true;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    gsap.to(panel.current, {
      opacity: 0,
      duration: reducedMotion ? 0 : 0.12,
      overwrite: "auto",
      onComplete: () => setOpen(false),
    });
  });

  // Cerrar al hacer clic fuera o presionar Escape.
  useEffect(() => {
    if (!open) return;

    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target)
      ) {
        close();
      }
    };

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        button.current?.focus();
      }
    };

    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, close]);

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (
          open &&
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          close();
        }
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (open) {
            close();
          } else {
            setOpen(true);
          }
        }}
        className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-2 text-sm hover:bg-(--surface-soft)"
      >
        {trigger}
      </button>

      {open && (
        <div
          ref={panel}
          id={id}
          className={[
            "absolute top-full z-40 mt-2 w-64 rounded-xl",
            "border border-(--border) bg-white p-2 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
          style={{
            maxWidth: "calc(100vw - 2rem)",
          }}
        >
          {showArrow && (
            <span
              aria-hidden="true"
              className={[
                "pointer-events-none absolute -top-2 size-4 rotate-45",
                "border-l border-t border-(--border) bg-white",
                align === "right" ? "right-6" : "left-6",
              ].join(" ")}
            />
          )}

          <div className="max-h-[60dvh] overflow-y-auto">
            {children(close)}
          </div>
        </div>
      )}
    </div>
  );
}

