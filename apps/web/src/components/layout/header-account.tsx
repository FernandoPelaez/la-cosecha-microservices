"use client";

import Link from "next/link";
import {
  ChevronDown,
  LogOut,
  Settings2,
  UserRound,
} from "lucide-react";

import { useStore } from "@/components/providers";
import { Popover } from "@/components/ui/popover";

type HeaderAccountProps = {
  admin?: boolean;
  name?: string;
};

export function HeaderAccount({
  admin = false,
  name,
}: HeaderAccountProps) {
  const { user, logout } = useStore();

  const hasSession = admin || Boolean(user);
  const isAdministrator =
    admin || (Boolean(user) && user?.rol !== "CLIENTE");

  const displayName = (admin ? name : user?.nombre)
    ?.trim()
    .split(/\s+/)[0];

  const profileHref = isAdministrator
    ? "/admin/perfil"
    : "/cuenta?seccion=profile";

  return (
    <Popover
      label={
        hasSession
          ? "Opciones de mi cuenta"
          : "Acceder a mi cuenta"
      }
      showArrow
      trigger={
        <>
          <UserRound size={22} strokeWidth={1.5} />

          <span
            className={
              admin
                ? "max-w-22 truncate text-xs font-medium max-[359px]:hidden sm:text-sm"
                : "header-label"
            }
          >
            {displayName ||
              (admin ? "Administrador" : "Mi cuenta")}
          </span>

          {admin && (
            <ChevronDown size={14} strokeWidth={1.7} />
          )}
        </>
      }
    >
      {(close) =>
        hasSession ? (
          <>
            <Link
              href={profileHref}
              onClick={close}
              className="menu-link"
            >
              <UserRound size={16} />
              {isAdministrator ? "Mi perfil" : "Mi cuenta"}
            </Link>

            {!admin && isAdministrator && (
              <Link
                href="/admin"
                onClick={close}
                className="menu-link"
              >
                <Settings2 size={16} />
                Administración
              </Link>
            )}

            <button
              type="button"
              className="menu-link text-(--action-danger)"
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
              href="/iniciar-sesion"
              onClick={close}
              className="menu-link"
            >
              Iniciar sesión
            </Link>

            <Link
              href="/registro"
              onClick={close}
              className="menu-link"
            >
              Crear cuenta
            </Link>
          </>
        )
      }
    </Popover>
  );
}

