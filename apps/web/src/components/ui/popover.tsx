"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
export function Popover({
  label,
  trigger,
  children,
  align = "right",
}: {
  label: string;
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    panel = useRef<HTMLDivElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const id = useId();
  const { contextSafe } = useGSAP(
    (_context, safe) => {
      if (!open) return;
      closing.current = false;
      const position = safe!(() => {
        gsap.set(panel.current, { x: 0 });
        const bounds = panel.current!.getBoundingClientRect();
        const available = document.documentElement.clientWidth;
        const x =
          bounds.left < 16
            ? 16 - bounds.left
            : bounds.right > available - 16
              ? available - 16 - bounds.right
              : 0;
        gsap.set(panel.current, { x });
      });
      position();
      window.addEventListener("resize", position);

      gsap.fromTo(
        panel.current,
        { opacity: 0, y: -5 },
        {
          opacity: 1,
          y: 0,
          duration: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 0.18,
        },
      );
      return () => window.removeEventListener("resize", position);
    },
    { scope: root, dependencies: [open], revertOnUpdate: true },
  );
  const close = contextSafe(() => {
    if (closing.current || !open) return;
    closing.current = true;
    gsap.to(panel.current, {
      opacity: 0,
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 0.12,
      onComplete: () => setOpen(false),
    });
  });
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (e.target instanceof Node && !root.current?.contains(e.target))
        close();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget)) close();
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-2 text-sm hover:bg-(--surface-soft)"
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={panel}
          id={id}
          className={`absolute top-full z-40 mt-2 max-h-[60dvh] w-64 overflow-y-auto max-w-[calc(100vw_-_2rem)] rounded-xl border border-(--border) bg-white p-2 shadow-lg ${align === "right" ? "right-0" : "left-0"}`}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}
