"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// Define los métodos necesarios para integrar Cloudflare Turnstile.
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          size: "flexible" | "compact";
          theme: "light";
          language: "es";
          action: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      remove: (id: string) => void;
    };
  }
}

// Gestiona exclusivamente la verificación antibots del formulario.
export function Turnstile({
  action,
  onToken,
}: {
  action: string;
  onToken: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState<"flexible" | "compact">("compact");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize(entry.contentRect.width < 300 ? "compact" : "flexible");
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Obtiene la clave pública configurada para Turnstile.
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Inicializa el widget y libera sus recursos al desmontarlo.
  useEffect(() => {
    if (!ready || !ref.current || !window.turnstile || !key) return;

    const id = window.turnstile.render(ref.current, {
      sitekey: key,
      size,
      theme: "light",
      language: "es",
      action,
      callback: onToken,
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });

    return () => {
      window.turnstile?.remove(id);
      onToken("");
    };
  }, [ready, action, onToken, key, size]);

  // Informa cuando la clave pública no está configurada.
  if (!key) {
    return (
      <p role="status" className="text-sm text-(--action-danger)">
        La verificación de seguridad aún no está disponible.
      </p>
    );
  }

  // Carga el script y reserva el espacio del widget de seguridad.
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => {
          setReady(true);
          setFailed(false);
        }}
        onError={() => setFailed(true)}
      />

      {failed && (
        <p role="alert" className="text-sm text-(--action-danger)">
          No se pudo cargar la verificación. Recarga la página para reintentar.
        </p>
      )}
      <div ref={ref} className="my-4 min-h-16.25 min-w-0" />
    </>
  );
}
