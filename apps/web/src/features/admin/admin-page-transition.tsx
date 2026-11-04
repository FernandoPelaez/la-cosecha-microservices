
"use client";

import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { AdminHeader } from "./admin-header";

gsap.registerPlugin(useGSAP);

type AdminPageTransitionProps = {
  role: string;
  name: string;
  children: ReactNode;
};

export function AdminPageTransition({
  role,
  name,
  children,
}: AdminPageTransitionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [headerEntered, setHeaderEntered] = useState(false);

  const handleHeaderEntered = useCallback(() => {
    setHeaderEntered(true);
  }, []);

  // Animar el contenido cuando el encabezado haya terminado.
  useGSAP(
    () => {
      const content = contentRef.current;

      if (!content || !headerEntered) return;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.set(content, {
        autoAlpha: 1,
      });

      if (reducedMotion) return;

      const root = content.firstElementChild;
      const sections = root
        ? Array.from(root.children)
        : [];

      const targets = sections.length > 0
        ? sections
        : [content];

      gsap.fromTo(
        targets,
        {
          autoAlpha: 0,
          y: 18,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.16,
          ease: "power3.out",
          clearProps: "transform",
        },
      );
    },
    {
      scope: contentRef,
      dependencies: [headerEntered],
      revertOnUpdate: true,
    },
  );

  return (
    <>
      <AdminHeader
        role={role}
        name={name}
        onEntranceComplete={handleHeaderEntered}
      />

      <div
        ref={contentRef}
        className="page"
        style={{
          opacity: 0,
          visibility: "hidden",
        }}
      >
        {children}
      </div>
    </>
  );
}

