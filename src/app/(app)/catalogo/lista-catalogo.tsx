"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, PackageSearch, Search, X } from "lucide-react";

import { EspecialBadge, EstadoBadge } from "@/components/estado-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatoCantidad } from "@/lib/stock";
import { normalizar } from "@/lib/texto";
import type { ProductoStock } from "@/lib/types";

type Filtros = { q?: string; almacen?: string; estado?: string; especial?: string };

const TODOS = "todos";

export function ListaCatalogo({
  productos,
  almacenes,
  inicial,
}: {
  productos: ProductoStock[];
  almacenes: string[];
  inicial: Filtros;
}) {
  const router = useRouter();
  const [q, setQ] = useState(inicial.q ?? "");
  const [almacen, setAlmacen] = useState(inicial.almacen ?? TODOS);
  const [estado, setEstado] = useState(inicial.estado ?? TODOS);
  const [especial, setEspecial] = useState(inicial.especial ?? TODOS);
  const busqueda = useDeferredValue(q);

  const filtrados = useMemo(() => {
    const t = normalizar(busqueda.trim());
    return productos.filter((p) => {
      if (almacen !== TODOS && p.almacen !== almacen) return false;
      if (estado !== TODOS && p.estado !== estado) return false;
      if (especial === "si" && !p.especial) return false;
      if (especial === "no" && p.especial) return false;
      if (!t) return true;
      return (
        String(p.sku).startsWith(t) ||
        normalizar(p.nombre).includes(t) ||
        normalizar(p.descripcionProveedor ?? "").includes(t) ||
        p.proveedores.some((pp) => normalizar(pp.proveedor).includes(t) || (pp.codigoProveedor ?? "").startsWith(t))
      );
    });
  }, [productos, busqueda, almacen, estado, especial]);

  const hayFiltros = q !== "" || almacen !== TODOS || estado !== TODOS || especial !== TODOS;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(3,minmax(0,11rem))]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SKU, nombre o proveedor…"
            className="h-11 pl-9"
            inputMode="search"
            aria-label="Buscar producto"
          />
        </div>
        <Select value={almacen} onValueChange={setAlmacen}>
          <SelectTrigger className="h-11 w-full" aria-label="Filtrar por almacén">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los almacenes</SelectItem>
            {almacenes.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="h-11 w-full" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los estados</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="critico">Crítico</SelectItem>
            <SelectItem value="negativo">Negativo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={especial} onValueChange={setEspecial}>
          <SelectTrigger className="h-11 w-full" aria-label="Filtrar por especial">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Especiales y normales</SelectItem>
            <SelectItem value="si">Solo especiales</SelectItem>
            <SelectItem value="no">Sin especiales</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtrados.length} de {productos.length} productos
        </span>
        {hayFiltros && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setAlmacen(TODOS);
              setEstado(TODOS);
              setEspecial(TODOS);
            }}
          >
            <X /> Limpiar filtros
          </Button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <Card className="items-center py-14 text-center">
          <PackageSearch className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No hay productos con esos filtros</p>
            <p className="text-sm text-muted-foreground">Prueba con otro SKU o nombre, o limpia los filtros.</p>
          </div>
        </Card>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {filtrados.map((p) => (
              <li key={p.sku}>
                <Link href={`/catalogo/${p.sku}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-muted">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">SKU {p.sku}</span>·<span className="truncate">{p.almacen}</span>
                    </div>
                    <div className="mt-0.5 text-sm leading-snug font-medium">{p.nombre}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <EstadoBadge estado={p.estado} />
                      {p.especial && <EspecialBadge />}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums">{formatoCantidad(p.existencia)}</div>
                    <div className="text-xs text-muted-foreground">{p.um}</div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>

          <Card className="hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 pl-4">SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Almacén</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Existencia</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="pr-4">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((p) => (
                  <TableRow key={p.sku} className="cursor-pointer" onClick={() => router.push(`/catalogo/${p.sku}`)}>
                    <TableCell className="pl-4 font-mono text-xs text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="max-w-80 whitespace-normal">
                      <Link href={`/catalogo/${p.sku}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                        {p.nombre}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.almacen}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.proveedores.map((pp) => pp.proveedor).join(" / ") || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatoCantidad(p.existencia)} <span className="text-xs font-normal text-muted-foreground">{p.um}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{p.stockMinimo ?? "—"}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex gap-1.5">
                        <EstadoBadge estado={p.estado} />
                        {p.especial && <EspecialBadge />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
