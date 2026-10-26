import { PurchaseResult } from "@/features/checkout/result";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string }>;
}) {
  const { pedido } = await searchParams;
  return <PurchaseResult id={Number(pedido)} />;
}
