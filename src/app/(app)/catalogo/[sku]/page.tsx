import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, ExternalLink, Printer, SlidersHorizontal } from "lucide-react";

import { EspecialBadge, EstadoBadge, TipoBadge } from "@/components/estado-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { repo } from "@/lib/data";
import { formatoFechaHora } from "@/lib/fechas";
import { permisos } from "@/lib/permisos";
import { origenApp, qrSvg, urlEtiqueta } from "@/lib/qr";
import { requerirUsuario } from "@/lib/sesion";
import { formatoCantidad, formatoDelta } from "@/lib/stock";

export async function generateMetadata({ params }: PageProps<"/catalogo/[sku]">): Promise<Metadata> {
  const { sku } = await params;
  return { title: `SKU ${sku}` };
}

export default async function ProductoPage({ params }: PageProps<"/catalogo/[sku]">) {
  const { sku: skuTexto } = await params;
  const sku = Number(skuTexto);
  if (!Number.isInteger(sku)) notFound();

  const usuario = await requerirUsuario();
  const r = repo();
  const [producto, movimientos] = await Promise.all([r.obtenerProducto(sku), r.listarMovimientos({ sku })]);
  if (!producto) notFound();

  const url = urlEtiqueta(await origenApp(), sku);
  const svg = await qrSvg(url);

  const desglose = [
    { label: "Stock inicial 2027", valor: producto.stockInicial },
    { label: "Ingresos", valor: producto.ingresos },
    { label: "Salidas", valor: -producto.salidas },
    { label: "Ajustes", valor: producto.ajustes },
  ];

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/catalogo">
          <ArrowLeft /> Catálogo
        </Link>
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">SKU {producto.sku}</span>·<span>{producto.almacen}</span>
            <EstadoBadge estado={producto.estado} />
            {producto.especial && <EspecialBadge />}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{producto.nombre}</h1>
          {producto.descripcionProveedor && <p className="mt-1 text-sm text-muted-foreground">{producto.descripcionProveedor}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button asChild className="h-11">
            <Link href={`/registrar?sku=${sku}&tipo=salida`}>
              <ArrowUpFromLine /> Registrar salida
            </Link>
          </Button>
          {permisos.registrar(usuario.rol, "ingreso") && (
            <Button asChild variant="outline" className="h-11">
              <Link href={`/registrar?sku=${sku}&tipo=ingreso`}>
                <ArrowDownToLine /> Ingreso
              </Link>
            </Button>
          )}
          {permisos.registrar(usuario.rol, "ajuste") && (
            <Button asChild variant="outline" className="h-11">
              <Link href={`/registrar?sku=${sku}&tipo=ajuste`}>
                <SlidersHorizontal /> Ajuste
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Existencia actual</CardTitle>
            <CardDescription>
              Unidad de bodega: {producto.um}. Mínimo: {producto.stockMinimo ?? "sin definir"}
              {producto.especial && " (especial: puede llegar a 0 sin alerta)"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-semibold tabular-nums">
              {formatoCantidad(producto.existencia)} <span className="text-lg font-normal text-muted-foreground">{producto.um}</span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {desglose.map((d) => (
                <div key={d.label} className="rounded-lg bg-muted/60 p-3">
                  <dt className="text-xs text-muted-foreground">{d.label}</dt>
                  <dd className="text-lg font-medium tabular-nums">{formatoCantidad(d.valor)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Etiqueta QR</CardTitle>
            <CardDescription>Al escanearla se abre el registro con este producto cargado.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <div className="size-40 rounded-lg border bg-white p-3 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <code className="max-w-full truncate text-xs text-muted-foreground">{url}</code>
            {permisos.exportar(usuario.rol) && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/etiquetas?skus=${sku}`}>
                  <Printer /> Imprimir etiqueta
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proveedores</CardTitle>
        </CardHeader>
        <CardContent>
          {producto.proveedores.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin proveedor registrado en el Excel.</p>
          ) : (
            <ul className="divide-y">
              {producto.proveedores.map((pp) => (
                <li key={pp.proveedor} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className="font-medium">{pp.proveedor}</span>
                  {pp.preferido && producto.proveedores.length > 1 && <span className="text-xs text-muted-foreground">(preferido)</span>}
                  {pp.codigoProveedor && <span className="font-mono text-xs">Código {pp.codigoProveedor}</span>}
                  {pp.observacion && <span className="text-muted-foreground">{pp.observacion}</span>}
                  {pp.urlPortal && (
                    <a href={pp.urlPortal} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
                      Portal <ExternalLink className="size-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos</CardTitle>
          <CardDescription>{movimientos.length} registrados para este producto.</CardDescription>
        </CardHeader>
        <CardContent>
          {movimientos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay movimientos. La existencia es el stock inicial.</p>
          ) : (
            <ul className="divide-y">
              {movimientos.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <TipoBadge tipo={m.tipo} />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block">{formatoFechaHora(m.fecha)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {m.folio} · {m.responsable}
                      {m.observacion ? ` · ${m.observacion}` : ""}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">{formatoDelta(m)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
