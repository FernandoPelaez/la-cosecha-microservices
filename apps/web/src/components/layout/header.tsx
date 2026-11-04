"use client";

import { useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  X,
  ShoppingBasket,
  Menu,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useStore } from "@/components/providers";
import { HeaderBrand } from "@/components/layout/header-brand";
import { HeaderAccount } from "@/components/layout/header-account";
import { HeaderNavigation } from "@/components/layout/store-navigation";
import { Popover } from "@/components/ui/popover";
import { useIntroSequence } from "@/components/ui/intro-sequence";
import { CartDrawer } from "@/features/cart/cart-drawer";
import { AnnouncementBar } from "./announcement-bar";

gsap.registerPlugin(useGSAP);

export function Header() {
  const { cart } = useStore();

  const {
    barReady,
    headerReady,
    completeBar,
    completeHeader,
  } = useIntroSequence();

  const router = useRouter();
  const pathname = usePathname();

  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const inAccount =
    pathname === "/cuenta" ||
    pathname.startsWith("/cuenta/");

  const showSearch = pathname === "/";
  const root = useRef<HTMLElement>(null);
  const basket = useRef<HTMLSpanElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const count =
    cart?.items.reduce(
      (sum, item) => sum + item.cantidad,
      0,
    ) ?? 0;

  // Conservar la animación original del encabezado.
  useGSAP(
    () => {
      const container = root.current;

      if (!container || !barReady) {
        return;
      }

      const main =
        container.querySelector<HTMLElement>(".header-main");

      const nav =
        container.querySelector<HTMLElement>(".header-nav");

      if (!main || !nav) {
        return;
      }

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reducedMotion) {
        gsap.set([main, nav], {
          autoAlpha: 1,
          clearProps: "transform",
        });

        completeHeader();
        return;
      }

      const timeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: () => {
          gsap.set([main, nav], {
            autoAlpha: 1,
            clearProps: "transform",
          });

          completeHeader();
        },
      });

      timeline.fromTo(
        main,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.85 },
      );

      timeline.fromTo(
        nav,
        { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: 0.55 },
      );
    },
    {
      scope: root,
      dependencies: [barReady, completeHeader, inAdmin],
      revertOnUpdate: true,
    },
  );

  // Conservar la animación original del carrito.
  useGSAP(
    () => {
      if (
        !headerReady ||
        !basket.current ||
        count === 0 ||
        window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches
      ) {
        return;
      }

      gsap.fromTo(
        basket.current,
        { rotate: -8, y: -2 },
        {
          rotate: 0,
          y: 0,
          duration: 0.45,
          ease: "power2.out",
          clearProps: "transform",
        },
      );
    },
    {
      scope: root,
      dependencies: [count, headerReady],
      revertOnUpdate: true,
    },
  );

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const q = query.trim();

    router.push(
      q
        ? `/?q=${encodeURIComponent(q)}#salsas`
        : "/#salsas",
    );
  }

  function clearSearch() {
    setQuery("");
    searchInput.current?.focus();
  }

  // Administración utiliza su propio encabezado.
  if (inAdmin) {
    return null;
  }

  return (
    <>
      <header ref={root} className="site-header">
        <AnnouncementBar onRevealComplete={completeBar} />

        <div
          className="shell header-main"
          style={{
            position: "relative",
            zIndex: 3,
            opacity: 0,
            visibility: "hidden",
            gridTemplateColumns: showSearch
              ? undefined
              : "minmax(0, 1fr) auto",
          }}
        >
          <HeaderBrand />

          {showSearch && (
            <form
              className="header-search"
              role="search"
              onSubmit={search}
              style={{ position: "relative" }}
            >
              <label
                className="sr-only"
                htmlFor="header-search"
              >
                Buscar salsas
              </label>

              <input
                ref={searchInput}
                id="header-search"
                type="text"
                inputMode="search"
                name="q"
                placeholder="Encuentra tu salsa favorita…"
                maxLength={100}
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                style={{ paddingRight: "5rem" }}
              />

              {query.length > 0 && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Borrar búsqueda"
                  title="Borrar búsqueda"
                  onClick={clearSearch}
                  style={{
                    position: "absolute",
                    right: "3.2rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 28,
                    height: 28,
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    zIndex: 2,
                  }}
                >
                  <X size={17} strokeWidth={1.7} />
                </button>
              )}

              <button
                type="submit"
                aria-label="Buscar"
                title="Buscar salsas"
              >
                <Search
                  size={18}
                  strokeWidth={1.6}
                />
              </button>
            </form>
          )}

          <div className="header-actions">
            <HeaderAccount />

            <button
              type="button"
              className="basket-link"
              aria-label={`Mi carrito, ${count} ${
                count === 1 ? "producto" : "productos"
              }`}
              aria-haspopup="dialog"
              aria-expanded={cartOpen}
              onClick={() => setCartOpen(true)}
            >
              <span ref={basket} className="basket-symbol">
                <ShoppingBasket size={25} strokeWidth={1.5} />
              </span>

              <span className="basket-count">
                {count > 99 ? "99+" : count}
              </span>

              <span className="header-label">Mi carrito</span>
            </button>

            <div className="mobile-menu">
              <Popover
                label="Abrir menú"
                trigger={
                  <Menu
                    size={22}
                    strokeWidth={1.5}
                  />
                }
              >
                {(close) => (
                  <HeaderNavigation
                    account={inAccount}
                    mobile
                    onNavigate={close}
                  />
                )}
              </Popover>
            </div>
          </div>
        </div>

        <nav
          className="header-nav"
          aria-label={
            inAccount
              ? "Navegación de mi cuenta"
              : "Navegación principal"
          }
          style={{
            position: "relative",
            zIndex: 1,
            opacity: 0,
            visibility: "hidden",
          }}
        >
          <div
            className="shell"
            style={
              inAccount
                ? {
                    gap: "clamp(8px, 1.3vw, 22px)",
                    minHeight: 50,
                    paddingBlock: 5,
                    fontSize: 12,
                    overflowX: "auto",
                    whiteSpace: "nowrap",
                  }
                : undefined
            }
          >
            <HeaderNavigation account={inAccount} />
          </div>
        </nav>
      </header>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </>
  );
}
