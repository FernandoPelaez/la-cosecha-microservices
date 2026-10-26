"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/providers";
import { api } from "@/lib/api";
import type { Product } from "@/types";

export interface Review {
  id: number;
  nombre: string;
  calificacion: number;
  comentario: string;
  fecha: string;
}

type LoadedProduct = {
  id: number;
  data: Product;
};

export function useProduct(id: number) {
  const { products } = useStore();

  // Aprovechar la salsa que ya existe en el catálogo.
  // Cuando llegue la respuesta del servidor,
  // tendrá prioridad sobre los datos del catálogo.
  const [loadedProduct, setLoadedProduct] =
    useState<LoadedProduct | null>(null);

  const catalogProduct =
    products.find((item) => item.id === id) ?? null;

  const product =
    loadedProduct?.id === id
      ? loadedProduct.data
      : catalogProduct;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    const abort = new AbortController();

    setError("");
    setReviewError("");
    setLoadingReviews(true);
    setReviews([]);

    // Actualizar el producto sin impedir que se
    // muestre la información disponible en el catálogo.
    api<Product>(`products/${id}`, {
      signal: abort.signal,
    })
      .then((data) => {
        if (!abort.signal.aborted) {
          setLoadedProduct({ id, data });
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setError(e.message);
        }
      });

    // Conservar la consulta independiente de opiniones.
    api<Review[]>(`reviews/product/${id}`, {
      signal: abort.signal,
    })
      .then((data) => {
        if (!abort.signal.aborted) {
          setReviews(data);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setReviewError(e.message);
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) {
          setLoadingReviews(false);
        }
      });

    // Cancelar peticiones si se desmonta el componente
    // o cambia el identificador del producto.
    return () => abort.abort();
  }, [id]);

  // Mantener la actualización manual de las opiniones.
  const reloadReviews = useCallback(async () => {
    try {
      setReviews(await api<Review[]>(`reviews/product/${id}`));
      setReviewError("");
    } catch (e) {
      setReviewError((e as Error).message);
    }
  }, [id]);

  return {
    product,
    reviews,
    error,
    reviewError,
    loadingReviews,
    reloadReviews,
  };
}

