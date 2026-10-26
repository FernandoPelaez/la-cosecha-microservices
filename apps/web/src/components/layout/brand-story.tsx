import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
export function BrandStory() {
  return (
    <section className="shell brand-story" aria-labelledby="story-title">
      <Image
        src="/images/la_cosecha_salsa_02.png"
        alt="Salsa de Chiltepín"
        width={160}
        height={190}
      />
      <div>
        <p className="eyebrow">EL TOQUE QUE HACE LA DIFERENCIA</p>
        <h2 id="story-title">Ponle tu sello a cada comida.</h2>
        <p>
          Explora nuestras salsas, revisa su disponibilidad y elige la que
          quieres llevar a tu mesa. Tus pedidos y su seguimiento, reunidos en tu
          cuenta.
        </p>
      </div>
      <div className="story-actions">
        <a className="hero-cta" href="#salsas">
          Elige tu salsa
          <ArrowUpRight size={16} />
        </a>
        <Link
          className="inline-flex items-center gap-3"
          href="/cuenta?seccion=orders"
        >
          Consulta tus pedidos
          <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
