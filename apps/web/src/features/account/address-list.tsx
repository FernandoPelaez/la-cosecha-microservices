"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useFeedback } from "@/components/ui/feedback";
import { send } from "@/lib/api";
import type { Address } from "@/types";
import { AddressForm } from "./address-form";

interface AddressListProps {
  addresses: Address[];
  onSaved: () => void;
}

export function AddressList({
  addresses,
  onSaved,
}: AddressListProps) {
  const [editing, setEditing] = useState<
    Address | null | undefined
  >(undefined);

  const [busy, setBusy] = useState(false);

  const { notify, confirm } = useFeedback();

  // Conserva la eliminación con confirmación previa.
  async function deleteAddress(address: Address) {
    if (busy) return;

    const confirmed = await confirm(
      "Eliminar domicilio",
      "Esta acción eliminará el domicilio seleccionado.",
      "delete",
      {
        cancelLabel: "Cancelar",
        confirmLabel: "Eliminar",
        neutralCancel: true,
      },
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      await send(`addresses/${address.id}`, "DELETE");

      notify("Domicilio eliminado correctamente");
      onSaved();
    } catch (error) {
      notify((error as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="addresses-heading"
      className="min-w-0"
    >
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <MapPin
            size={34}
            strokeWidth={1.7}
            aria-hidden="true"
            className="mt-1 shrink-0 text-(--brand-secondary)"
          />

          <div className="min-w-0">
            <h2
              id="addresses-heading"
              className="font-display text-2xl text-(--text-primary) sm:text-3xl"
            >
              Mis domicilios
            </h2>

            <p className="mt-2 text-sm text-(--text-secondary)">
              Administra las direcciones de entrega de tus pedidos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditing(null)}
          className="inline-flex min-h-10 w-fit shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-(--brand-secondary) px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) sm:self-auto"
        >
          <Plus
            size={17}
            strokeWidth={1.8}
            aria-hidden="true"
          />

          Agregar domicilio
        </button>
      </header>

      {/* Domicilios presentados como filas, sin tarjetas. */}
      {addresses.length > 0 ? (
        <div className="divide-y divide-(--border) border-y border-(--border)">
          {addresses.map((address) => (
            <article
              key={address.id}
              className="flex min-w-0 flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--surface-soft) text-(--brand-secondary)">
                  <MapPin
                    size={21}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold wrap-break-word text-(--text-primary)">
                    {address.calle_numero}
                  </h3>

                  <p className="mt-1 text-sm leading-6 wrap-break-word text-(--text-secondary)">
                    {address.colonia}, {address.ciudad},
                    {" "}C.P. {address.codigo_postal}
                  </p>

                  {address.referencias && (
                    <p className="mt-1 text-xs leading-5 wrap-break-word text-(--text-secondary)">
                      Referencia: {address.referencias}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pl-13 sm:shrink-0 sm:pl-0">
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Editar domicilio ${address.calle_numero}`}
                  onClick={() => setEditing(address)}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-(--brand-secondary) px-3 py-1.5 text-xs font-semibold text-(--brand-secondary) hover:bg-(--surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Pencil
                    size={15}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />

                  Editar
                </button>

                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Eliminar domicilio ${address.calle_numero}`}
                  onClick={() => void deleteAddress(address)}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-(--action-danger) px-3 py-1.5 text-xs font-semibold text-(--action-danger) hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--action-danger) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2
                    size={15}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />

                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="border-y border-(--border) py-8 text-sm text-(--text-secondary)">
          Aún no has registrado domicilios.
        </p>
      )}

      {/* Cabecera profesional y ancho específico para domicilios. */}
      {editing !== undefined && (
        <Dialog
          size="medium"
          title={
            editing
              ? "Editar domicilio"
              : "Agregar domicilio"
          }
          titleIcon={
            <MapPin
              size={25}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          }
          description="Ingresa la dirección donde recibirás tus pedidos."
          onClose={() => setEditing(undefined)}
        >
          {(dismiss) => (
            <AddressForm
              key={editing?.id || "new"}
              value={editing || undefined}
              onCancel={dismiss}
              onSaved={() => {
                dismiss();
                onSaved();
              }}
            />
          )}
        </Dialog>
      )}
    </section>
  );
}

