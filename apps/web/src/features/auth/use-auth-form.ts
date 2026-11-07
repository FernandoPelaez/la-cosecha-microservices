"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/providers";
import { useFeedback } from "@/components/ui/feedback";
import { ApiError, send } from "@/lib/api";

export type AuthMode =
  | "login"
  | "register"
  | "recover"
  | "reset"
  | "verify";

type AuthResponse = {
  mailSent?: boolean;
  message?: string;
  rol?: string;
};

// Centraliza la autenticación de clientes y administradores.
export function useAuthForm(
  mode: AuthMode,
  token: string,
  adminOnly = false,
) {
  const { refreshUser } = useStore();
  const { notify } = useFeedback();
  const router = useRouter();

  const [botToken, setBotToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reset, setReset] = useState(0);

  const verificationAttempt = useRef<string | null>(null);

  // Verificar automáticamente el correo al abrir el enlace.
  useEffect(() => {
    if (mode !== "verify") return;

    if (!/^[a-f0-9]{64}$/.test(token)) {
      setError("El enlace de verificación no es válido.");
      return;
    }

    if (verificationAttempt.current === token) return;

    verificationAttempt.current = token;

    setBusy(true);
    setError("");
    setMessage("");

    async function verifyEmail() {
      try {
        await send("auth/verify", "POST", { token });

        await refreshUser();

        setMessage("Tu correo se verificó correctamente.");
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setBusy(false);
      }
    }

    void verifyEmail();
  }, [mode, token, refreshUser]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || mode === "verify") return;

    setBusy(true);
    setError("");
    setFields({});

    const data = Object.fromEntries(
      new FormData(event.currentTarget),
    );

    try {
      const result = await send<AuthResponse>(
        `auth/${mode}`,
        "POST",
        {
          ...data,
          botToken,
          token,
        },
      );

      if (mode === "login") {
        // Rechazar cuentas que no sean ADMIN en el acceso exclusivo.
        if (adminOnly && result.rol !== "ADMIN") {
          try {
            await send("auth/logout", "POST");
            await refreshUser();

            setError(
              "Esta cuenta no tiene permisos de administrador.",
            );
          } catch {
            await refreshUser();

            setError(
              "No se pudo cerrar la sesión de esta cuenta. Cierra sesión antes de continuar.",
            );
          }

          setBotToken("");
          setReset((value) => value + 1);
          return;
        }

        // Sincronizar la sesión antes de navegar.
        await refreshUser();

        const destination = adminOnly
          ? "/admin"
          : result.rol && result.rol !== "CLIENTE"
            ? "/admin"
            : "/cuenta";

        router.push(destination);
        router.refresh();
      } else if (mode === "register") {
        await refreshUser();

        if (result.mailSent) {
          notify(
            "Tu cuenta está lista. Revisa tu correo para verificarla.",
          );
        } else {
          notify(
            "Tu cuenta está creada, pero no se pudo enviar el correo de verificación.",
            true,
          );
        }

        router.replace("/");
        router.refresh();
      } else if (mode === "recover") {
        setMessage(result.message || "Revisa tu correo.");
      } else {
        notify("Contraseña actualizada correctamente");
        router.push("/iniciar-sesion");
      }
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFields(cause.fields);
      }

      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo completar la operación.",
      );

      setBotToken("");
      setReset((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  return {
    botToken,
    setBotToken,
    busy,
    fields,
    error,
    message,
    reset,
    handleSubmit,
  };
}
