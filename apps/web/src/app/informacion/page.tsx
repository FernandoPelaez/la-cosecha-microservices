import Link from "next/link";
export default function Page() {
  return (
    <article className="page max-w-3xl! py-12!">
      <p className="eyebrow mb-3">ANTES DE COMPRAR</p>
      <h1 className="page-title">Información de compra</h1>
      <div className="mt-8 space-y-6 text-sm leading-7">
        <section>
          <h2 className="font-display text-2xl mb-2">Tu pedido</h2>
          <p>
            Los precios se muestran en pesos mexicanos. El carrito utiliza la
            disponibilidad y los precios vigentes del catálogo. Antes de pagar
            podrás revisar las cantidades, el importe y tu domicilio.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl mb-2">Pago con tarjeta</h2>
          <p>
            El pago se realiza en la página segura de Stripe. LA COSECHA no
            recibe ni almacena el número completo ni el código de seguridad de
            tu tarjeta. El pedido aparece como pagado cuando se confirma el
            cobro.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl mb-2">
            Seguimiento y solicitudes
          </h2>
          <p>
            Consulta el estado de tu compra, la guía cuando esté registrada y el
            comprobante en{" "}
            <Link className="link" href="/cuenta?seccion=orders">
              Mis pedidos
            </Link>
            . Puedes registrar una solicitud de garantía o devolución desde tu
            cuenta; su aprobación requiere revisión.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl mb-2">Datos por confirmar</h2>
          <p>
            Los plazos, cobertura, cargos de envío y condiciones comerciales de
            garantía aún deben ser confirmados por la tienda antes de habilitar
            cobros. No se han establecido tarifas ni promesas de entrega en esta
            página.
          </p>
        </section>
      </div>
    </article>
  );
}
