"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { RecordData } from "@/types";
import { Button } from "@/components/ui/button";
interface Item {
  id_producto: string;
  cantidad: string;
  costo_unitario: string;
}
export function ItemLines({
  products,
  onChange,
}: {
  products: RecordData[];
  onChange: (rows: Item[]) => void;
}) {
  const [rows, setRows] = useState<Item[]>([
    { id_producto: "", cantidad: "1", costo_unitario: "0" },
  ]);
  function set(value: Item[]) {
    setRows(value);
    onChange(value);
  }
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr_44px] sm:grid-cols-[minmax(0,1fr)_75px_100px_44px] gap-2"
        >
          <label className="col-span-3 min-w-0 sm:col-span-1">
            <span className="sr-only">Producto {i + 1}</span>
            <select
              required
              className="field"
              value={r.id_producto}
              onChange={(e) =>
                set(
                  rows.map((v, j) =>
                    j === i ? { ...v, id_producto: e.target.value } : v,
                  ),
                )
              }
            >
              <option value="">Producto</option>
              {products.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {String(p.nombre)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Cantidad {i + 1}</span>
            <input
              required
              min="1"
              max="10000"
              type="number"
              className="field"
              value={r.cantidad}
              onChange={(e) =>
                set(
                  rows.map((v, j) =>
                    j === i ? { ...v, cantidad: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <label>
            <span className="sr-only">Costo unitario {i + 1}</span>
            <input
              required
              min="0"
              step="0.01"
              type="number"
              className="field"
              value={r.costo_unitario}
              onChange={(e) =>
                set(
                  rows.map((v, j) =>
                    j === i ? { ...v, costo_unitario: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <Button
            variant="delete"
            className="!px-2"
            disabled={rows.length === 1}
            aria-label={`Quitar producto ${i + 1}`}
            onClick={() => set(rows.filter((_, j) => j !== i))}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ))}
      <Button
        variant="add"
        onClick={() =>
          set([
            ...rows,
            { id_producto: "", cantidad: "1", costo_unitario: "0" },
          ])
        }
      >
        <Plus size={15} />
        Agregar línea
      </Button>
      <p className="text-xs text-(--text-secondary)">
        Producto · Cantidad · Costo unitario MXN
      </p>
    </div>
  );
}
