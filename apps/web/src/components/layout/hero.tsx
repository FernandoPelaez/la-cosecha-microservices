"use client";

import { useRef } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useIntroSequence } from "@/components/ui/intro-sequence";

gsap.registerPlugin(useGSAP);

export function Hero() {
  const root = useRef<HTMLElement>(null);

  const {
    headerReady,
    contentReady,
    completeContent,
  } = useIntroSequence();

  useGSAP(
    () => {
      const container = root.current;
      if (!container) return;

      const copy = container.querySelector<HTMLElement>(
        ".hero-copy",
      );

      const stage = container.querySelector<HTMLElement>(
        ".hero-stage",
      );

      const bottles = container.querySelectorAll<HTMLElement>(
        ".hero-bottle",
      );

      const caption = container.querySelector<HTMLElement>(
        ".hero-stage p",
      );

      if (!copy || !stage) return;

      // Mantener el Hero visible después de completar la secuencia.
      if (contentReady) {
        gsap.set([copy, stage], {
          autoAlpha: 1,
          y: 0,
        });

        gsap.set(bottles, {
          opacity: 1,
        });

        if (caption) {
          gsap.set(caption, {
            autoAlpha: 1,
          });
        }

        return;
      }

      if (!headerReady) return;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reducedMotion) {
        gsap.set([copy, stage], {
          autoAlpha: 1,
          y: 0,
        });

        gsap.set(bottles, {
          opacity: 1,
        });

        if (caption) {
          gsap.set(caption, {
            autoAlpha: 1,
          });
        }

        completeContent();
        return;
      }

      // Preparar las salsas sin alterar sus transformaciones CSS.
      gsap.set(bottles, {
        opacity: 0,
      });

      if (caption) {
        gsap.set(caption, {
          autoAlpha: 0,
        });
      }

      const timeline = gsap.timeline({
        defaults: {
          ease: "power2.out",
        },
        onComplete: completeContent,
      });

      // Etapa 3: entra primero el texto del Hero.
      timeline.fromTo(
        copy,
        {
          autoAlpha: 0,
          y: 14,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.95,
        },
      );

      // Etapa 4: comienza la presentación de los productos.
      timeline.set(stage, {
        autoAlpha: 1,
      });

      timeline.to(
        bottles,
        {
          opacity: 1,
          duration: 0.95,
          stagger: 0.24,
          ease: "power2.out",
        },
        "+=0.12",
      );

      if (caption) {
        timeline.to(
          caption,
          {
            autoAlpha: 1,
            duration: 0.35,
          },
          "-=0.2",
        );
      }
    },
    {
      scope: root,
      dependencies: [
        headerReady,
        contentReady,
        completeContent,
      ],
      revertOnUpdate: true,
    },
  );

  return (
    <section
      ref={root}
      className="shell home-hero"
      aria-labelledby="hero-title"
    >
      <div
        className="hero-copy"
        style={{
          opacity: 0,
          visibility: "hidden",
        }}
      >
        <p className="hero-kicker">
          EL SABOR QUE NOS DISTINGUE
        </p>

        <h1
          id="hero-title"
          className="hero-title"
        >
          <span className="line">
            <span>Dale carácter</span>
          </span>

          <span className="line">
            <span>
              <em>a cada platillo.</em>
            </span>
          </span>
        </h1>

        <p>
          Descubre las salsas de LA COSECHA y encuentra
          ese toque especial que convierte una comida
          cotidiana en una experiencia llena de sabor.
        </p>

        <a
          href="#salsas"
          className="hero-cta"
        >
          Conoce nuestras salsas
          <ArrowUpRight size={17} />
        </a>
      </div>

      <div
        className="hero-stage"
        aria-label="Salsas de LA COSECHA"
        style={{
          opacity: 0,
          visibility: "hidden",
        }}
      >
        <Image
          src="/images/la_cosecha_salsa_004.png"
          alt="Salsa Verde Asada"
          width={400}
          height={500}
          priority
          className="hero-bottle left"
        />

        <Image
          src="/images/la_cosecha_salsa_001.png"
          alt="Salsa Macha con Ajo"
          width={400}
          height={500}
          priority
          className="hero-bottle center"
        />

        <Image
          src="/images/la_cosecha_salsa_005.png"
          alt="Salsa de Habanero"
          width={400}
          height={500}
          priority
          className="hero-bottle right"
        />

        <p>El toque de tu mesa</p>
      </div>
    </section>
  );
}