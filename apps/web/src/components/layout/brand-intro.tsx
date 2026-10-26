"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

type BrandIntroProps = {
  onComplete: () => void;
};

const FURROWS = 9;
const PHRASES = ["Orgullosamente de Sinaloa", "De nuestra tierra a tu mesa"];

export function BrandIntro({ onComplete }: BrandIntroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);

  onCompleteRef.current = onComplete;

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const media = gsap.matchMedia();
      const previousOverflow = document.body.style.overflow;

      document.body.style.overflow = "hidden";

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const furrows = gsap.utils.toArray<HTMLElement>("[data-furrow]", root);

        const phrases = gsap.utils.toArray<HTMLElement>("[data-phrase]", root);

        const content = root.querySelector<HTMLElement>("[data-content]");

        const seal = root.querySelector<HTMLElement>("[data-seal]");

        if (!content || !seal || phrases.length !== PHRASES.length) {
          onCompleteRef.current();
          return;
        }

        gsap.set(furrows, {
          transformOrigin: "50% 0%",
          force3D: true,
        });

        gsap.set(seal, {
          autoAlpha: 0,
          scale: 0.75,
          y: 24,
          force3D: true,
        });

        gsap.set(phrases, {
          opacity: 0,
          y: 18,
        });

        const tl = gsap.timeline({
          defaults: {
            ease: "power3.out",
          },
          onComplete: () => onCompleteRef.current(),
        });

        // Aparición progresiva del logotipo.
        tl.to(
          seal,
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration: 1.35,
            ease: "power3.out",
          },
          0.4,
        );

        // Primera frase.
        tl.to(
          phrases[0],
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
          },
          0.65,
        );

        tl.to(
          phrases[0],
          {
            opacity: 0,
            y: -18,
            duration: 0.35,
            ease: "power2.in",
          },
          2.15,
        );

        // Segunda frase.
        tl.to(
          phrases[1],
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
          },
          2.55,
        );

        // Desaparición del contenido.
        tl.to(
          content,
          {
            autoAlpha: 0,
            y: -8,
            duration: 0.45,
            ease: "power2.in",
          },
          4.25,
        );

        // Salida de los surcos.
        tl.to(
          furrows,
          {
            scaleY: 0,
            duration: 0.9,
            ease: "expo.inOut",
            stagger: {
              amount: 0.35,
              from: "center",
            },
          },
          4.4,
        );
      });

      media.add("(prefers-reduced-motion: reduce)", () => {
        onCompleteRef.current();
      });

      return () => {
        media.revert();
        document.body.style.overflow = previousOverflow;
      };
    },
    {
      scope: rootRef,
      dependencies: [],
      revertOnUpdate: true,
    },
  );

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label="Presentación de LA COSECHA"
      className="fixed inset-0 z-100 flex items-center justify-center overflow-hidden motion-reduce:hidden"
    >
      {/* Fondo de surcos */}
      <div aria-hidden className="absolute inset-0 flex">
        {Array.from({ length: FURROWS }, (_, i) => (
          <div
            key={i}
            data-furrow
            className="h-full flex-1 will-change-transform"
            style={{
              marginInline: "-0.5px",
              backgroundColor:
                i % 2 === 1
                  ? "color-mix(in srgb, var(--brand-cream) 4%, var(--brand-primary))"
                  : "var(--brand-primary)",
            }}
          />
        ))}
      </div>

      {/* Contenido principal */}
      <div
        data-content
        className="relative z-10 flex w-full flex-col items-center px-6"
      >
        {/* Logotipo original */}
        <div
          data-seal
          className="relative size-64 will-change-transform sm:size-84"
          style={{
            opacity: 0,
            visibility: "hidden",
            transform: "translateY(24px) scale(0.75)",
          }}
        >
          <Image
            src="/logo/la-cosecha.png"
            alt="Logotipo oficial de LA COSECHA"
            fill
            priority
            className="object-contain"
          />
        </div>

        {/* Frases animadas */}
        <div
          className="relative mt-10 h-10 w-full max-w-2xl overflow-hidden text-center font-display text-xl tracking-[0.02em] text-(--brand-cream) sm:h-12 sm:text-3xl sm:tracking-[0.04em]"
          aria-label={PHRASES.join(". ")}
        >
          {PHRASES.map((phrase, i) => (
            <span
              key={i}
              data-phrase
              aria-hidden="true"
              className="absolute inset-x-0 top-0 block text-center leading-10 opacity-0 will-change-transform sm:leading-12"
              style={{
                opacity: 0,
                transform: "translateY(18px)",
              }}
            >
              {phrase}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
