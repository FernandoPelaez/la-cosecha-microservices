"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useIntroSequence } from "@/components/ui/intro-sequence";

gsap.registerPlugin(useGSAP);

const messages = [
  "SALSAS CASERAS CON TRADICIÓN",
  "ORGULLOSAMENTE DE SINALOA",
  "DE NUESTRA TIERRA A TU MESA",
  "EL SABOR DE NUESTRAS RAÍCES",
];

type AnnouncementBarProps = {
  onRevealComplete?: () => void;
};

function MessageSequence() {
  return (
    <div
      className="flex shrink-0 items-center"
      aria-hidden="true"
    >
      {messages.map((message) => (
        <span
          key={message}
          className="flex shrink-0 items-center gap-7 px-5"
        >
          <span className="whitespace-nowrap">
            {message}
          </span>

          <span className="size-1.5 shrink-0 rotate-45 bg-white/80" />
        </span>
      ))}
    </div>
  );
}

export function AnnouncementBar({
  onRevealComplete,
}: AnnouncementBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { introFinished } = useIntroSequence();

  useGSAP(
    () => {
      const container = containerRef.current;
      const track = trackRef.current;
      if (!container || !track || !introFinished) return;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // Mostrar inmediatamente si el usuario reduce animaciones.
      if (reducedMotion) {
        gsap.set(container, {
          autoAlpha: 1,
          y: 0,
        });

        onRevealComplete?.();
        return;
      }

      const distance = track.scrollWidth / 2;

      // El desplazamiento continuo comienza después de la entrada.
      const ticker = gsap.fromTo(
        track,
        {
          xPercent: 0,
        },
        {
          xPercent: -50,
          duration: Math.max(distance / 25, 1),
          ease: "none",
          repeat: -1,
          paused: true,
        },
      );

      // Primera etapa: entrada suave de la banda roja.
      const entrance = gsap.fromTo(
        container,
        {
          autoAlpha: 0,
          y: -8,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.65,
          ease: "power2.out",
          clearProps: "transform",
          onComplete: () => {
            ticker.play();
            onRevealComplete?.();
          },
        },
      );

      return () => {
        entrance.kill();
        ticker.kill();
      };
    },
    {
      scope: containerRef,
      dependencies: [introFinished, onRevealComplete],
    },
  );

  return (
    <div
      ref={containerRef}
      className="relative h-8 overflow-hidden bg-(--brand-primary) text-white"
      style={{ opacity: 0 }}
    >
      <span className="sr-only">
        {messages.join(". ")}
      </span>

      <div
        ref={trackRef}
        aria-hidden="true"
        className="flex h-full w-max items-center text-[10px] font-semibold uppercase tracking-[0.16em] motion-reduce:hidden sm:text-[11px]"
      >
        <MessageSequence />
        <MessageSequence />
      </div>

      <div
        aria-hidden="true"
        className="hidden h-full items-center justify-center px-4 text-center text-[10px] font-semibold uppercase tracking-wider motion-reduce:flex"
      >
        DE NUESTRA TIERRA A TU MESA
      </div>
    </div>
  );
}
