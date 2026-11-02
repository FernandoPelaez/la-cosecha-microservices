"use client";

import { ProductContent } from "./product-content";

type ProductDetailProps = {
  id: number;
};

export function ProductDetail({ id }: ProductDetailProps) {
  // La navegación de regreso y los detalles pertenecen a ProductContent.
  // No agregar paneles que encierren toda la página.
  return (
    <div className="page pb-12 pt-5 sm:pt-8 lg:pb-16">
      <ProductContent key={id} id={id} standalone />
    </div>
  );
}
