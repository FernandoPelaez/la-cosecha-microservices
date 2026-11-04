"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { HeaderAccount } from "@/components/layout/header-account";
import { HeaderBrand } from "@/components/layout/header-brand";
import { useIntroSequence } from "@/components/ui/intro-sequence";
import { AdminNav } from "./nav";

gsap.registerPlugin(useGSAP);

type AdminHeaderProps = {
  role: string;
  name: string;
  onEntranceComplete: () => void;
};

export function AdminHeader({
  role,
  name,
  onEntranceComplete,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);

  const [mobileOpen, setMobileOpen] = useState(false);

  const {
    introFinished,
    completeBar,
    completeHeader,
  } = useIntroSequence();

  useEffect(() => {
    if (introFinished) {
      completeBar();
    }
  }, [introFinished, completeBar]);

  // Cerrar el menú móvil al cambiar de página.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("keydown", onEscape);
    };
  }, [mobileOpen]);

  // Notificar cuando finaliza la animación del encabezado.
  useGSAP(
    () => {
      const header = headerRef.current;

      if (!header || !introFinished) return;

      const finish = () => {
        completeHeader();
        onEntranceComplete();
      };

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reducedMotion) {
        gsap.set(header, {
          autoAlpha: 1,
          y: 0,
        });

        finish();
        return;
      }

      gsap.fromTo(
        header,
        {
          autoAlpha: 0,
          y: 12,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.85,
          ease: "power3.out",
          clearProps: "transform",
          onComplete: finish,
        },
      );
    },
    {
      scope: headerRef,
      dependencies: [
        introFinished,
        completeHeader,
        onEntranceComplete,
      ],
      revertOnUpdate: true,
    },
  );

  return (
    <header
      ref={headerRef}
      className="relative z-30 border-b border-(--border) bg-(--background)"
      style={{
        opacity: 0,
        visibility: "hidden",
      }}
    >
      <div className="mx-auto flex min-h-19 w-full max-w-[1600px] items-center gap-2 px-4 sm:gap-4 sm:px-6 2xl:px-10">
        <HeaderBrand admin />

        <AdminNav
          role={role}
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
        />

        <div className="ml-auto flex shrink-0 items-center gap-0 sm:gap-2">
          <div className="hidden h-9 w-px bg-(--border) sm:block" />

          <HeaderAccount admin name={name} />

          <button
            type="button"
            aria-label={
              mobileOpen
                ? "Cerrar menú"
                : "Abrir menú administrativo"
            }
            aria-controls="admin-mobile-nav"
            aria-expanded={mobileOpen}
            onClick={() => {
              setMobileOpen((open) => !open);
            }}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-(--surface-soft) 2xl:hidden"
          >
            {mobileOpen ? (
              <X size={23} strokeWidth={1.8} />
            ) : (
              <Menu size={23} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

