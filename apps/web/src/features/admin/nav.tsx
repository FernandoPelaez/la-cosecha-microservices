"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, ChevronDown } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { modules } from "./config";
const groups = [
  { label: "Acceso", slugs: ["usuarios"] },
  {
    label: "Catálogo e inventario",
    slugs: ["productos", "inventario", "alertas", "movimientos", "ofertas"],
  },
  {
    label: "Compras",
    slugs: ["proveedores", "compras", "devoluciones-proveedores"],
  },
  {
    label: "Pedidos y operación",
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
export function AdminNav({ role }: { role: string }) {
  const path = usePathname(),
    router = useRouter();
  const allowed = Object.entries(modules).filter(([, m]) =>
    m.roles.includes(role),
  );
  const report = ["ADMIN", "INVENTARIO"].includes(role);
  return (
    <div className="border-b border-(--border) bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-9">
        <p className="flex items-center gap-2 text-xs font-semibold text-(--brand-primary)">
          <LayoutGrid size={16} />
          Administración
        </p>
        <nav
          aria-label="Módulos administrativos"
          className="hidden items-center gap-1 lg:flex"
        >
          <Link
            href="/admin"
            aria-current={path === "/admin" ? "page" : undefined}
            className="tab"
          >
            Inicio
          </Link>
          {groups.map((g) => {
            const links = allowed.filter(([slug]) => g.slugs.includes(slug));
            return links.length ? (
              <Popover
                key={g.label}
                label={g.label}
                trigger={
                  <>
                    <span
                      className={
                        links.some(([slug]) => path === `/admin/${slug}`)
                          ? "font-semibold text-(--brand-primary)"
                          : ""
                      }
                    >
                      {g.label}
                    </span>
                    <ChevronDown size={13} />
                  </>
                }
              >
                {(close) => (
                  <nav aria-label={g.label}>
                    {links.map(([slug, m]) => (
                      <Link
                        key={slug}
                        href={`/admin/${slug}`}
                        aria-current={
                          path === `/admin/${slug}` ? "page" : undefined
                        }
                        onClick={close}
                        className={`flex min-h-11 items-center rounded-lg px-3 text-xs hover:bg-(--surface-soft) ${path === `/admin/${slug}` ? "bg-(--surface-soft) font-semibold text-(--brand-primary)" : ""}`}
                      >
                        {m.title}
                      </Link>
                    ))}
                  </nav>
                )}
              </Popover>
            ) : null;
          })}
          {report && (
            <Link
              href="/admin/reportes"
              className="tab"
              aria-current={path === "/admin/reportes" ? "page" : undefined}
            >
              Reportes
            </Link>
          )}
        </nav>
        <label className="min-w-0 flex-1 lg:hidden">
          <span className="sr-only">Ir al módulo</span>
          <select
            className="field ml-auto block max-w-xs"
            value={path}
            onChange={(e) => router.push(e.target.value)}
          >
            <option value="/admin">Inicio</option>
            {allowed.map(([slug, m]) => (
              <option key={slug} value={`/admin/${slug}`}>
                {m.title}
              </option>
            ))}
            {report && <option value="/admin/reportes">Reportes</option>}
          </select>
        </label>
      </div>
    </div>
  );
}
