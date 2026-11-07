import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { money } from "@/lib/api";

interface CartSummaryProps {
  productCount: number;
  total: number;
  hasStockIssue: boolean;
  busy: boolean;
}

export function CartSummary({
  productCount,
  total,
  hasStockIssue,
  busy,
}: CartSummaryProps) {
  return (
    <aside
      aria-label="Resumen del carrito"
      className="min-w-0 border-t border-(--border) pt-7 lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0"
    >
      <p className="eyebrow mb-3">Resumen</p>

      <h2 className="font-display text-3xl leading-tight text-(--text-primary)">
        Tu próxima cosecha
      </h2>

      <p className="mt-3 text-sm text-(--text-secondary)">
        {productCount} {productCount === 1 ? "producto" : "productos"}
      </p>

      <div className="mt-7 border-t border-(--border) pt-5">
        <p className="text-sm font-medium text-(--text-primary)">
          Total a pagar
        </p>

        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <strong className="font-display text-4xl font-normal leading-tight text-(--text-primary)">
            {money(total)}
          </strong>

          <span className="text-xs font-semibold text-(--text-secondary)">
            MXN
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs text-(--text-secondary)">
        Importes en pesos mexicanos.
      </p>

      <p className="mt-4 flex items-center gap-2 text-xs text-(--text-secondary)">
        <LockKeyhole
          size={15}
          aria-hidden="true"
          className="shrink-0 text-(--brand-secondary)"
        />
        Pago seguro mediante Stripe
      </p>

      {hasStockIssue ? (
        <p
          role="alert"
          className="mt-6 text-sm leading-6 text-(--action-danger)"
        >
          Ajusta los productos sin disponibilidad para continuar.
        </p>
      ) : (
        <Link
          href="/checkout"
          aria-disabled={busy}
          tabIndex={busy ? -1 : undefined}
          onClick={(event) => {
            if (busy) event.preventDefault();
          }}
          className={`mt-6 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl bg-(--brand-secondary) px-5 py-2.5 text-center text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) ${
            busy
              ? "cursor-not-allowed opacity-50"
              : "hover:bg-(--brand-secondary-hover)"
          }`}
        >
          Continuar con la compra
          <ArrowRight
            size={17}
            className="shrink-0"
            aria-hidden="true"
          />
        </Link>
      )}
    </aside>
  );
}