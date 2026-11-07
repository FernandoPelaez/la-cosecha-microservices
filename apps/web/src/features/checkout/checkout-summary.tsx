import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import type { CartLine } from "@/types";
import { money } from "@/lib/api";

interface CheckoutSummaryProps {
  items: CartLine[];
  total: number;
}

export function CheckoutSummary({
  items,
  total,
}: CheckoutSummaryProps) {
  const productCount = items.reduce(
    (sum, item) => sum + item.cantidad,
    0,
  );

  return (
    <aside
      className="min-w-0 border-t border-(--border) pt-7 lg:row-span-2 lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0"
      aria-label="Resumen del pedido"
    >
      <p className="eyebrow mb-3">Resumen del pedido</p>

      <h2 className="font-display text-3xl text-(--text-primary)">
        Tu compra
      </h2>

      <p className="mt-3 text-sm text-(--text-secondary)">
        {productCount}{" "}
        {productCount === 1 ? "producto" : "productos"}
      </p>

      <ul className="mt-6 divide-y divide-(--border)">
        {items.map((item) => {
          const lineTotal =
            Number(item.precio_final) * item.cantidad;

          return (
            <li
              key={item.id_producto}
              className="flex min-w-0 items-start gap-3 py-4"
            >
              <div className="flex size-16 shrink-0 items-center justify-center">
                <Image
                  src={
                    item.imagen || "/logo/la-cosecha.png"
                  }
                  alt={item.nombre}
                  width={64}
                  height={64}
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="wrap-break-word text-sm font-medium leading-5 text-(--text-primary)">
                  {item.nombre}
                </p>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-xs text-(--text-secondary)">
                    Cantidad: {item.cantidad}
                  </span>

                  <strong className="text-sm font-semibold text-(--text-primary)">
                    {money(lineTotal)}
                  </strong>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 border-t border-(--border) pt-5">
        <p className="text-sm font-medium text-(--text-primary)">
          Total a pagar
        </p>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <strong className="font-display text-4xl font-normal leading-tight text-(--text-primary)">
            {money(total)}
          </strong>

          <span className="text-xs font-semibold text-(--text-secondary)">
            MXN
          </span>
        </div>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs leading-5 text-(--text-secondary)">
        <LockKeyhole
          size={15}
          className="shrink-0 text-(--brand-secondary)"
          aria-hidden="true"
        />

        Pago con tarjeta mediante Stripe
      </p>
    </aside>
  );
}