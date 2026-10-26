

"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ShoppingBasket,
  UserRound,
  Menu,
  Store,
  Package,
  Undo2,
  LogOut,
  Settings2,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { useStore } from "@/components/providers";
import { Popover } from "@/components/ui/popover";
import { useIntroSequence } from "@/components/ui/intro-sequence";
import { AnnouncementBar } from "./announcement-bar";

gsap.registerPlugin(useGSAP);

const links = [
  {
    href: "/",
    label: "Mi tienda",
    Icon: Store,
  },
  {
    href: "/cuenta?seccion=orders",
    label: "Mis pedidos",
    Icon: Package,
  },
  {
    href: "/cuenta?seccion=requests",
    label: "Garantías y devoluciones",
    Icon: Undo2,
  },
];

export function Header() {
  const { user, cart, logout } = useStore();

  const {
    barReady,
    headerReady,
    completeBar,
    completeHeader,
  } = useIntroSequence();

  const router = useRouter();

  const root = useRef<HTMLElement>(null);
  const basket = useRef<HTMLSpanElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");

  const count =
    cart?.items.reduce(
      (sum, item) => sum + item.cantidad,
      0,
    ) ?? 0;

  // La entrada del Header comienza después de la banda roja.
  useGSAP(
    () => {
      const container = root.current;

      if (!container || !barReady) return;

      const main = container.querySelector<HTMLElement>(
        ".header-main",
      );

      const nav = container.querySelector<HTMLElement>(
        ".header-nav",
      );

      if (!main || !nav) return;

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
        defaults: {
          ease: "power2.out",
        },
        onComplete: () => {
          // Eliminar transformaciones que afecten los menús.
          gsap.set([main, nav], {
            autoAlpha: 1,
            clearProps: "transform",
          });

          completeHeader();
        },
      });

      timeline.fromTo(
        main,
        {
          autoAlpha: 0,
          y: 10,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.85,
        },
      );

      timeline.fromTo(
        nav,
        {
          autoAlpha: 0,
          y: 6,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
        },
      );
    },
    {
      scope: root,
      dependencies: [barReady, completeHeader],
      revertOnUpdate: true,
    },
  );

  // Animación del carrito al actualizar su cantidad.
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
        {
          rotate: -8,
          y: -2,
        },
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

  return (
    <header ref={root} className="site-header">
      <AnnouncementBar
        onRevealComplete={completeBar}
      />

      <div
        className="shell header-main"
        style={{
          position: "relative",
          zIndex: 3,
          opacity: 0,
          visibility: "hidden",
        }}
      >
        <Link
          href="/"
          className="brand-link"
          aria-label="LA COSECHA, inicio"
        >
          <Image
            src="/logo/la-cosecha.png"
            alt="Logotipo de LA COSECHA"
            width={114}
            height={94}
            className="brand-logo"
            priority
          />

          <span className="brand-copy">
            <strong>LA COSECHA</strong>
            <small>
              DE NUESTRA TIERRA A TU MESA
            </small>
          </span>
        </Link>

        {/* Buscador con botón para limpiar */}
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
                width: "28px",
                height: "28px",
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
            <Search size={18} strokeWidth={1.6} />
          </button>
        </form>

        <div className="header-actions">
          <Popover
            label={
              user
                ? "Opciones de mi cuenta"
                : "Acceder a mi cuenta"
            }
            trigger={
              <>
                <UserRound
                  size={22}
                  strokeWidth={1.5}
                />

                <span className="header-label">
                  {user
                    ? user.nombre.split(" ")[0]
                    : "Mi cuenta"}
                </span>
              </>
            }
          >
            {(close) =>
              user ? (
                <>
                  <Link
                    onClick={close}
                    href="/cuenta?seccion=profile"
                    className="menu-link"
                  >
                    <UserRound size={16} />
                    Mi cuenta
                  </Link>

                  {user.rol !== "CLIENTE" && (
                    <Link
                      onClick={close}
                      href="/admin"
                      className="menu-link"
                    >
                      <Settings2 size={16} />
                      Administración
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      close();
                      void logout();
                    }}
                    className="menu-link"
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link
                    onClick={close}
                    href="/iniciar-sesion"
                    className="menu-link"
                  >
                    Iniciar sesión
                  </Link>

                  <Link
                    onClick={close}
                    href="/registro"
                    className="menu-link"
                  >
                    Crear cuenta
                  </Link>
                </>
              )
            }
          </Popover>

          <Link
            href="/carrito"
            className="basket-link"
            aria-label={`Mi carrito, ${count} productos`}
          >
            <span
              ref={basket}
              className="basket-symbol"
            >
              <ShoppingBasket
                size={25}
                strokeWidth={1.5}
              />
            </span>

            <span className="basket-count">
              {count > 99 ? "99+" : count}
            </span>

            <span className="header-label">
              Mi carrito
            </span>
          </Link>

          <div className="mobile-menu">
            <Popover
              label="Abrir menú"
              trigger={
                <Menu size={22} strokeWidth={1.5} />
              }
            >
              {(close) =>
                links.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className="menu-link"
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                ))
              }
            </Popover>
          </div>
        </div>
      </div>

      {/* Navegación debajo del encabezado */}
      <nav
        className="header-nav"
        aria-label="Navegación principal"
        style={{
          position: "relative",
          zIndex: 1,
          opacity: 0,
          visibility: "hidden",
        }}
      >
        <div className="shell">
          {links.map(({ href, label, Icon }) => (
            <Link key={href} href={href}>
              <Icon
                size={14}
                strokeWidth={1.5}
              />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

