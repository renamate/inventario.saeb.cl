import type { Metadata } from "next";

import { Encabezado } from "@/components/encabezado";
import { repo } from "@/lib/data";
import { origenApp, qrSvg, urlEtiqueta } from "@/lib/qr";

import { AccionesEtiquetas } from "./acciones-etiquetas";

export const metadata: Metadata = { title: "Etiquetas QR" };

export default async function EtiquetasPage({ searchParams }: PageProps<"/etiquetas">) {
  const { skus } = await searchParams;
  const r = repo();
  const [productos, movimientos] = await Promise.all([r.listarStock(), r.listarMovimientos({ tipo: "salida" })]);

  const rotacion = new Map<number, number>();
  for (const m of movimientos) rotacion.set(m.sku, (rotacion.get(m.sku) ?? 0) + 1);
  const altaRotacion = [...rotacion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([sku]) => sku);

  const pedidos =
    typeof skus === "string" && skus
      ? skus.split(",").map(Number).filter((n) => Number.isInteger(n))
      : altaRotacion;
  const seleccion = pedidos.map((sku) => productos.find((p) => p.sku === sku)).filter((p) => p !== undefined);

  const origen = await origenApp();
  const etiquetas = await Promise.all(seleccion.map(async (p) => ({ producto: p, svg: await qrSvg(urlEtiqueta(origen, p.sku)) })));

  return (
    <>
      <div className="no-print">
        <Encabezado
          titulo="Etiquetas QR"
          descripcion={
            typeof skus === "string" && skus
              ? `${seleccion.length} etiquetas seleccionadas.`
              : "Por defecto se muestran los 10 productos con más salidas registradas (alta rotación)."
          }
        />
        <AccionesEtiquetas
          key={seleccion.map((p) => p.sku).join(",")}
          catalogo={productos.map((p) => ({ sku: p.sku, nombre: p.nombre }))}
          seleccionados={seleccion.map((p) => p.sku)}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:mt-0 print:grid-cols-3 print:gap-2">
        {etiquetas.map(({ producto: p, svg }) => (
          <div key={p.sku} className="flex break-inside-avoid flex-col items-center rounded-xl border bg-white p-3 text-center text-black">
            <div className="aspect-square w-full max-w-36 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="mt-2 font-mono text-lg font-bold">SKU {p.sku}</div>
            <div className="line-clamp-2 text-xs leading-tight">{p.nombre}</div>
            <div className="mt-1 text-[10px] text-neutral-500">
              {p.almacen} · {p.um}
            </div>
          </div>
        ))}
      </div>
      {etiquetas.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Elige productos para generar sus etiquetas.
        </p>
      )}
    </>
  );
}
