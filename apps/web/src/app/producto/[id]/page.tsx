import { notFound } from "next/navigation";
import { ProductDetail } from "@/features/products/detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const key = Number(id);
  if (!Number.isSafeInteger(key) || key <= 0) notFound();
  return <ProductDetail id={key} />;
}
