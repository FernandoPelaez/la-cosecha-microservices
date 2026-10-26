import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { destination } from "../../../lib/services";

export const dynamic = "force-dynamic";
async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const route = path.join("/"),
    correlation = randomUUID();
  const error = (status: number, message: string) =>
    NextResponse.json(
      { error: { message } },
      {
        status,
        headers: {
          "X-Correlation-Id": correlation,
          "Cache-Control": "no-store",
        },
      },
    );
  const webhook = route === "webhooks/stripe";
  const target = webhook
    ? {
        base: process.env.COMMERCE_URL || "http://127.0.0.1:4003",
        path: "/webhook",
      }
    : destination(path);
  if (!target) return error(404, "Ruta no encontrada");
  const writing = !["GET", "HEAD"].includes(req.method);
  if (
    writing &&
    !webhook &&
    req.headers.get("origin") !==
      new URL(process.env.APP_URL || "http://localhost:3000").origin
  )
    return error(403, "Origen no permitido");
  if (Number(req.headers.get("content-length") || 0) > 1048576)
    return error(413, "Solicitud demasiado grande");
  try {
    const headers: Record<string, string> = {
      "Content-Type": req.headers.get("content-type") || "application/json",
      "X-Service-Key": process.env.SERVICE_KEY || "",
      "X-Correlation-Id": correlation,
    };
    const token = req.cookies.get("lc_session")?.value;
    if (token) headers.Authorization = `Bearer ${token}`;
    if (webhook)
      headers["stripe-signature"] = req.headers.get("stripe-signature") || "";
    // Mantener bytes originales: volver a serializar JSON invalida la firma de Stripe.
    const body = writing ? await req.arrayBuffer() : undefined;
    if (body && body.byteLength > 1048576)
      return error(413, "Solicitud demasiado grande");
    const upstream = await fetch(
      target.base + target.path + req.nextUrl.search,
      {
        method: req.method,
        headers,
        body,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      },
    );
    const type = upstream.headers.get("content-type") || "application/json";
    let response: NextResponse;
    if (upstream.status === 204)
      response = new NextResponse(null, { status: 204 });
    else if (type.includes("application/json")) {
      const raw = await upstream.json(),
        data = raw.data ?? raw.datos;
      const result =
        raw.success === false
          ? {
              error: {
                message:
                  raw.message ||
                  raw.error ||
                  "No se pudo completar la operación",
              },
            }
          : { ...raw, data };
      if (route === "auth/login" && upstream.ok) {
        response = NextResponse.json(
          { data: data.user },
          { status: upstream.status },
        );
        response.cookies.set("lc_session", data.token, {
          httpOnly: true,
          secure:
            new URL(process.env.APP_URL || "http://localhost:3000").protocol ===
            "https:",
          sameSite: "lax",
          path: "/",
          maxAge: 7200,
        });
      } else response = NextResponse.json(result, { status: upstream.status });
    } else
      response = new NextResponse(await upstream.arrayBuffer(), {
        status: upstream.status,
        headers: {
          "Content-Type": type,
          "Content-Disposition":
            upstream.headers.get("content-disposition") || "inline",
        },
      });
    if (route === "auth/logout" && upstream.ok)
      response.cookies.delete("lc_session");
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Correlation-Id", correlation);
    return response;
  } catch {
    return error(
      503,
      "No se pudo conectar con el servicio. Inténtalo nuevamente.",
    );
  }
}
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
