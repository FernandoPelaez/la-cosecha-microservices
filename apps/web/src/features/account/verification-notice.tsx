"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";
import { send } from "@/lib/api";
export function VerificationNotice() {
  const [busy, setBusy] = useState(false);
  const { notify } = useFeedback();
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm">
        Confirma tu correo para completar tu primera compra.
      </p>
      <Button
        variant="send"
        busy={busy}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          try {
            await send("auth/verify/resend", "POST");
            notify("Enlace de verificación enviado");
          } catch (e) {
            notify((e as Error).message, true);
          } finally {
            setBusy(false);
          }
        }}
      >
        Reenviar enlace
      </Button>
    </div>
  );
}
