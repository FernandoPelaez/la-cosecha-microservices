import { Suspense } from "react";
import { Hero } from "@/components/layout/hero";
import { BrandStory } from "@/components/layout/brand-story";
import { Catalog } from "@/features/products/catalog";
export default function Page() {
  return (
    <>
      <Hero />
      <Suspense fallback={<p className="shell py-10">Cargando catálogo…</p>}>
        <Catalog />
      </Suspense>
      <BrandStory />
    </>
  );
}
