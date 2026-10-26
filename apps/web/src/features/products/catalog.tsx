"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { useStore } from "@/components/providers";
import { useIntroSequence } from "@/components/ui/intro-sequence";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ProductCard } from "./product-card";
import { ProductContent } from "./product-content";

gsap.registerPlugin(useGSAP);

// Permite buscar productos sin distinguir acentos ni mayúsculas.
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

const hiddenUntilAnimation = {
  opacity: 0,
  visibility: "hidden" as const,
};

export function Catalog() {
  const root = useRef<HTMLElement>(null);
  const { contentReady } = useIntroSequence();

  const {
    products,
    loadingProducts,
    productsError,
    refreshProducts,
  } = useStore();

  const params = useSearchParams();
  const q = (params.get("q") || "").trim();

  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("default");
  const [selected, setSelected] = useState<number | null>(null);

  const categories = [
    ...new Set(products.map((p) => p.categoria).filter(Boolean)),
  ];

  const filtered = products
    .filter(
      (p) =>
        (!category || p.categoria === category) &&
        normalize(`${p.nombre} ${p.descripcion || ""}`).includes(normalize(q)),
    )
    .sort((a, b) =>
      sort === "price"
        ? Number(a.precio_final) - Number(b.precio_final)
        : sort === "price-desc"
          ? Number(b.precio_final) - Number(a.precio_final)
          : sort === "name"
            ? a.nombre.localeCompare(b.nombre, "es")
            : a.id - b.id,
    );

  // Ajustar el Hero al alto visible sin dejar espacio artificial al catálogo.
  useLayoutEffect(() => {
    const section = root.current;
    const hero = document.querySelector<HTMLElement>(".home-hero");
    if (!section || !hero) return;

    const originalHeight = hero.style.minHeight;
    const originalMargin = section.style.marginTop;

    const updateHeroHeight = () => {
      // Medir su tamaño natural antes de aplicar el ajuste.
      hero.style.minHeight = originalHeight;
      section.style.removeProperty("margin-top");

      const heroTop = hero.getBoundingClientRect().top + window.scrollY;
      const naturalHeight = hero.getBoundingClientRect().height;
      const availableHeight = window.innerHeight - heroTop - 24;

      if (availableHeight > naturalHeight) {
        hero.style.minHeight = `${availableHeight}px`;
      }
    };

    updateHeroHeight();
    window.addEventListener("resize", updateHeroHeight);

    return () => {
      window.removeEventListener("resize", updateHeroHeight);
      hero.style.minHeight = originalHeight;
      section.style.marginTop = originalMargin;
    };
  }, []);

  useGSAP(
    (_, contextSafe) => {
      const section = root.current;
      if (!section) return;

      // Ocultar los textos desde el inicio, incluso antes de que termine el Hero.
      const entranceElements = section.querySelectorAll<HTMLElement>(
        ".catalog-heading .eyebrow, " +
          "#catalog-title, " +
          ".catalog-heading > p, " +
          ".catalog-controls",
      );

      gsap.set(entranceElements, { autoAlpha: 0 });

      if (!contentReady || !contextSafe) return;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reducedMotion) {
        gsap.set(entranceElements, { autoAlpha: 1 });
        return;
      }

      let viewportObserver: IntersectionObserver | null = null;
      let productsObserver: MutationObserver | null = null;
      let sequence: gsap.core.Timeline | null = null;
      let cardsAnimated = false;

      const animateCards = contextSafe(() => {
        if (cardsAnimated) return;

        const cards = section.querySelectorAll<HTMLElement>(
          ".catalog-grid > :not([aria-hidden])",
        );

        if (!cards.length) return;

        cardsAnimated = true;
        productsObserver?.disconnect();

        const from = { autoAlpha: 0, y: 24 };
        const to = {
          autoAlpha: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.1,
          ease: "power2.out",
          clearProps: "opacity,visibility,transform",
        };

        if (sequence && sequence.progress() < 1) {
          sequence.fromTo(cards, from, to, ">");
        } else {
          gsap.fromTo(cards, from, to);
        }
      });

      const animateCatalog = contextSafe(() => {
        const eyebrow = section.querySelector<HTMLElement>(
          ".catalog-heading .eyebrow",
        );
        const title = section.querySelector<HTMLElement>("#catalog-title");
        const counter = section.querySelector<HTMLElement>(
          ".catalog-heading > p",
        );
        const controls = section.querySelector<HTMLElement>(
          ".catalog-controls",
        );

        sequence = gsap.timeline({
          defaults: { ease: "power2.out" },
        });

        if (eyebrow) {
          sequence.fromTo(
            eyebrow,
            { autoAlpha: 0, y: 12 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.45,
              clearProps: "opacity,visibility,transform",
            },
          );
        }

        if (title) {
          sequence.fromTo(
            title,
            { autoAlpha: 0, y: 20 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              clearProps: "opacity,visibility,transform",
            },
            "-=0.18",
          );
        }

        if (counter) {
          sequence.fromTo(
            counter,
            { autoAlpha: 0, y: 12 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.5,
              clearProps: "opacity,visibility,transform",
            },
            "-=0.35",
          );
        }

        if (controls) {
          sequence.fromTo(
            controls,
            { autoAlpha: 0, y: 16 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.55,
              clearProps: "opacity,visibility,transform",
            },
            "-=0.2",
          );
        }

        // Las tarjetas esperan a que existan productos reales.
        animateCards();

        if (!cardsAnimated && "MutationObserver" in window) {
          productsObserver = new MutationObserver(() => {
            animateCards();
          });

          productsObserver.observe(section, {
            childList: true,
            subtree: true,
          });
        }
      });

      if (!("IntersectionObserver" in window)) {
        animateCatalog();

        return () => {
          productsObserver?.disconnect();
        };
      }

      viewportObserver = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;

          viewportObserver?.disconnect();
          animateCatalog();
        },
        {
          rootMargin: "0px 0px -20% 0px",
          threshold: 0.15,
        },
      );

      // Observar el encabezado, no toda la altura del catálogo.
      const heading = section.querySelector(".catalog-heading");
      viewportObserver.observe(heading ?? section);

      return () => {
        viewportObserver?.disconnect();
        productsObserver?.disconnect();
      };
    },
    {
      scope: root,
      dependencies: [contentReady],
      revertOnUpdate: true,
    },
  );

  return (
    <section
      ref={root}
      id="salsas"
      className="shell catalog"
      aria-labelledby="catalog-title"
    >
      <div className="catalog-heading">
        <div>
          <p className="eyebrow" style={hiddenUntilAnimation}>
            NUESTRA SELECCIÓN
          </p>
          <h2 id="catalog-title" style={hiddenUntilAnimation}>
            Elige el sabor de hoy.
          </h2>
        </div>
        <p style={hiddenUntilAnimation}>
          {loadingProducts
            ? "Consultando catálogo…"
            : productsError
              ? "Catálogo temporalmente no disponible"
              : `${filtered.length} variedades en el catálogo`}
        </p>
      </div>

      <div className="catalog-controls" style={hiddenUntilAnimation}>
        <div className="catalog-pills">
          <button aria-pressed={!category} onClick={() => setCategory("")}>
            Todas las salsas
          </button>

          {categories.length > 1 &&
            categories.map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                onClick={() => setCategory(c!)}
              >
                {c}
              </button>
            ))}

          {q && (
            <Link className="link" href="/#salsas">
              Limpiar búsqueda
            </Link>
          )}
        </div>

        <label>
          Ordenar por
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="default">Selección de la tienda</option>
            <option value="price">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="name">Nombre: A–Z</option>
          </select>
        </label>
      </div>

      {q && <p className="mb-5 text-sm">Resultados para «{q}»</p>}

      {productsError && (
        <div role="alert" className="panel p-6 flex flex-wrap gap-4 items-center">
          <p className="grow text-sm text-(--action-danger)">{productsError}</p>
          <Button onClick={() => void refreshProducts()}>Reintentar</Button>
        </div>
      )}

      {loadingProducts && !products.length ? (
        <div role="status">
          <p className="mb-4 text-sm">Cargando salsas…</p>
          <div className="catalog-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                aria-hidden
                className="aspect-square rounded bg-(--surface-soft)"
              />
            ))}
          </div>
        </div>
      ) : filtered.length ? (
        <div className="catalog-grid">
          {filtered.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              priority={index < 4}
              onOpen={() => setSelected(product.id)}
            />
          ))}
        </div>
      ) : (
        !productsError && (
          <div className="panel py-12 px-6 text-center">
            <SearchX className="mx-auto mb-3" size={28} />
            <h3 className="font-display text-2xl">
              No hay salsas para mostrar
            </h3>
            <p className="mt-3 text-sm text-(--text-secondary)">
              {products.length
                ? "Prueba con otro nombre."
                : "El catálogo aún no tiene productos publicados."}
            </p>
          </div>
        )
      )}

      {selected !== null && (
        <Dialog
          wide
          title="Detalle de la salsa"
          onClose={() => setSelected(null)}
        >
          <ProductContent id={selected} />
        </Dialog>
      )}
    </section>
  );
}
