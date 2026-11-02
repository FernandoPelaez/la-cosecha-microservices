"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, X, Trash2 } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Button } from "./button";
import { Dialog } from "./dialog";

type Notice = {
  id: number;
  text: string;
  error: boolean;
};

// Permite personalizar una confirmación sin afectar las demás.
type ConfirmationOptions = {
  cancelLabel?: string;
  confirmLabel?: string;
  neutralCancel?: boolean;
};

type Confirmation = {
  title: string;
  message: string;
  kind: "delete" | "success";
  options?: ConfirmationOptions;
  resolve: (value: boolean) => void;
};

type FeedbackContextValue = {
  notify: (text: string, error?: boolean) => void;
  confirm: (
    title: string,
    message: string,
    kind?: "delete" | "success",
    options?: ConfirmationOptions,
  ) => Promise<boolean>;
};

const Context = createContext<FeedbackContextValue>({
  notify: () => {},
  confirm: async () => false,
});

export const useFeedback = () => useContext(Context);

function ConfirmationDialog({
  value,
  close,
}: {
  value: Confirmation;
  close: (ok: boolean) => void;
}) {
  const accepted = useRef(false);

  const cancelLabel = value.options?.cancelLabel ?? "Cancelar";

  const confirmLabel =
    value.options?.confirmLabel ??
    (value.kind === "success" ? "Entendido" : "Eliminar");

  return (
    <Dialog
      title={value.title}
      onClose={() => close(accepted.current)}
    >
      {(dismiss) => (
        <div className="p-5 sm:p-6">
          {value.kind === "success" ? (
            <CheckCircle2
              size={30}
              className="text-(--action-buy)"
              aria-hidden="true"
            />
          ) : (
            <Trash2
              size={28}
              className="text-(--action-danger)"
              aria-hidden="true"
            />
          )}

          <p className="my-4 text-sm leading-6 text-(--text-secondary)">
            {value.message}
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            {value.kind === "delete" && (
              <>
                {value.options?.neutralCancel ? (
                  <button
                    type="button"
                    onClick={dismiss}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-(--border) bg-(--surface) px-4 py-2 text-sm font-semibold text-(--text-primary) hover:bg-(--surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary)"
                  >
                    {cancelLabel}
                  </button>
                ) : (
                  <Button variant="cancel" onClick={dismiss}>
                    {cancelLabel}
                  </Button>
                )}
              </>
            )}

            <Button
              variant={
                value.kind === "success" ? "save" : "delete"
              }
              onClick={() => {
                accepted.current = true;
                dismiss();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function Toast({
  value,
  remove,
}: {
  value: Notice;
  remove: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ending = useRef(false);

  const { contextSafe } = useGSAP(
    (_context, safe) => {
      const element = ref.current;

      // Evita operar sobre elementos desmontados.
      if (!element || !element.isConnected) return;

      ending.current = false;

      // El portal utiliza document.body como destino estable.
      if (!element.matches(":popover-open")) {
        element.showPopover?.();
      }

      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.fromTo(
        element,
        {
          opacity: 0,
          y: reduce ? 0 : 8,
        },
        {
          opacity: 1,
          y: 0,
          duration: reduce ? 0 : 0.18,
        },
      );

      const timer = gsap.delayedCall(
        5,
        safe!(() => {
          if (ending.current || !element.isConnected) return;

          ending.current = true;

          gsap.to(element, {
            opacity: 0,
            duration: reduce ? 0 : 0.14,
            overwrite: true,
            onComplete: remove,
          });
        }),
      );

      // Limpia temporizadores y popover al desmontarse.
      return () => {
        timer.kill();

        if (
          element.isConnected &&
          element.matches(":popover-open")
        ) {
          element.hidePopover?.();
        }
      };
    },
    { scope: ref },
  );

  const dismiss = contextSafe(() => {
    const element = ref.current;

    if (
      !element ||
      !element.isConnected ||
      ending.current
    ) {
      return;
    }

    ending.current = true;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    gsap.to(element, {
      opacity: 0,
      duration: reduce ? 0 : 0.14,
      overwrite: true,
      onComplete: remove,
    });
  });

  return createPortal(
    <div
      ref={ref}
      popover="manual"
      role={value.error ? "alert" : "status"}
      className="fixed inset-auto bottom-4 right-4 z-50 m-0 flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-xl border border-(--border) bg-white p-4 text-(--text-primary) shadow-lg"
    >
      {value.error ? (
        <AlertCircle
          size={21}
          className="shrink-0 text-(--action-danger)"
          aria-hidden="true"
        />
      ) : (
        <CheckCircle2
          size={21}
          className="shrink-0 text-(--action-buy)"
          aria-hidden="true"
        />
      )}

      <p className="grow text-sm">{value.text}</p>

      <button
        type="button"
        aria-label="Cerrar notificación"
        onClick={dismiss}
        className="flex size-8 shrink-0 items-center justify-center"
      >
        <X size={16} />
      </button>
    </div>,
    document.body,
  );
}

export function FeedbackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [notice, setNotice] = useState<Notice | null>(null);

  const [confirmation, setConfirmation] =
    useState<Confirmation | null>(null);

  const nextId = useRef(0);

  const pending = useRef<
    ((value: boolean) => void) | null
  >(null);

  const notify = useCallback(
    (text: string, error = false) => {
      setNotice({
        id: ++nextId.current,
        text,
        error,
      });
    },
    [],
  );

  const confirm = useCallback(
    (
      title: string,
      message: string,
      kind: "delete" | "success" = "delete",
      options?: ConfirmationOptions,
    ) =>
      new Promise<boolean>((resolve) => {
        pending.current?.(false);
        pending.current = resolve;

        setConfirmation({
          title,
          message,
          kind,
          options,
          resolve,
        });
      }),
    [],
  );

  return (
    <Context.Provider value={{ notify, confirm }}>
      {children}

      {confirmation && (
        <ConfirmationDialog
          value={confirmation}
          close={(ok) => {
            confirmation.resolve(ok);
            pending.current = null;
            setConfirmation(null);
          }}
        />
      )}

      {notice && (
        <Toast
          key={notice.id}
          value={notice}
          remove={() => setNotice(null)}
        />
      )}
    </Context.Provider>
  );
}
