"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  CreditCard,
  ClipboardCheck,
  Check,
  LockKeyhole,
} from "lucide-react";
import type { Address } from "@/types";
import { api, send, money } from "@/lib/api";
import { useStore } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { AddressForm } from "@/features/account/address-form";
interface Method {
  id: number;
  nombre: string;
  disponible: boolean;
}
export function CheckoutPage() {
  const { user, loadingUser, cart, loadingCart, cartError, refreshCart } =
    useStore();
  const [step, setStep] = useState(0),
    [addresses, setAddresses] = useState<Address[]>([]),
    [methods, setMethods] = useState<Method[]>([]),
    [address, setAddress] = useState(0),
    [method, setMethod] = useState(0),
    [form, setForm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = useRef("");
  async function loadAddresses() {
    setAddresses(await api<Address[]>("addresses"));
  }
  useEffect(() => {
    loadAddresses().catch((e) => setError(e.message));
    api<Method[]>("payment-methods")
      .then(setMethods)
      .catch((e) => setError(e.message));
  }, []);
  if (loadingUser || loadingCart) return <div className="page">Cargando…</div>;
  if (!user)
    return (
      <div className="page">
        <p className="eyebrow mb-2">Último paso hacia tu mesa</p>
        <h1 className="page-title">Finalizar compra</h1>
        <Link href="/iniciar-sesion" className="link mt-6 inline-block">
          Inicia sesión para continuar
        </Link>
      </div>
    );
  if (cartError)
    return (
      <div className="page" role="alert">
        {cartError}
        <Button onClick={() => void refreshCart()}>Reintentar</Button>
      </div>
    );
  if (!cart?.items.length)
    return (
      <div className="page">
        <h1 className="page-title">Tu carrito está vacío</h1>
        <Link href="/" className="link mt-6 inline-block">
          Volver a la tienda
        </Link>
      </div>
    );
  const total =
    cart.items.reduce(
      (s, i) => s + Math.round(Number(i.precio_final) * 100) * i.cantidad,
      0,
    ) / 100;
  return (
    <div className="page">
      <p className="eyebrow mb-2">Último paso hacia tu mesa</p>
      <h1 className="page-title">Finalizar compra</h1>
      <ol className="my-5 grid grid-cols-3 gap-2 text-xs sm:text-sm">
        {[
          [MapPin, "Domicilio"],
          [CreditCard, "Pago"],
          [ClipboardCheck, "Revisar pedido"],
        ].map(([Icon, label], i) => {
          const I = Icon as typeof MapPin;
          return (
            <li
              key={i}
              className={`flex flex-wrap items-center justify-center gap-2 rounded-lg border px-2 py-3 ${i === step ? "border-(--brand-primary) bg-white text-(--brand-primary)" : "border-(--border) text-(--text-secondary)"}`}
            >
              {step > i ? <Check size={16} /> : <I size={16} />} {String(label)}
            </li>
          );
        })}
      </ol>
      {!user.correo_verificado && (
        <p className="mb-6 rounded-lg border border-[#dcb787] bg-[#fff5df] p-4 text-sm">
          Confirma tu correo para comprar.{" "}
          <Link href="/cuenta" className="link">
            Ir a mi cuenta
          </Link>
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="panel min-w-0 p-5 sm:p-6">
          {step === 0 ? (
            <>
              <h2 className="font-display text-2xl">
                ¿Dónde recibes tu pedido?
              </h2>
              <div className="my-5 space-y-3">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-(--border) p-4"
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={address === a.id}
                      onChange={() => {
                        setAddress(a.id);
                        key.current = "";
                      }}
                    />
                    <span className="text-sm leading-6">
                      <strong>{a.calle_numero}</strong>
                      <br />
                      {a.colonia}, {a.ciudad}, CP {a.codigo_postal}
                    </span>
                  </label>
                ))}
              </div>
              {form ? (
                <AddressForm
                  onSaved={() => {
                    void loadAddresses();
                    setForm(false);
                  }}
                  onCancel={() => setForm(false)}
                />
              ) : (
                <Button variant="add" onClick={() => setForm(true)}>
                  Agregar domicilio
                </Button>
              )}
            </>
          ) : step === 1 ? (
            <>
              <h2 className="font-display text-2xl">Selecciona cómo pagar</h2>
              <div className="my-5 space-y-3">
                {methods.map((m) => (
                  <label
                    key={m.id}
                    className="flex gap-3 rounded-lg border border-(--border) p-4 text-sm"
                  >
                    <input
                      type="radio"
                      checked={method === m.id}
                      disabled={!m.disponible}
                      onChange={() => {
                        setMethod(m.id);
                        key.current = "";
                      }}
                    />
                    {m.nombre}
                    {!m.disponible && (
                      <span className="text-(--action-danger)">
                        No disponible
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {!methods.some((m) => m.disponible) && (
                <p className="text-sm text-(--text-secondary)">
                  Los pagos en línea aún no están disponibles. Tu carrito se
                  conserva.
                </p>
              )}
              <p className="text-xs leading-6 text-(--text-secondary)">
                La captura y validación de tu tarjeta se realiza en la página
                segura del procesador de pagos.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl">Revisa tu pedido</h2>
              <p className="my-4 text-sm">
                {addresses.find((a) => a.id === address)?.calle_numero} ·{" "}
                {methods.find((m) => m.id === method)?.nombre}
              </p>
              <ul className="divide-y divide-(--border)">
                {cart.items.map((i) => (
                  <li
                    key={i.id_producto}
                    className="flex justify-between gap-4 py-4 text-sm"
                  >
                    <span>
                      {i.cantidad} × {i.nombre}
                    </span>
                    <strong>
                      {money(Number(i.precio_final) * i.cantidad)}
                    </strong>
                  </li>
                ))}
              </ul>
            </>
          )}
          {error && (
            <p role="alert" className="my-4 text-sm text-(--action-danger)">
              {error}
            </p>
          )}
          <div className="mt-7 flex justify-between gap-3">
            {step > 0 ? (
              <Button disabled={busy} onClick={() => setStep((s) => s - 1)}>
                Anterior
              </Button>
            ) : (
              <Link href="/carrito" className="link self-center text-sm">
                Volver al carrito
              </Link>
            )}
            {step < 2 ? (
              <Button
                variant="send"
                disabled={step === 0 ? !address : !method}
                onClick={() => setStep((s) => s + 1)}
              >
                Continuar
              </Button>
            ) : (
              <Button
                variant="buy"
                busy={busy}
                disabled={!user.correo_verificado}
                onClick={async () => {
                  if (busy) return;
                  setBusy(true);
                  setError("");
                  key.current ||= crypto.randomUUID();
                  try {
                    const r = await send<{ url: string }>("checkout", "POST", {
                      id_direccion: address,
                      id_tipo_pago: method,
                      key: key.current,
                    });
                    const url = new URL(r.url);
                    if (
                      url.protocol !== "https:" ||
                      url.hostname !== "checkout.stripe.com"
                    )
                      throw new Error("El enlace de pago no es válido");
                    window.location.assign(url.href);
                  } catch (e) {
                    setError((e as Error).message);
                    setBusy(false);
                  }
                }}
              >
                Confirmar y pagar
              </Button>
            )}
          </div>
        </div>
        <div className="panel h-fit p-5">
          <p className="eyebrow mb-2">Resumen del pedido</p>
          <h2 className="font-display text-2xl">Tu compra</h2>
          <p className="my-4 text-sm text-(--text-secondary)">
            {cart.items.reduce((s, i) => s + i.cantidad, 0)} productos
          </p>
          <div className="flex justify-between border-t border-(--border) pt-5">
            <strong>Total</strong>
            <strong>{money(total)} MXN</strong>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-(--text-secondary)">
            <LockKeyhole size={14} />
            Pago con tarjeta mediante Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
