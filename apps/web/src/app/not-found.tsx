import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page text-center">
      <h1 className="page-title">No encontramos esta página</h1>
      <Link href="/" className="link mt-6 inline-block">
        Volver al catálogo
      </Link>
    </div>
  );
}
