import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@/types";
export const serverUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get("lc_session")?.value;
  if (!token) return null;
  try {
    const r = await fetch(
      `${process.env.AUTH_URL || "http://127.0.0.1:4001"}/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Service-Key": process.env.SERVICE_KEY || "",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    return r.ok ? (await r.json()).data : null;
  } catch {
    return null;
  }
});
