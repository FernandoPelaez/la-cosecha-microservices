"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";
import type { Review } from "./use-product";

type ProductReviewSummaryProps = {
  reviews: Review[];
};

export function ProductReviewSummary({
  reviews,
}: ProductReviewSummaryProps) {
  const { average, counts } = useMemo(() => {
    const result = [0, 0, 0, 0, 0];
    let total = 0;

    for (const review of reviews) {
      const value = Math.trunc(review.calificacion);

      if (value >= 1 && value <= 5) {
        result[value - 1] += 1;
        total += value;
      }
    }

    return {
      average: reviews.length ? total / reviews.length : 0,
      counts: result,
    };
  }, [reviews]);

  return (
    <div className="grid min-w-0 gap-5 border-b border-(--border) pb-6 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] sm:gap-6">
      <div>
        <p className="text-4xl font-semibold tracking-tight text-(--text-primary)">
          {average.toFixed(1)}
          <span className="ml-1 text-lg font-normal">/ 5</span>
        </p>

        <div
          className="mt-2 flex items-center gap-1 text-(--brand-orange)"
          aria-label={`Calificación media: ${average.toFixed(1)} de 5`}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={21}
              aria-hidden="true"
              fill={index < Math.round(average) ? "currentColor" : "none"}
            />
          ))}
        </div>

        <p className="mt-2 text-xs text-(--text-secondary)">
          {reviews.length} {reviews.length === 1 ? "opinión" : "opiniones"} de
          clientes
        </p>
      </div>

      <div className="min-w-0 space-y-2.5">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = counts[stars - 1];
          const percent = Math.round((count / reviews.length) * 100);

          return (
            <div
              key={stars}
              className="grid grid-cols-[74px_minmax(0,1fr)_35px] items-center gap-2 text-xs text-(--text-secondary)"
            >
              <span>{stars} {stars === 1 ? "estrella" : "estrellas"}</span>

              <div
                role="progressbar"
                aria-label={`${stars} estrellas`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-1.5 overflow-hidden rounded-full bg-(--border)"
              >
                <div
                  className="h-full rounded-full bg-(--brand-secondary)"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <span className="text-right tabular-nums">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
