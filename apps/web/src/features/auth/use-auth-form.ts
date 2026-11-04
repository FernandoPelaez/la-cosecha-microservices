"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/providers";
import { useFeedback } from "@/components/ui/feedback";
import { ApiError, send } from "@/lib/api";

export type AuthMode = "login" | "register" | "recover" | "reset" | "verify";

type AuthResponse = {
  mailSent?: boolean;
  message?: string;
  rol?: string;
};

// Administra el estado y las acciones de los flujos de autenticación.
export function useAuthForm(mode: AuthMode, token: string) {
  const { refreshUser } = useStore();
  const { notify } = useFeedback();
  const router = useRouter();
  const [botToken, setBotToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reset, setReset] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setFields({});

    const data = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const result = await send<AuthResponse>(`auth/${mode}`, "POST", {
        ...data,
        botToken,
        token,
      });

      if (mode === "login") {
        // Sincronizar la sesión antes de navegar.
        await refreshUser();

        // Redirigir según el rol recibido del servidor.
        const destination =
          result.rol && result.rol !== "CLIENTE"
            ? "/admin"
            : "/cuenta";

        router.push(destination);
        router.refresh();
      } else if (mode === "register") {
        setMessage(
          result.mailSent
            ? "Tu cuenta está creada. Revisa tu correo para verificarla."
            : "Tu cuenta está creada. El correo de verificación no pudo enviarse; podrás solicitarlo desde tu cuenta.",
        );
      } else if (mode === "recover") {
        setMessage(result.message || "Revisa tu correo.");
      } else if (mode === "verify") {
        setMessage("Correo confirmado correctamente.");
        void refreshUser();
      } else {
        notify("Contraseña actualizada correctamente");
        router.push("/iniciar-sesion");
      }
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFields(cause.fields);
      }

      setError((cause as Error).message);
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

