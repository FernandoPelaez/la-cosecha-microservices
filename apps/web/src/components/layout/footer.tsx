"use client";

import { useRef, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreditCard, MapPin } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const footer = footerRef.current;
      if (!footer) return;

      const grid = footer.querySelector<HTMLElement>(
        ".footer-grid",
      );
      
      const columns = footer.querySelectorAll<HTMLElement>(
        ".footer-grid > div",
      );

      const bottom = footer.querySelector<HTMLElement>(
        ".footer-bottom",
      );

      if (!grid || !columns.length || !bottom) return;

      // Respetar la accesibilidad del usuario.
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reducedMotion) return;

      // Preparar los elementos para entrar desde abajo.
      const elements = [...Array.from(columns), bottom];

      gsap.set(elements, {
        autoAlpha: 0,
        y: 65,
      });

      const timeline = gsap.timeline({
        paused: true,
        defaults: {
          ease: "power3.out",
        },
      });

      // Aparición escalonada de las tres columnas.
      timeline.to(columns, {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        stagger: 0.22,
        clearProps: "opacity,visibility,transform",
      });

      // Aparición final del copyright y métodos de pago.
      timeline.to(
        bottom,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          clearProps: "opacity,visibility,transform",
        },
        "-=0.15",
      );

      // Iniciar al llegar al contenido real del Footer.
      if (!("IntersectionObserver" in window)) {
        timeline.play();
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;

          observer.disconnect();
          timeline.play();
        },
        {
          threshold: 0.15,
          rootMargin: "0px 0px -22% 0px",
        },
      );

      observer.observe(grid);
      return () => {
        observer.disconnect();
      };
    },
    {
      scope: footerRef,
    },
  );

  // Regresar suavemente al Hero sin recargar la página.
  const handleLogoClick = (
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    if (window.location.pathname !== "/") return;

    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();

    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <footer
      ref={footerRef}
      className="site-footer"
    >
      <div className="shell footer-grid">
        <div>
          <div className="footer-brand">
            <Link
              href="/"
              onClick={handleLogoClick}
              aria-label="Volver al inicio de LA COSECHA"
              className="inline-flex shrink-0"
            >
              <Image
                src="/logo/la-cosecha.png"
                alt="LA COSECHA"
                width={90}
                height={95}
              />
            </Link>

            <h2>
              Un sabor que se queda en la mesa.
            </h2>
          </div>

          <p className="footer-location">
            <MapPin
              className="inline mr-1"
              size={12}
            />
            Los Mochis, Sinaloa
          </p>
        </div>

        <div className="footer-links">
          <h3>Mi tienda</h3>

          <Link href="/#salsas">
            Nuestras salsas
          </Link>

          <Link href="/carrito">
            Mi carrito
          </Link>

          <Link href="/cuenta?seccion=orders">
            Mis pedidos
          </Link>
        </div>

        <div className="footer-links">
          <h3>Tu cuenta</h3>

          <Link href="/cuenta?seccion=profile">
            Mis datos
          </Link>

          <Link href="/cuenta?seccion=requests">
            Garantías y devoluciones
          </Link>

          <Link href="/informacion">
            Información de compra
          </Link>
        </div>
      </div>

      <div className="shell footer-bottom">
        <span>
          © {new Date().getFullYear()} LA COSECHA.
          De nuestra tierra a tu mesa.
        </span>

        <span className="inline-flex items-center gap-2">
          <CreditCard size={14} />
          Pago con tarjeta · Precios en MXN
        </span>
      </div>
    </footer>
  );
}

