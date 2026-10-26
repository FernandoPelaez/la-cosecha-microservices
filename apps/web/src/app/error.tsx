"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page">
      <h1 className="page-title">No pudimos cargar esta sección</h1>
      <p className="my-5">Vuelve a intentarlo en un momento.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
