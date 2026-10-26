"use client";
import { useState } from "react";
import { Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useFeedback } from "@/components/ui/feedback";
import { send } from "@/lib/api";
import type { Address } from "@/types";
import { AddressForm } from "./address-form";
export function AddressList({
  addresses,
  onSaved,
}: {
  addresses: Address[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState<Address | null | undefined>(undefined),
    [busy, setBusy] = useState(false);
  const { notify, confirm } = useFeedback();
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="add" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Agregar domicilio
        </Button>
      </div>
      {editing !== undefined && (
        <Dialog
          title={editing ? "Editar domicilio" : "Nuevo domicilio"}
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {addresses.map((a) => (
          <article key={a.id} className="panel p-5">
            <MapPin size={20} className="mb-3 text-(--brand-primary)" />
            <h2 className="text-sm font-semibold">{a.calle_numero}</h2>
            <p className="my-2 text-sm text-(--text-secondary)">
              {a.colonia}, {a.ciudad}, CP {a.codigo_postal}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="edit" onClick={() => setEditing(a)}>
                Editar
              </Button>
              <Button
                variant="delete"
                disabled={busy}
                onClick={async () => {
                  if (
                    !(await confirm(
                      "Eliminar domicilio",
                      "Esta acción eliminará el domicilio seleccionado.",
                    ))
                  )
                    return;
                  setBusy(true);
                  try {
                    await send(`addresses/${a.id}`, "DELETE");
                    notify("Domicilio eliminado correctamente");
                    onSaved();
                  } catch (e) {
                    notify((e as Error).message, true);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Eliminar
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!addresses.length && (
        <p className="panel p-6 text-sm text-(--text-secondary)">
          Aún no has registrado domicilios.
        </p>
      )}
    </>
  );
}
