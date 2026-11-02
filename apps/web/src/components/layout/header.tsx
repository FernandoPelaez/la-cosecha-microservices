"use client";

import { Suspense, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  X,
  ShoppingBasket,
  UserRound,
  Menu,
  Store,
  Package,
  MapPin,
  LogOut,
  Settings2,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useStore } from "@/components/providers";
import { Popover } from "@/components/ui/popover";
import { useIntroSequence } from "@/components/ui/intro-sequence";
import { CartDrawer } from "@/features/cart/cart-drawer";
import { AnnouncementBar } from "./announcement-bar";

gsap.registerPlugin(useGSAP);

type NavigationIconName =
  | "store"
  | "profile"
  | "orders"
  | "addresses"
  | "reviews"
  | "returns";

type NavigationLink = {
  href: string;
  label: string;
  icon: NavigationIconName;
  section?: string;
};

const storeLinks: NavigationLink[] = [
  { href: "/", label: "Mi tienda", icon: "store" },
  {
    href: "/cuenta?seccion=orders",
    label: "Mis pedidos",
    icon: "orders",
  },
  {
    href: "/cuenta?seccion=requests",
    label: "Garantías y devoluciones",
    icon: "returns",
  },
];

const accountLinks: NavigationLink[] = [
  { href: "/", label: "Mi tienda", icon: "store" },
  {
    href: "/cuenta?seccion=profile",
    label: "Mis datos",
    icon: "profile",
    section: "profile",
  },
  {
    href: "/cuenta?seccion=orders",
    label: "Mis pedidos",
    icon: "orders",
    section: "orders",
  },
  {
    href: "/cuenta?seccion=addresses",
    label: "Mis domicilios",
    icon: "addresses",
    section: "addresses",
  },
  {
    href: "/cuenta?seccion=reviews",
    label: "Mis reseñas",
    icon: "reviews",
    section: "reviews",
  },
  {
    href: "/cuenta?seccion=requests",
    label: "Garantías y devoluciones",
    icon: "returns",
    section: "requests",
  },
];

