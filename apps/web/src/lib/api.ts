// Error personalizado para las respuestas fallidas de la API.
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Centraliza las peticiones HTTP y el manejo de errores.
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api/${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({
    error: {
      message: "Respuesta no válida del servidor",
    },
  }));

  if (!response.ok) {
    throw new ApiError(
      data.error?.message ||
        data.detail ||
        data.message ||
        "No se pudo completar la operación",
      response.status,
      data.error?.fields,
    );
  }

  return data.data as T;
}

// Simplifica las peticiones que requieren enviar información.
export const send = <T>(
  path: string,
  method: string,
  body?: unknown,
): Promise<T> =>
  api<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

// Formatea cantidades monetarias en pesos mexicanos.
export const money = (value: string | number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value));
  