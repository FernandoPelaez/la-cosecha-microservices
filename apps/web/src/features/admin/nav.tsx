"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  Home,
  Package,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Popover } from "@/components/ui/popover";
import { modules } from "./config";

type AdminNavProps = {
  role: string;
  mobileOpen: boolean;
  onNavigate: () => void;
};

type NavGroup = {
  label: string;
  icon: LucideIcon;
  slugs: string[];
};

// Grupos administrativos y sus módulos correspondientes.
const groups: NavGroup[] = [
  {
    label: "Acceso",
    icon: Users,
    slugs: ["usuarios"],
  },
  {
    label: "Catálogo e inventario",
    icon: Package,
    slugs: [
      "productos",
      "inventario",
      "alertas",
      "movimientos",
      "ofertas",
    ],
  },
  {
    label: "Compras",
    icon: ShoppingBag,
    slugs: [
      "proveedores",
      "compras",
      "devoluciones-proveedores",
    ],
  },
  {
    label: "Pedidos y operación",
    icon: ClipboardList,
    slugs: [
      "pedidos",
      "ventas",
      "pagos",
      "envios",
      "paquetes",
      "envasado",
      "entregas",
      "resenas",
      "devoluciones",
      "garantias",
    ],
  },
];

export function AdminNav({
  role,
  mobileOpen,
  onNavigate,
}: AdminNavProps) {
  const pathname = usePathname();

  // Mostrar únicamente los módulos permitidos para el rol.
  const allowed = Object.entries(modules).filter(
    ([, module]) => module.roles.includes(role),
  );

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      links: allowed.filter(([slug]) =>
        group.slugs.includes(slug),
      ),
    }))
    .filter((group) => group.links.length > 0);

  const canViewReports = ["ADMIN", "INVENTARIO"].includes(role);

  const onHome = pathname === "/admin";
  const onReports = pathname === "/admin/reportes";

  return (
    <>
      {/* Navegación de escritorio */}
      <nav
        aria-label="Módulos administrativos"
        className="hidden min-w-0 flex-1 items-center justify-center gap-1 2xl:flex"
      >
        <Link
          href="/admin"
          aria-current={onHome ? "page" : undefined}
          className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium ${
            onHome
              ? "bg-[#f8e8e5] text-(--brand-primary)"
              : "hover:bg-(--surface-soft)"
          }`}
        >
          <Home size={18} strokeWidth={1.8} />
          Inicio
        </Link>

        {visibleGroups.map((group) => {
          const active = group.links.some(
            ([slug]) => pathname === `/admin/${slug}`,
          );

          const Icon = group.icon;

          return (
            <Popover
              key={group.label}
              label={group.label}
              align={
                group.label === "Pedidos y operación"
                  ? "right"
                  : "left"
              }
              showArrow
              trigger={
                <>
                  <Icon size={18} strokeWidth={1.8} />

                  <span
                    className={
                      active
                        ? "font-semibold text-(--brand-primary)"
                        : ""
                    }
                  >
                    {group.label}
                  </span>

                  <ChevronDown
                    size={14}
                    strokeWidth={1.7}
                  />
                </>
              }
            >
              {(close) => (
                <nav aria-label={group.label}>
                  {group.links.map(([slug, module]) => {
                    const selected =
                      pathname === `/admin/${slug}`;

                    return (
                      <Link
                        key={slug}
                        href={`/admin/${slug}`}
                        aria-current={
                          selected ? "page" : undefined
                        }
                        onClick={close}
                        className={`menu-link ${
                          selected
                            ? "bg-(--surface-soft) font-semibold text-(--brand-primary)"
                            : ""
                        }`}
                      >
                        {module.title}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </Popover>
          );
        })}

        {canViewReports && (
          <Link
            href="/admin/reportes"
            aria-current={onReports ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium ${
              onReports
                ? "bg-[#f8e8e5] text-(--brand-primary)"
                : "hover:bg-(--surface-soft)"
            }`}
          >
            <BarChart3 size={18} strokeWidth={1.8} />
            Reportes
          </Link>
        )}
      </nav>

      {/* Navegación móvil y pantallas intermedias */}
      <nav
        id="admin-mobile-nav"
        aria-label="Menú de administración"
        className={`absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-76px)] overflow-y-auto border-b border-(--border) bg-(--surface) px-4 py-3 shadow-lg sm:px-6 2xl:hidden ${
          mobileOpen ? "block" : "hidden"
        }`}
      >
        <div className="mx-auto max-w-3xl">
          <Link
            href="/admin"
            onClick={onNavigate}
            aria-current={onHome ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
              onHome
                ? "bg-[#f8e8e5] text-(--brand-primary)"
                : ""
            }`}
          >
            <Home size={19} strokeWidth={1.8} />
            Inicio
          </Link>

          {visibleGroups.map((group) => {
            const Icon = group.icon;

            const active = group.links.some(
              ([slug]) => pathname === `/admin/${slug}`,
            );

            return (
              <details
                key={group.label}
                className="group border-b border-(--border)"
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <Icon size={19} strokeWidth={1.8} />

                  <span
                    className={
                      active
                        ? "text-(--brand-primary)"
                        : ""
                    }
                  >
                    {group.label}
                  </span>

                  <ChevronDown
                    size={16}
                    strokeWidth={1.7}
                    className="ml-auto group-open:rotate-180"
                  />
                </summary>

                <div className="mb-2 ml-9 border-l border-(--border) pl-2">
                  {group.links.map(([slug, module]) => {
                    const selected =
                      pathname === `/admin/${slug}`;

                    return (
                      <Link
                        key={slug}
                        href={`/admin/${slug}`}
                        onClick={onNavigate}
                        aria-current={
                          selected ? "page" : undefined
                        }
                        className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${
                          selected
                            ? "bg-(--surface-soft) font-semibold text-(--brand-primary)"
                            : "hover:bg-(--surface-soft)"
                        }`}
                      >
                        {module.title}
                      </Link>
                    );
                  })}
                </div>
              </details>
            );
          })}

          {canViewReports && (
            <Link
              href="/admin/reportes"
              onClick={onNavigate}
              aria-current={onReports ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                onReports
                  ? "bg-[#f8e8e5] text-(--brand-primary)"
                  : ""
              }`}
            >
              <BarChart3 size={19} strokeWidth={1.8} />
              Reportes
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
