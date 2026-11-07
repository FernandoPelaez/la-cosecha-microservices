import type { Address } from "@/types";

interface CheckoutReviewStepProps {
  selectedAddress: Address | undefined;
  paymentMethodName: string | undefined;
}

export function CheckoutReviewStep({
  selectedAddress,
  paymentMethodName,
}: CheckoutReviewStepProps) {
  return (
    <>
      <p className="eyebrow mb-3">Última revisión</p>

      <h2 className="font-display text-3xl leading-tight text-(--text-primary) sm:text-4xl">
        Revisa tu pedido
      </h2>

      <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
        Verifica los detalles antes de confirmar tu compra.
      </p>

      <dl className="mt-8 grid gap-6 border-b border-(--border) pb-7 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-(--text-secondary)">
            Domicilio de entrega
          </dt>

          <dd className="mt-2 wrap-break-word text-sm font-medium text-(--text-primary)">
            {selectedAddress?.calle_numero ?? "No seleccionado"}
          </dd>

          {selectedAddress && (
            <dd className="mt-1 wrap-break-word text-xs leading-5 text-(--text-secondary)">
              {selectedAddress.colonia}, {selectedAddress.ciudad} · CP{" "}
              {selectedAddress.codigo_postal}
            </dd>
          )}
        </div>

        <div className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-(--text-secondary)">
            Método de pago
          </dt>

          <dd className="mt-2 text-sm font-medium text-(--text-primary)">
            {paymentMethodName ?? "No seleccionado"}
          </dd>
        </div>
      </dl>
    </>
  );
}
