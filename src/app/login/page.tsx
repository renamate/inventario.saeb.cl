import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { usuarioActual } from "@/lib/sesion";

import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await usuarioActual()) redirect("/");
  const { volver } = await searchParams;
  const mostrarPista = process.env.NODE_ENV !== "production" && !process.env.DEMO_PASSWORD;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--color-secondary),transparent_60%)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <ClipboardList className="size-7" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Inventario SAEB</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bodega CDP · Salón de Asambleas El Belloto</p>
        </div>
        <FormularioLogin volver={typeof volver === "string" ? volver : "/"} mostrarPista={mostrarPista} />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Prueba de concepto con datos reales del Excel SAEB 2027. Acceso restringido.
        </p>
      </div>
    </div>
  );
}
