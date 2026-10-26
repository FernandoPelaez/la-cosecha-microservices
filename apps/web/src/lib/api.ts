export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const r = await fetch(`/api/${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });
  const data = await r
    .json()
    .catch(() => ({ error: { message: "Respuesta no válida del servidor" } }));
  if (!r.ok)
    throw new ApiError(
      data.error?.message ||
        data.detail ||
        data.message ||
        "No se pudo completar la operación",
      r.status,
      data.error?.fields,
    );
  return data.data as T;
}
export const send = <T>(path: string, method: string, body?: unknown) =>
  api<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
export const money = (value: string | number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    Number(value),
  );
