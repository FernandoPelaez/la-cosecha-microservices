import Image from "next/image";
import Link from "next/link";

type HeaderBrandProps = {
  admin?: boolean;
};

export function HeaderBrand({ admin = false }: HeaderBrandProps) {
  if (admin) {
    return (
      <Link
        href="/admin"
        aria-label="LA COSECHA, inicio de administración"
        className="flex shrink-0 items-center gap-2 sm:gap-3"
      >
        <Image
          src="/logo/la-cosecha.png"
          alt="Logotipo de LA COSECHA"
          width={70}
          height={70}
          className="size-12 shrink-0 object-contain sm:size-16"
          priority
        />
        <span className="whitespace-nowrap font-display text-[17px] font-bold tracking-wide text-(--text-primary) sm:text-[22px]">
          LA COSECHA
        </span>
      </Link>
    );
  }

  return (
    <Link href="/" className="brand-link" aria-label="LA COSECHA, inicio">
      <Image
        src="/logo/la-cosecha.png"
        alt="Logotipo de LA COSECHA"
        width={114}
        height={94}
        className="brand-logo"
        priority
      />
      <span className="brand-copy">
        <strong>LA COSECHA</strong>
        <small>DE NUESTRA TIERRA A TU MESA</small>
      </span>
    </Link>
  );
}
