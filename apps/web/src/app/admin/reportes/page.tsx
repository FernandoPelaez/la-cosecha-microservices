import { redirect } from "next/navigation";
import { serverUser } from "@/lib/server-auth";
import { Reports } from "@/features/admin/reports";
export default async function Page() {
  const user = await serverUser();
  if (!user || !["ADMIN", "INVENTARIO"].includes(user.rol)) redirect("/admin");
  return <Reports />;
}
