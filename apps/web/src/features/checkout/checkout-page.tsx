"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  CreditCard,
  MapPin,
} from "lucide-react";
import type { Address } from "@/types";
import { api, send } from "@/lib/api";
import { useStore } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { CheckoutAddressStep } from "./checkout-address-step";
import {
  CheckoutPaymentStep,
  type CheckoutPaymentMethod,
} from "./checkout-payment-step";
import { CheckoutReviewStep } from "./checkout-review-step";
import { CheckoutSummary } from "./checkout-summary";

const STEPS = [
  { label: "Domicilio", icon: MapPin },
  { label: "Pago", icon: CreditCard },
  { label: "Revisar pedido", icon: ClipboardCheck },
] as const;

export function CheckoutPage() {
  const { user, loadingUser, cart, loadingCart, cartError, refreshCart } =
    useStore();

  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [methods, setMethods] = useState<CheckoutPaymentMethod[]>([]);
  const [address, setAddress] = useState(0);
  const [method, setMethod] = useState(0);
  const [form, setForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useRef("");

  const loadAddresses = useCallback(async () => {
    setAddresses(await api<Address[]>("addresses"));
  }, []);

  useEffect(() => {
    void loadAddresses().catch((cause) => {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar los domicilios.",
      );
    });

    void api<CheckoutPaymentMethod[]>("payment-methods")
      .then(setMethods)
      .catch((cause) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudieron cargar los métodos de pago.",
        );
      });
  }, [loadAddresses]);

  function selectAddress(id: number) {
    setAddress(id);
    key.current = "";
    setError("");
  }

  function selectMethod(id: number) {
    setMethod(id);
    key.current = "";
    setError("");
  }

  function handleAddressSaved() {
    void loadAddresses().catch((cause) => {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron actualizar los domicilios.",
      );
    });
    setForm(false);
  }

  async function confirmCheckout() {
    if (busy) return;

    setBusy(true);
    setError("");
    key.current ||= crypto.randomUUID();

    try {
      const result = await send<{ url: string }>("checkout", "POST", {
        id_direccion: address,
        id_tipo_pago: method,
        key: key.current,
      });

      const url = new URL(result.url);
      if (
        url.protocol !== "https:" ||
        url.hostname !== "checkout.stripe.com"
      ) {
        throw new Error("El enlace de pago no es válido");
      }

      window.location.assign(url.href);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo iniciar el pago.",
      );
      setBusy(false);
    }
  }

  if (loadingUser || loadingCart) {
    return <div className="page">Cargando…</div>;
  }

  if (!user) {
    return (
      <div className="page">
        <p className="eyebrow mb-2">Último paso hacia tu mesa</p>
        <h1 className="page-title">Finalizar compra</h1>
        <Link href="/iniciar-sesion" className="link mt-6 inline-block">
          Inicia sesión para continuar
        </Link>
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="page" role="alert">
        <p>{cartError}</p>
        <Button className="mt-4" onClick={() => void refreshCart()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!cart?.items.length) {
    return (
      <div className="page">
        <h1 className="page-title">Tu carrito está vacío</h1>
        <Link href="/" className="link mt-6 inline-block">
          Volver a la tienda
        </Link>
      </div>
    );
  }

  const selectedAddress = addresses.find((item) => item.id === address);
  const selectedMethod = methods.find((item) => item.id === method);
  const productCount = cart.items.reduce((sum, item) => sum + item.cantidad, 0);
  const total =
    cart.items.reduce(
      (sum, item) =>
        sum + Math.round(Number(item.precio_final) * 100) * item.cantidad,
      0,
    ) / 100;

  return (
    <div className="page">
      <div className="mx-auto w-full max-w-6xl">
        <p className="eyebrow">
          Compra segura / Paso {String(step + 1).padStart(2, "0")} de 03
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight text-(--text-primary) sm:text-5xl">
          Finalizar compra
        </h1>
        <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
          Tu compra está casi lista. Solo falta completar los siguientes pasos.
        </p>

        <ol
          aria-label="Progreso de compra"
          className="mb-9 mt-8 grid grid-cols-3 border-b border-(--border) sm:mb-12"
        >
          {STEPS.map(({ label, icon: Icon }, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              className={`flex min-w-0 items-center justify-center gap-1.5 border-b-2 px-1 pb-3 text-xs font-medium sm:justify-start sm:gap-2 sm:px-3 sm:text-sm ${
                index === step
                  ? "border-(--brand-primary) text-(--brand-primary)"
                  : index < step
                    ? "border-transparent text-(--brand-secondary)"
                    : "border-transparent text-(--text-secondary)"
              }`}
            >
              {index < step ? (
                <Check size={16} aria-hidden="true" className="shrink-0" />
              ) : (
                <Icon size={16} aria-hidden="true" className="shrink-0" />
              )}
              <span className="sm:hidden">
                {index === 2 ? "Revisar" : label}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </li>
          ))}
        </ol>

        {!user.correo_verificado && (
          <p className="mb-8 border-l-2 border-(--brand-primary) bg-[#fff5df] px-4 py-3 text-sm text-(--text-primary)">
            Confirma tu correo para comprar.{" "}
            <Link href="/cuenta" className="link">
              Ir a mi cuenta
            </Link>
          </p>
        )}

        <div className="grid min-w-0 items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-x-14 lg:gap-y-10">
          <section className="min-w-0" aria-label={STEPS[step].label}>
            {step === 0 ? (
              <CheckoutAddressStep
                addresses={addresses}
                selectedAddress={selectedAddress}
                selectedAddressId={address}
                isAddingAddress={form}
                onSelectAddress={selectAddress}
                onAddAddress={() => setForm(true)}
                onSavedAddress={handleAddressSaved}
                onCancelAddress={() => setForm(false)}
              />
            ) : step === 1 ? (
              <CheckoutPaymentStep
                methods={methods}
                selectedMethodId={method}
                onSelectMethod={selectMethod}
              />
            ) : (
              <CheckoutReviewStep
                selectedAddress={selectedAddress}
                paymentMethodName={selectedMethod?.nombre}
                items={cart.items}
              />
            )}

            {error && (
              <p role="alert" className="mt-6 text-sm text-(--action-danger)">
                {error}
              </p>
            )}
          </section>

          <CheckoutSummary productCount={productCount} total={total} />

          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <div className="flex flex-col-reverse items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between lg:border-t lg:border-(--border) lg:pt-6">
              {step === 0 ? (
                <Link
                  href="/carrito"
                  className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-(--brand-secondary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) sm:justify-start"
                >
                  <ArrowLeft size={17} aria-hidden="true" />
                  Volver al carrito
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep((current) => current - 1)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-(--brand-secondary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand-secondary) disabled:cursor-not-allowed disabled:opacity-50 sm:justify-start"
                >
                  <ArrowLeft size={17} aria-hidden="true" />
                  Anterior
                </button>
              )}

              {step < 2 ? (
                <Button
                  variant="buy"
                  disabled={step === 0 ? !selectedAddress : !selectedMethod}
                  onClick={() => {
                    setError("");
                    setStep((current) => current + 1);
                  }}
                  className="w-full sm:w-auto sm:min-w-40"
                >
                  Continuar
                  <ArrowRight size={17} aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  variant="buy"
                  busy={busy}
                  disabled={!user.correo_verificado}
                  onClick={() => void confirmCheckout()}
                  className="w-full sm:w-auto sm:min-w-44"
                >
                  Confirmar y pagar
                  <ArrowRight size={17} aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
