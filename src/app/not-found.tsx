import Link from "next/link";
import { PackageX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NoEncontrado() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <PackageX className="size-12 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-semibold">No encontramos esa página</h1>
      <p className="mt-2 text-sm text-muted-foreground">Puede que el SKU no exista en el catálogo o que el enlace esté mal escrito.</p>
      <Button asChild className="mt-6">
        <Link href="/catalogo">Ir al catálogo</Link>
      </Button>
    </div>
  );
}
