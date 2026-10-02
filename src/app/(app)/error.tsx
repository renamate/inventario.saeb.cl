"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <TriangleAlert className="size-10 text-amber-600" />
      <h1 className="mt-4 text-xl font-semibold">No pudimos cargar esta sección</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message.startsWith("Supabase")
          ? "La base de datos no respondió. Revisa las variables de Supabase o que el proyecto no esté pausado."
          : "Ocurrió un error inesperado. Intenta de nuevo."}
      </p>
      <Button className="mt-6" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