function NavigationIcon({
  icon,
  active,
  mobile,
}: {
  icon: NavigationIconName;
  active: boolean;
  mobile: boolean;
}) {
  const selected = active && !mobile;
  const primary = selected
    ? "var(--brand-cream)"
    : "var(--brand-secondary)";

  if (icon === "reviews") {
    return (
      <svg
        width={mobile ? 20 : 19}
        height={mobile ? 20 : 19}
        viewBox="0 0 24 24"
        fill="none"
        stroke={primary}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
        aria-hidden="true"
      >
        <path d="m19.06 12.501 2.78-2.707a.53.53 0 0 0-.294-.905l-5.166-.755a2.1 2.1 0 0 1-1.595-1.16l-2.31-4.68a.53.53 0 0 0-.95.001L9.216 6.974a2.1 2.1 0 0 1-1.597 1.16l-5.165.755a.53.53 0 0 0-.294.906l3.736 3.637a2.1 2.1 0 0 1 .611 1.879l-.88 5.139a.53.53 0 0 0 .769.56l4.617-2.428.027-.014" />
        <path d="m15 18 2 2 4-4" />
      </svg>
    );
  }

  if (icon === "returns") {
    return (
      <svg
        width={24}
        height={24}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M8.5 23.5C12.2 13.3 21.3 7 32 7c10.3 0 19.3 6.3 23 15.6"
          stroke={primary}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="m47.5 18.2 8.2 5.3.6-10"
          stroke={primary}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M55.5 40.5C51.8 50.7 42.7 57 32 57c-10.3 0-19.3-6.3-23-15.6"
          stroke={primary}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="m16.5 45.8-8.2-5.3-.6 10"
          stroke={primary}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m20 25 12-4 12 4-12 4z" fill={primary} />
        <path
          d="m19.5 34 12.5 6 12.5-6v12L32 52l-12.5-6z"
          fill={primary}
        />
        <path
          d="m32 40 0 12"
          stroke={
            selected
              ? "var(--brand-secondary)"
              : "var(--brand-cream)"
          }
          strokeWidth="1.5"
        />
        <path
          d="m20 25-7.6 7.3 12.9 6.2L32 29z"
          fill={primary}
          stroke={
            selected
              ? "var(--brand-secondary)"
              : "var(--brand-cream)"
          }
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="m44 25 7.6 7.3-12.9 6.2L32 29z"
          fill={primary}
          stroke={
            selected
              ? "var(--brand-secondary)"
              : "var(--brand-cream)"
          }
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const Icon = {
    store: Store,
    profile: UserRound,
    orders: Package,
    addresses: MapPin,
  }[icon];

  return (
    <Icon
      size={mobile ? 20 : 19}
      strokeWidth={1.9}
      color={primary}
      className="shrink-0"
      aria-hidden="true"
    />
  );
}

type NavigationItemsProps = {
  links: NavigationLink[];
  account?: boolean;
  selected?: string;
  mobile?: boolean;
  onNavigate?: () => void;
};

function NavigationItems({
  links,
  account = false,
  selected,
  mobile = false,
  onNavigate,
}: NavigationItemsProps) {
  return (
    <>
      {links.map(({ href, label, icon, section }) => {
        const active = account && section === selected;

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={
              mobile
                ? "menu-link"
                : account
                  ? "shrink-0 rounded-full px-3 font-medium"
                  : undefined
            }
            style={
              account
                ? {
                    ...(mobile ? {} : { minHeight: 36 }),
                    backgroundColor: active
                      ? mobile
                        ? "var(--surface-soft)"
                        : "var(--brand-secondary)"
                      : undefined,
                    color: active
                      ? mobile
                        ? "var(--brand-secondary)"
                        : "#fff"
                      : undefined,
                  }
                : undefined
            }
          >
            <NavigationIcon
              icon={icon}
              active={active}
              mobile={mobile}
            />
            {label}
          </Link>
        );
      })}
    </>
  );
}

function AccountNavigationItems({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const params = useSearchParams();
  const requested = params.get("seccion");

  const selected = accountLinks.some(
    ({ section }) => section && section === requested,
  )
    ? (requested ?? "orders")
    : "orders";

  return (
    <NavigationItems
      links={accountLinks}
      account
      selected={selected}
      mobile={mobile}
      onNavigate={onNavigate}
    />
  );
}

function HeaderNavigation({
  account,
  mobile = false,
  onNavigate,
}: {
  account: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  if (!account) {
    return (
      <NavigationItems
        links={storeLinks}
        mobile={mobile}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <NavigationItems
          links={accountLinks}
          account
          selected="orders"
          mobile={mobile}
          onNavigate={onNavigate}
        />
      }
    >
      <AccountNavigationItems
        mobile={mobile}
        onNavigate={onNavigate}
      />
    </Suspense>
  );
}

export function Header() {
  const { user, cart, logout } = useStore();

  const {
    barReady,
    headerReady,
    completeBar,
    completeHeader,
  } = useIntroSequence();

  const router = useRouter();
  const pathname = usePathname();

  const inAccount =
    pathname === "/cuenta" ||
    pathname.startsWith("/cuenta/");

  const showSearch = pathname === "/";

  const root = useRef<HTMLElement>(null);
  const basket = useRef<HTMLSpanElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");

  // Estado exclusivo de apertura del carrito lateral.
  const [cartOpen, setCartOpen] = useState(false);

  const count =
    cart?.items.reduce(
      (sum, item) => sum + item.cantidad,
      0,
    ) ?? 0;

  // Animación original del encabezado.
  useGSAP(
    () => {
      const container = root.current;
      if (!container || !barReady) return;

      const main =
        container.querySelector<HTMLElement>(".header-main");

      const nav =
        container.querySelector<HTMLElement>(".header-nav");

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
      dependencies: [barReady, completeHeader],
      revertOnUpdate: true,
    },
  );

  // Animación original del icono del carrito.
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

  return (
    <>
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
            gridTemplateColumns: showSearch
              ? undefined
              : "minmax(0, 1fr) auto",
          }}
        >
          {/* Identidad de LA COSECHA */}
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
              <small>DE NUESTRA TIERRA A TU MESA</small>
            </span>
          </Link>

          {/* Buscador exclusivo de la tienda */}
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
            {/* Opciones de cuenta */}
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
                      className="menu-link"
                      onClick={() => {
                        close();
                        void logout();
                      }}
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

            {/* Carrito lateral: no cambia de ruta */}
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
            </button>

            {/* Menú móvil existente */}
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

        {/* Navegación original */}
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

      {/* Panel lateral independiente del encabezado */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </>
  );
}

