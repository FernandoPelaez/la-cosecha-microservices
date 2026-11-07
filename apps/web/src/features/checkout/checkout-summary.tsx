import { LockKeyhole } from "lucide-react";
import { money } from "@/lib/api";

interface CheckoutSummaryProps {
  productCount: number;
  total: number;
}

export function CheckoutSummary({ productCount, total }: CheckoutSummaryProps) {
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
        {productCount} {productCount === 1 ? "producto" : "productos"}
      </p>
      <div className="mt-6 border-t border-(--border) pt-5">
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
