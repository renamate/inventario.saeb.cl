"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Filtros = { desde?: string; hasta?: string; q?: string; almacen?: string; tipo?: string };

const TODOS = "todos";

export function FiltrosHistorial({ inicial, almacenes }: { inicial: Filtros; almacenes: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendiente, iniciar] = useTransition();
  const [f, setF] = useState<Filtros>(inicial);

  function aplicar(nuevos: Filtros) {
    const qs = new URLSearchParams(Object.entries(nuevos).filter((e): e is [string, string] => Boolean(e[1]))).toString();
    iniciar(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  const hayFiltros = Object.values(inicial).some(Boolean);

  return (
    <form
      className="grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        aplicar(f);
      }}
    >
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="h-q" className="text-xs">
          Producto o responsable
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="h-q" value={f.q ?? ""} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="SKU o nombre" className="h-10 pl-9" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="h-desde" className="text-xs">
          Desde
        </Label>
        <Input id="h-desde" type="date" value={f.desde ?? ""} onChange={(e) => setF({ ...f, desde: e.target.value })} className="h-10" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="h-hasta" className="text-xs">
          Hasta
        </Label>
        <Input id="h-hasta" type="date" value={f.hasta ?? ""} onChange={(e) => setF({ ...f, hasta: e.target.value })} className="h-10" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Almacén</Label>
        <Select value={f.almacen ?? TODOS} onValueChange={(v) => aplicar({ ...f, almacen: v === TODOS ? undefined : v })}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
            {almacenes.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Tipo</Label>
        <Select value={f.tipo ?? TODOS} onValueChange={(v) => aplicar({ ...f, tipo: v === TODOS ? undefined : v })}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
            <SelectItem value="salida">Salida</SelectItem>
            <SelectItem value="ingreso">Ingreso</SelectItem>
            <SelectItem value="ajuste">Ajuste</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit" className="h-10 flex-1 lg:flex-none" disabled={pendiente}>
          {pendiente ? <Loader2 className="animate-spin" /> : <Search />} Filtrar
        </Button>
        {hayFiltros && (
          <Button
            type="button"
            variant="ghost"
            className="h-10"
            onClick={() => {
              setF({});
              aplicar({});
            }}
            aria-label="Limpiar filtros"
          >
            <X />
          </Button>
        )}
      </div>
    </form>
  );
}
