import { Suspense } from "react";
import { Account } from "@/features/account/account";
export default function Page() {
  return (
    <Suspense fallback={<p className="page">Cargando cuenta…</p>}>
      <Account />
    </Suspense>
  );
}
