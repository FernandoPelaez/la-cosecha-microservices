import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";

import { serverUser } from "@/lib/server-auth";

export default async function AdminProfilePage() {
  const user = await serverUser();

  if (!user) {
    redirect("/iniciar-sesion");
  }

  if (user.rol === "CLIENTE") {
    redirect("/cuenta");
  }

  const profileData = [
    {
      label: "Nombre completo",
      value: user.nombre,
    },
    {
      label: "Correo electrónico",
      value: user.correo,
    },
    {
      label: "Teléfono",
      value: user.telefono || "Sin registrar",
    },
    {
      label: "Rol",
      value: user.rol,
    },
  ];

  return (
    <section
      aria-labelledby="admin-profile-title"
      className="mx-auto w-full max-w-4xl"
    >
      <header className="flex items-start gap-3 border-b border-(--border) pb-6">
        <UserRound
          size={28}
          strokeWidth={1.7}
          className="mt-1 shrink-0 text-(--brand-secondary)"
          aria-hidden="true"
        />

        <div className="min-w-0">
          <h1
            id="admin-profile-title"
            className="font-display text-3xl text-(--text-primary) sm:text-4xl"
          >
            Mi perfil
          </h1>

          <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
            Información de tu cuenta administrativa.
          </p>
        </div>
      </header>

      <dl className="mt-4">
        {profileData.map(({ label, value }) => (
          <div
            key={label}
            className="grid gap-2 border-b border-(--border) py-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center"
          >
            <dt className="text-sm font-medium text-(--text-secondary)">
              {label}
            </dt>

            <dd className="min-w-0 wrap-break-word text-sm font-semibold text-(--text-primary)">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
