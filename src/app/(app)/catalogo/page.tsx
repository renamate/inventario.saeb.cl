import type { Metadata } from "next";

import { Encabezado } from "@/components/encabezado";
import { repo } from "@/lib/data";

import { ListaCatalogo } from "./lista-catalogo";

export const metadata: Metadata = { title: "Catálogo" };

export default async function CatalogoPage({ searchParams }: PageProps<"/catalogo">) {
  const params = await searchParams;
  const productos = await repo().listarStock();
  const almacenes = [...new Set(productos.map((p) => p.almacen))].sort((a, b) => a.localeCompare(b, "es"));
  const texto = (v: unknown) => (typeof v === "string" ? v : undefined);

  return (
    <>
      <Encabezado
        titulo="Catálogo de productos"
        descripcion={`${productos.length} productos en ${almacenes.length} almacenes. Busca por SKU, nombre, proveedor o código de proveedor.`}
      />
      <ListaCatalogo
        productos={productos}
        almacenes={almacenes}
        inicial={{ q: texto(params.q), almacen: texto(params.almacen), estado: texto(params.estado), especial: texto(params.especial) }}
      />
    </>
  );
}
