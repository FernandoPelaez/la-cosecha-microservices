"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MapPin, Package, Store, UserRound } from "lucide-react";

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

export function HeaderNavigation({
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
