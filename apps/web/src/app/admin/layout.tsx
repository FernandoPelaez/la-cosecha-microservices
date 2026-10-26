import { redirect } from "next/navigation";
import { serverUser } from "@/lib/server-auth";
import { AdminNav } from "@/features/admin/nav";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await serverUser();
  if (!user) redirect("/iniciar-sesion");
  if (user.rol === "CLIENTE") redirect("/cuenta");
  return (
    <>
      <AdminNav role={user.rol} />
      <div className="page">{children}</div>
    </>
  );
}
