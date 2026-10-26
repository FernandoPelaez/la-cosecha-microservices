"use client";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw, Search } from "lucide-react";
import { modules } from "./config";
import type { RecordData } from "@/types";
import { api, send, money } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/components/ui/feedback";
import { useStore } from "@/components/providers";
import { Dialog } from "@/components/ui/dialog";
import { RecordForm } from "./record-form";
export function Resource({ module }: { module: string }) {
  const config = modules[module];
  const { user } = useStore();
  const [rows, setRows] = useState<RecordData[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [editing, setEditing] = useState<RecordData | null | undefined>(undefined),
    [busy, setBusy] = useState(false),
    [detail, setDetail] = useState<RecordData[] | null>(null);
  const { notify, confirm } = useFeedback();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api<RecordData[]>(config.endpoint));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [config.endpoint]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = rows.filter(
    (r) =>
      (!config.filter || config.filter(r)) &&
      Object.values(r).join(" ").toLowerCase().includes(search.toLowerCase()),
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 15) - 1),
  );
  const visible = filtered.slice(currentPage * 15, currentPage * 15 + 15);
  async function remove(row: RecordData) {
    if (
      !(await confirm(
        "Eliminar registro",
        "¿Confirmas que deseas eliminar este registro?",
      ))
    )
      return;
    setBusy(true);
    try {
      await send(
        `${config.writeEndpoint || config.endpoint}/${row.id}`,
        "DELETE",
      );
      notify("Registro eliminado correctamente");
      await load();
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">{config.title}</h1>
          <p className="mt-2 text-sm text-(--text-secondary)">
            {config.subtitle}
          </p>
        </div>
        {config.create && (
          <Button variant="add" onClick={() => setEditing(null)}>
            <Plus size={17} />
            Registrar
          </Button>
        )}
      </div>
      {editing !== undefined && (
        <Dialog
          title={editing ? "Editar registro" : "Nuevo registro"}
          wide
          onClose={() => {
            if (!busy) setEditing(undefined);
          }}
        >
          {(dismiss) => (
            <RecordForm
              key={editing ? String(editing.id) : "new"}
              config={config}
              row={editing}
              onCancel={dismiss}
              onSaved={() => {
                notify("Cambios guardados correctamente");
                dismiss();
                void load();
              }}
            />
          )}
        </Dialog>
      )}
      <div className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border) p-4">
          <div className="flex w-full max-w-sm items-center gap-2">
            <Search size={18} />
            <label className="sr-only" htmlFor="resource-search">
              Filtrar registros
            </label>
            <input
              id="resource-search"
              className="field"
              placeholder="Buscar en esta sección…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <Button variant="edit" busy={loading} onClick={() => void load()}>
            <RefreshCw size={16} />
            Actualizar
          </Button>
        </div>
        {error ? (
          <p role="alert" className="p-6 text-sm text-(--action-danger)">
            {error}
          </p>
        ) : loading ? (
          <p role="status" className="p-8 text-center text-sm">
            Cargando registros…
          </p>
        ) : (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Tabla de registros; desplaza para ver todas las columnas"
          >
            <table className="w-full">
              <thead>
                <tr className="bg-(--surface-soft)">
                  {config.columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className="table-cell whitespace-nowrap font-semibold"
                    >
                      {c.label}
                    </th>
                  ))}
                  {(config.edit ||
                    config.remove ||
                    config.action ||
                    config.detailEndpoint) && (
                    <th scope="col" className="table-cell">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((r, index) => (
                  <tr key={String(r.id || index)}>
                    {config.columns.map((c) => (
                      <td
                        key={c.key}
                        className="table-cell max-w-xs break-words"
                      >
                        {c.key.startsWith("estado") ? (
                          <StatusBadge
                            state={String(r[c.key] ?? "pendiente")}
                          />
                        ) : c.money ? (
                          money(String(r[c.key] || 0))
                        ) : typeof r[c.key] === "boolean" ? (
                          r[c.key] ? (
                            "Sí"
                          ) : (
                            "No"
                          )
                        ) : (
                          String(r[c.key] ?? "—")
                        )}
                      </td>
                    ))}
                    {(config.edit ||
                      config.remove ||
                      config.action ||
                      config.detailEndpoint) && (
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          {config.edit && (
                            <Button
                              variant="edit"
                              className="!px-3"
                              onClick={() => setEditing(r)}
                              aria-label={`Editar registro ${r.id}`}
                            >
                              <Pencil size={15} />
                              <span className="sr-only">Editar</span>
                            </Button>
                          )}
                          {config.remove && (
                            <Button
                              variant="delete"
                              disabled={busy}
                              className="!px-3"
                              onClick={() => void remove(r)}
                              aria-label={`Eliminar registro ${r.id}`}
                            >
                              <Trash2 size={15} />
                            </Button>
                          )}
                          {config.detailEndpoint && (
                            <Button
                              onClick={async () => {
                                try {
                                  setDetail(
                                    await api<RecordData[]>(
                                      `${config.detailEndpoint}/${r.id}`,
                                    ),
                                  );
                                } catch (e) {
                                  notify((e as Error).message, true);
                                }
                              }}
                            >
                              Detalle
                            </Button>
                          )}
                          {(() => {
                            const action =
                              !config.actionRoles ||
                              config.actionRoles.includes(user?.rol || "")
                                ? config.action?.(r)
                                : null;
                            return action ? (
                              <Button
                                variant={action.variant}
                                busy={busy}
                                onClick={async () => {
                                  setBusy(true);
                                  try {
                                    const result = await send<{
                                      completed?: boolean;
                                      status?: string;
                                    }>(action.path, action.method, action.body);
                                    notify(
                                      ["failed", "canceled"].includes(
                                        result?.status || "",
                                      )
                                        ? "El reembolso no se completó; revisa su estado con el procesador"
                                        : result?.completed === false
                                          ? "El procesador todavía está tramitando el reembolso"
                                          : "Operación realizada correctamente",
                                      ["failed", "canceled"].includes(
                                        result?.status || "",
                                      ),
                                    );
                                    await load();
                                  } catch (e) {
                                    notify((e as Error).message, true);
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                              >
                                {action.label}
                              </Button>
                            ) : null;
                          })()}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <p className="p-10 text-center text-sm text-(--text-secondary)">
                No hay registros que coincidan.
              </p>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3 items-center justify-between border-t border-(--border) p-4 text-xs">
          <span>{filtered.length} registros</span>
          <div className="flex gap-2">
            <Button
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              Anterior
            </Button>
            <Button
              disabled={(currentPage + 1) * 15 >= filtered.length}
              onClick={() => setPage(currentPage + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
      {detail && (
        <div className="panel mt-5 p-5">
          <div className="flex justify-between">
            <h2 className="font-display text-xl">Productos de la compra</h2>
            <Button onClick={() => setDetail(null)}>Cerrar detalle</Button>
          </div>
          {detail.map((d, i) => (
            <p key={i} className="mt-4 text-sm">
              {String(d.nombre)} · {String(d.cantidad)} unidades ·{" "}
              {money(String(d.costo_unitario))} por unidad
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
