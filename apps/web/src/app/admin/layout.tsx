import { redirect } from "next/navigation";

import { AdminPageTransition } from "@/features/admin/admin-page-transition";
import { serverUser } from "@/lib/server-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await serverUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  if (user.rol === "CLIENTE") {
    redirect("/cuenta");
  }

  return (
    <AdminPageTransition
      role={user.rol}
      name={user.nombre}
    >
      {children}
    </AdminPageTransition>
  );
}

