"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api, money } from "@/lib/api";
import type { RecordData } from "@/types";
import { Button } from "@/components/ui/button";
export function Reports() {
  const [kind, setKind] = useState("inventory"),
    [from, setFrom] = useState(new Date().toISOString().slice(0, 7) + "-01"),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10)),
    [rows, setRows] = useState<RecordData[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const path = `reports/${kind}?desde=${from}&hasta=${to}`;
  async function load() {
    setBusy(true);
    try {
      setRows(await api<RecordData[]>(path));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [kind]);
  const columns =
    kind === "inventory"
      ? [
          ["nombre", "Producto"],
          ["stock_actual", "Existencias"],
          ["stock_minimo", "Mínimo"],
          ["stock_maximo", "Máximo"],
          ["alerta", "Alerta"],
        ]
      : [
          ["id", "Compra"],
          ["fecha", "Fecha"],
          ["proveedor", "Proveedor"],
          ["estado", "Estado"],
          ["total", "Total"],
        ];
  return (
    <section>
      <h1 className="page-title">Reportes</h1>
      <p className="mb-6 mt-2 text-sm text-(--text-secondary)">
        Inventario y compras a proveedores con información registrada.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
        className="panel mb-6 flex flex-wrap items-end gap-4 p-5"
      >
        <label>
          <span className="label">Reporte</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="field"
          >
            <option value="inventory">Inventario y existencias</option>
            <option value="purchases">Compras a proveedores</option>
          </select>
        </label>
        {kind === "purchases" && (
          <>
            <label>
              <span className="label">Desde</span>
              <input
                type="date"
                className="field"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              <span className="label">Hasta</span>
              <input
                type="date"
                className="field"
                required
                min={from}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </>
        )}
        <Button type="submit" variant="send" busy={busy}>
          Consultar
        </Button>
        <a
          href={`/api/${path}&format=csv`}
          className="flex min-h-11 items-center gap-2 text-sm text-(--action-edit)"
        >
          <Download size={17} />
          Descargar CSV
        </a>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-(--action-danger)">
          {error}
        </p>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-(--surface-soft)">
                {columns.map(([key, label]) => (
                  <th key={key} className="table-cell">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {columns.map(([key]) => (
                    <td key={key} className="table-cell">
                      {key === "total"
                        ? money(String(r[key]))
                        : String(r[key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="p-8 text-center text-sm">
              No hay registros en este periodo.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
