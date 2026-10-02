"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { crearSolicitud } from "@/app/acciones";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizar } from "@/lib/texto";
import type { Solicitud } from "@/lib/types";

export type ProductoCatalogo = { sku: number; nombre: string; um: string };

type Props = {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  catalogo: ProductoCatalogo[];
  usuarioNombre: string;
  onCreada: (s: Solicitud) => void;
};

export function NuevaSolicitudDialog({ abierto, onAbiertoChange, catalogo, usuarioNombre, onCreada }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [producto, setProducto] = useState<ProductoCatalogo | null>(null);
  const [productoNuevo, setProductoNuevo] = useState(false);
  const [cantidad, setCantidad] = useState("1");
  const [enlace, setEnlace] = useState("");
  const [asignado, setAsignado] = useState(usuarioNombre);
  const [observacion, setObservacion] = useState("");
  const [pendiente, iniciar] = useTransition();

  const resultados = useMemo(() => {
    const t = normalizar(busqueda.trim());
    if (!t) return catalogo.slice(0, 30);
    return catalogo.filter((p) => String(p.sku).startsWith(t) || normalizar(p.nombre).includes(t)).slice(0, 30);
  }, [busqueda, catalogo]);

  function limpiar() {
    setBusqueda("");
    setProducto(null);
    setProductoNuevo(false);
    setCantidad("1");
    setEnlace("");
    setObservacion("");
  }

  function guardar() {
    iniciar(async () => {
      const r = await crearSolicitud({
        sku: producto?.sku ?? null,
        productoTexto: productoNuevo ? busqueda : null,
        cantidad: Number(cantidad.replace(",", ".")),
        enlace,
        asignadoA: asignado,
        observacion,
        origen: "manual",
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Solicitud agregada a Por comprar.");
      onCreada(r.datos);
      limpiar();
      onAbiertoChange(false);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva solicitud de compra</DialogTitle>
          <DialogDescription>Proveedor y código se precargan desde el catálogo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Producto</Label>
            {producto || productoNuevo ? (
              <div className="flex items-center gap-2 rounded-lg border bg-secondary/50 p-2.5 text-sm">
                <span className="flex-1">
                  {producto ? (
                    <>
                      <span className="font-mono text-xs text-muted-foreground">SKU {producto.sku}</span> {producto.nombre}
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground">Producto nuevo (fuera del catálogo):</span> {busqueda}
                    </>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setProducto(null);
                    setProductoNuevo(false);
                  }}
                  aria-label="Cambiar producto"
                >
                  <X />
                </Button>
              </div>
            ) : (
              <Command shouldFilter={false} className="rounded-lg! border">
                <CommandInput value={busqueda} onValueChange={setBusqueda} placeholder="SKU o nombre…" />
                <CommandList className="max-h-52">
                  <CommandEmpty>
                    {busqueda.trim().length > 2 ? (
                      <Button variant="outline" size="sm" onClick={() => setProductoNuevo(true)}>
                        Solicitar &quot;{busqueda}&quot; como producto nuevo
                      </Button>
                    ) : (
                      "Sin coincidencias."
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {resultados.map((p) => (
                      <CommandItem key={p.sku} value={String(p.sku)} onSelect={() => setProducto(p)}>
                        <span className="w-9 font-mono text-xs text-muted-foreground">{p.sku}</span>
                        <span className="truncate">{p.nombre}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sol-cantidad">Cantidad {producto ? `(${producto.um})` : ""}</Label>
              <Input
                id="sol-cantidad"
                inputMode="decimal"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value.replace(/[^\d.,]/g, ""))}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sol-asignado">Asignado a</Label>
              <Input id="sol-asignado" value={asignado} onChange={(e) => setAsignado(e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sol-enlace">Enlace (proveedor no habitual)</Label>
            <Input id="sol-enlace" type="url" placeholder="https://…" value={enlace} onChange={(e) => setEnlace(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sol-obs">Observación</Label>
            <Input id="sol-obs" value={observacion} onChange={(e) => setObservacion(e.target.value)} className="h-11" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onAbiertoChange(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={pendiente || (!producto && !productoNuevo)}>
            {pendiente && <Loader2 className="animate-spin" />} Agregar a Por comprar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
