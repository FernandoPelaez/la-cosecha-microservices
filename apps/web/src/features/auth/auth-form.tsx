"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowRightToLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

import { AuthField } from "./auth-field";
import { Turnstile } from "./turnstile";
import { useAuthForm, type AuthMode } from "./use-auth-form";

const titles: Record<AuthMode, string> = {
  login: "Bienvenido de nuevo",
  register: "Crea tu cuenta",
  recover: "Recupera tu acceso",
  reset: "Elige una nueva contraseña",
  verify: "Confirma tu correo",
};

export function AuthForm({
  mode,
  token = "",
}: {
  mode: AuthMode;
  token?: string;
}) {
  const {
    botToken,
    setBotToken,
    busy,
    fields,
    error,
    message,
    reset,
    handleSubmit,
  } = useAuthForm(mode, token);

  const bot = ["login", "register", "recover"].includes(mode);

  return (
    <div className="shell">
      <div className="auth-layout">
        <div className="auth-art" aria-label="Bienvenido a LA COSECHA">
          <div>
            <p className="eyebrow">DE NUESTRA TIERRA A TU MESA</p>
            <h2>Tu próxima comida merece este toque.</h2>
          </div>
          <Image
            src="/images/la_cosecha_salsa_01.png"
            alt="Salsa Macha con Ajo"
            width={320}
            height={360}
          />
          <p>
            Elige tus salsas. Guarda tus domicilios.
            <br />
            Sigue cada pedido desde un mismo lugar.
          </p>
        </div>
        <div className="auth-form-panel">
          <p className="eyebrow mb-3">TU ESPACIO EN LA COSECHA</p>
          <h1
            className={
              mode === "register"
                ? "font-display text-[2rem] leading-tight text-(--text-primary)"
                : "font-display text-3xl text-(--text-primary)"
            }
          >
            {titles[mode]}
          </h1>

          <p
            className={
              mode === "register"
                ? "mb-2 mt-1 text-sm leading-5 text-(--text-secondary)"
                : "mb-6 mt-3 text-sm leading-6 text-(--text-secondary)"
            }
          >
            {mode === "login"
              ? "Consulta tus pedidos y gestiona tu cuenta."
              : mode === "register"
                ? "Guarda tus domicilios y sigue tus compras desde una sola cuenta."
                : mode === "recover"
                  ? "Te enviaremos un enlace para restablecer tu contraseña."
                  : mode === "verify"
                    ? "Pulsa el botón para confirmar que este correo te pertenece."
                    : "Usa al menos 12 caracteres."}
          </p>

          {message ? (
            <div role="status">
              <ShieldCheck
                className="mb-3 text-(--action-buy)"
                aria-hidden="true"
              />

              <p className="text-sm leading-6">{message}</p>

              <Link href="/iniciar-sesion" className="link mt-5 inline-block">
                Ir a iniciar sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <AuthField
                    name="nombre"
                    label="Nombre completo"
                    placeholder="Ej. Juan Pérez López"
                    autoComplete="name"
                    error={fields.nombre}
                    minLength={3}
                    maxLength={150}
                  />

                  <AuthField
                    name="telefono"
                    label="Teléfono"
                    placeholder="Ej. 6681234567"
                    autoComplete="tel-national"
                    error={fields.telefono}
                    inputMode="tel"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    hint="10 dígitos"
                  />
                </>
              )}

              {["login", "register", "recover"].includes(mode) && (
                <AuthField
                  name="correo"
                  type="email"
                  label="Correo electrónico"
                  placeholder="correo@ejemplo.com"
                  autoComplete="email"
                  error={fields.correo}
                />
              )}

              {["login", "register", "reset"].includes(mode) && (
                <AuthField
                  name="password"
                  type="password"
                  label="Contraseña"
                  placeholder={
                    mode === "login"
                      ? "Escribe tu contraseña"
                      : "Crea una contraseña segura"
                  }
                  hint={
                    mode === "login"
                      ? undefined
                      : "Mínimo 12 caracteres; combina palabras, números y símbolos."
                  }
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  error={fields.password}
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={72}
                />
              )}

              {bot && (
                <Turnstile key={reset} action={mode} onToken={setBotToken} />
              )}

              {error && (
                <p role="alert" className="text-sm text-(--action-danger)">
                  {error}
                </p>
              )}

              <Button
                variant={mode === "recover" ? "send" : "save"}
                busy={busy}
                disabled={bot && !botToken}
                type="submit"
                className="w-full"
              >
                {mode === "login"
                  ? "Iniciar sesión"
                  : mode === "register"
                    ? "Crear cuenta"
                    : mode === "recover"
                      ? "Enviar enlace"
                      : mode === "verify"
                        ? "Confirmar correo"
                        : "Guardar contraseña"}

                {mode === "login" ? (
                  <ArrowRightToLine
                    size={20}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight size={17} aria-hidden="true" />
                )}
              </Button>

              {mode === "login" && (
                <div className="flex flex-wrap justify-between gap-3 pt-2 text-xs">
                  <Link href="/recuperar" className="link">
                    Olvidé mi contraseña
                  </Link>

                  <Link href="/registro" className="link">
                    Crear cuenta
                  </Link>
                </div>
              )}

              {mode === "register" && (
                <p className="pt-1 text-center text-sm">
                  ¿Ya tienes cuenta?{" "}
                  <Link href="/iniciar-sesion" className="link">
                    Iniciar sesión
                  </Link>
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
