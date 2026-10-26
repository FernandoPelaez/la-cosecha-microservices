"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductContent } from "./product-content";
export function ProductDetail({ id }: { id: number }) {
  return (
    <div className="page max-w-5xl!">
      <Link
        href="/"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm"
      >
        <ArrowLeft size={16} />
        Ir a la tienda
      </Link>
      <div className="panel">
        <ProductContent key={id} id={id} standalone />
      </div>
    </div>
  );
}
