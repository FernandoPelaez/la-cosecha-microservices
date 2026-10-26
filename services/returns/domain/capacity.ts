import { DomainError } from "./errors.js";
import { assertQuantity } from "./validation.js";
// Regla de Fernando conservada; estados normalizados a los ENUM del SQL oficial.
export function assertReturnCapacity(
  purchased: number,
  previous: readonly { cantidad: number; estado: string }[],
  requested: number,
): void {
  assertQuantity(requested);
  const reserved = previous
    .filter((r) => r.estado !== "rechazada")
    .reduce((sum, r) => sum + r.cantidad, 0);
  if (requested > Math.max(0, purchased - reserved))
    throw new DomainError(
      "RETURN_QUANTITY_EXCEEDED",
      "La cantidad supera las unidades disponibles para devolución",
    );
}
