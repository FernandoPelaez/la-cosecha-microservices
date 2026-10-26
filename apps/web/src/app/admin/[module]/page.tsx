import { notFound, redirect } from "next/navigation";
import { serverUser } from "@/lib/server-auth";
import { modules } from "@/features/admin/config";
import { Resource } from "@/features/admin/resource";
export default async function Page({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const config = modules[module];
  if (!config) notFound();
  const user = await serverUser();
  if (!user || !config.roles.includes(user.rol)) redirect("/admin");
  return <Resource key={module} module={module} />;
}
