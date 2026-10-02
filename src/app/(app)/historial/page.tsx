import type { Metadata } from "next";
import Link from "next/link";
import { Download, History } from "lucide-react";

import { Encabezado } from "@/components/encabezado";
import { TipoBadge } from "@/components/estado-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { repo } from "@/lib/data";
import { formatoFechaHora } from "@/lib/fechas";
import { buscarMovimientos, leerParams } from "@/lib/historial";
import { permisos } from "@/lib/permisos";
import { requerirUsuario } from "@/lib/sesion";
import { formatoDelta } from "@/lib/stock";

import { FiltrosHistorial } from "./filtros-historial";

export const metadata: Metadata = { title: "Historial" };

export default async function HistorialPage({ searchParams }: PageProps<"/historial">) {
  const usuario = await requerirUsuario();
  const params = leerParams(await searchParams);
  const [movimientos, productos] = await Promise.all([buscarMovimientos(params), repo().listarStock()]);
  const almacenes = [...new Set(productos.map((p) => p.almacen))].sort((a, b) => a.localeCompare(b, "es"));
  const query = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1]))).toString();

  return (
    <>
      <Encabezado titulo="Historial de movimientos" descripcion="Cada movimiento guarda folio, fecha, hora, responsable y observación.">
        {permisos.exportar(usuario.rol) && (
          <Button asChild variant="outline" className="h-10">
            <a href={`/api/historial/csv${query ? `?${query}` : ""}`}>
              <Download /> Exportar CSV
            </a>
          </Button>
        )}
      </Encabezado>

      <FiltrosHistorial inicial={params} almacenes={almacenes} />

      <p className="my-3 text-sm text-muted-foreground">{movimientos.length} movimientos</p>

      {movimientos.length === 0 ? (
        <Card className="items-center py-14 text-center">
          <History className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No hay movimientos con esos filtros</p>
            <p className="text-sm text-muted-foreground">Amplía el rango de fechas o quita filtros.</p>
          </div>
        </Card>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {movimientos.map((m) => (
              <li key={m.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-center gap-2">
                  <TipoBadge tipo={m.tipo} />
                  <span className="text-xs text-muted-foreground">{formatoFechaHora(m.fecha)}</span>
                  <span className="ml-auto font-semibold tabular-nums">
                    {formatoDelta(m)} <span className="text-xs font-normal text-muted-foreground">{m.um}</span>
                  </span>
                </div>
                <Link href={`/catalogo/${m.sku}`} className="mt-1.5 block text-sm font-medium">
                  <span className="font-mono text-xs text-muted-foreground">{m.sku}</span> {m.producto}
                </Link>
                <div className="mt-1 text-xs text-muted-foreground">
                  {m.folio} · {m.responsable} · {m.almacen}
                  {m.observacion && <div className="mt-0.5">{m.observacion}</div>}
                </div>
              </li>
            ))}
          </ul>
          <Card className="hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Folio</TableHead>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Almacén</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead className="pr-4">Observación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="pl-4 font-mono text-xs">{m.folio}</TableCell>
                    <TableCell className="text-muted-foreground">{formatoFechaHora(m.fecha)}</TableCell>
                    <TableCell>
                      <TipoBadge tipo={m.tipo} />
                    </TableCell>
                    <TableCell className="max-w-72 whitespace-normal">
                      <Link href={`/catalogo/${m.sku}`} className="hover:underline">
                        <span className="font-mono text-xs text-muted-foreground">{m.sku}</span> {m.producto}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.almacen}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatoDelta(m)} <span className="text-xs font-normal text-muted-foreground">{m.um}</span>
                    </TableCell>
                    <TableCell>{m.responsable}</TableCell>
                    <TableCell className="max-w-56 pr-4 whitespace-normal text-muted-foreground">{m.observacion ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
