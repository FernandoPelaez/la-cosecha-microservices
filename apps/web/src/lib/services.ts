type Destination = { base: string; path: string };
// Registro cerrado: una ruta del navegador nunca puede elegir un host arbitrario.
export function destination(parts: string[]): Destination | null {
  if (
    !parts.length ||
    parts.some((s) => !s || s === "." || s === ".." || /[/\\]/.test(s))
  )
    return null;
  const [head, ...tail] = parts;
  const registry: Record<string, [string, number, string]> = {
    auth: ["AUTH", 4001, ""],
    suppliers: ["OPERATIONS", 4004, "/api/proveedores"],
    orders: ["ORDERS", 4009, "/api/pedidos"],
    checkout: ["ORDERS", 4009, "/api/pedidos"],
    history: ["HISTORY", 4010, "/history"],
    reviews: ["REVIEWS", 4007, "/reviews"],
    alerts: ["ALERTS", 4013, "/api/alertas/stock"],
    roles: ["ROLES", 4012, "/roles"],
    users: ["ROLES", 4012, "/usuarios"],
  };
  for (const route of ["products", "inventory", "stock", "movements", "offers"])
    registry[route] = ["INVENTORY", 4002, `/${route}`];
  for (const route of [
    "sales",
    "payments",
    "cart",
    "addresses",
    "payment-methods",
    "order-result",
    "retry-payment",
    "cancel-order",
    "purchases",
    "supplier-returns",
    "receipts",
  ])
    registry[route] = ["COMMERCE", 4003, `/${route}`];
  for (const route of ["returns", "warranties"])
    registry[route] = ["RETURNS", 4005, `/${route}`];
  for (const route of ["packages", "bottling"])
    registry[route] = ["PACKAGING", 4006, `/${route}`];
  for (const route of ["reports", "dashboard"])
    registry[route] = ["REPORTS", 4008, `/${route}`];
  for (const route of ["shipping", "deliveries"])
    registry[route] = ["SHIPPING", 4011, `/${route}`];
  const entry = Object.hasOwn(registry, head) ? registry[head] : undefined;
  return entry
    ? {
        base: process.env[`${entry[0]}_URL`] || `http://127.0.0.1:${entry[1]}`,
        path:
          entry[2] +
          (tail.length ? "/" + tail.map(encodeURIComponent).join("/") : ""),
      }
    : null;
}
