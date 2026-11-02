"use client";

import { useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { ZoomIn, ZoomOut } from "lucide-react";

type ProductImageZoomProps = {
  src: string;
  alt: string;
  priority?: boolean;
};

type PointerPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const ZOOM_LEVEL = 2.2;
const LENS_SIZE = 160;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function ProductImageZoom({
  src,
  alt,
  priority = false,
}: ProductImageZoomProps) {
  const [zoomed, setZoomed] = useState(false);
  const [lens, setLens] = useState<PointerPosition | null>(null);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const dragging = useRef(false);

  // Obtener la posición del cursor sobre la fotografía.
  function pointerPosition(
    event: PointerEvent<HTMLDivElement>,
  ): PointerPosition {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height),
      width: rect.width,
      height: rect.height,
    };
  }

  // Controlar la lupa y el desplazamiento de la imagen.
  function handlePointerMove(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-zoom-control]")
    ) {
      setLens(null);
      return;
    }

    const position = pointerPosition(event);

    if (zoomed) {
      // Desplazar la imagen solamente mientras se arrastra.
      if (
        !dragging.current ||
        !position.width ||
        !position.height
      ) {
        return;
      }

      setOrigin({
        x: (position.x / position.width) * 100,
        y: (position.y / position.height) * 100,
      });

      return;
    }

    // Mostrar lupa flotante con ratón o lápiz.
    if (
      event.pointerType === "mouse" ||
      event.pointerType === "pen"
    ) {
      setLens(position);
    }
  }

  // Permitir arrastrar la fotografía ampliada.
  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (!zoomed) return;

    if (
      event.target instanceof Element &&
      event.target.closest("button")
    ) {
      return;
    }

    dragging.current = true;

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  }

  // Finalizar el desplazamiento.
  function handlePointerEnd(
    event: PointerEvent<HTMLDivElement>,
  ) {
    dragging.current = false;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }
  }

  // Activar o restaurar el zoom.
  function setImageZoom(next: boolean) {
    dragging.current = false;

    setZoomed(next);
    setLens(null);
    setOrigin({ x: 50, y: 50 });
  }

  const lensLeft = lens
    ? clamp(
        lens.x - LENS_SIZE / 2,
        0,
        Math.max(0, lens.width - LENS_SIZE),
      )
    : 0;

  const lensTop = lens
    ? clamp(
        lens.y - LENS_SIZE / 2,
        0,
        Math.max(0, lens.height - LENS_SIZE),
      )
    : 0;

  return (
    <div className="w-full min-w-0 max-w-140">
      {/* Contenedor de la fotografía */}
      <div
        className={`relative aspect-5/4 w-full overflow-hidden rounded-xl bg-(--surface-soft) ${
          zoomed
            ? "cursor-grab touch-none active:cursor-grabbing"
            : "touch-pan-y"
        }`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setLens(null)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {/* Fotografía original del producto */}
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 767px) calc(100vw - 32px), 560px"
          className="pointer-events-none object-contain mix-blend-multiply"
          style={
            zoomed
              ? {
                  transform: `scale(${ZOOM_LEVEL})`,
                  transformOrigin: `${origin.x}% ${origin.y}%`,
                }
              : undefined
          }
        />

        {/* Manita para indicar que la imagen es interactiva */}
        {!zoomed && (
          <button
            type="button"
            aria-label={`Ampliar fotografía: ${alt}`}
            className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-(--brand-secondary)"
            onClick={() => setImageZoom(true)}
          />
        )}

        {/* Lupa flotante para escritorio */}
        {!zoomed && lens && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 hidden size-40 overflow-hidden rounded-full border-2 border-(--brand-secondary) bg-(--surface-soft) shadow-lg md:block"
            style={{
              left: lensLeft,
              top: lensTop,
            }}
          >
            <div
              className="absolute"
              style={{
                width: lens.width,
                height: lens.height,
                left:
                  LENS_SIZE / 2 -
                  lens.x * ZOOM_LEVEL,
                top:
                  LENS_SIZE / 2 -
                  lens.y * ZOOM_LEVEL,
                transform: `scale(${ZOOM_LEVEL})`,
                transformOrigin: "top left",
              }}
            >
              <Image
                src={src}
                alt=""
                aria-hidden="true"
                fill
                sizes="560px"
                className="object-contain mix-blend-multiply"
              />
            </div>
          </div>
        )}

        {/* Botón para ampliar o restaurar fotografía */}
        <button
          data-zoom-control
          type="button"
          aria-label={
            zoomed
              ? "Restablecer fotografía"
              : "Ampliar fotografía"
          }
          aria-pressed={zoomed}
          onClick={() => setImageZoom(!zoomed)}
          className="absolute bottom-3 right-3 z-20 flex size-11 cursor-pointer items-center justify-center rounded-full border border-(--border-strong) bg-(--surface) text-(--brand-secondary) shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary)"
        >
          {zoomed ? (
            <ZoomOut size={19} />
          ) : (
            <ZoomIn size={19} />
          )}
        </button>
      </div>

      {/* Instrucciones del zoom */}
      <p className="mt-2 text-center text-[11px] leading-5 text-(--text-secondary)">
        {zoomed
          ? "Arrastra para explorar la fotografía. Pulsa la lupa para volver."
          : "En computadora, pasa el cursor o haz clic para ampliar. En móvil, toca la fotografía."}
      </p>
    </div>
  );
}

