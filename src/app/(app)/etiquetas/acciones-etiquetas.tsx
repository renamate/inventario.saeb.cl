"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ListChecks, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizar } from "@/lib/texto";
import { cn } from "@/lib/utils";

export function AccionesEtiquetas({ catalogo, seleccionados }: { catalogo: { sku: number; nombre: string }[]; seleccionados: number[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [elegidos, setElegidos] = useState<number[]>(seleccionados);

  const resultados = useMemo(() => {
    const t = normalizar(busqueda.trim());
    return catalogo.filter((p) => !t || String(p.sku).startsWith(t) || normalizar(p.nombre).includes(t)).slice(0, 60);
  }, [busqueda, catalogo]);

  function alternar(sku: number) {
    setElegidos((e) => (e.includes(sku) ? e.filter((x) => x !== sku) : [...e, sku]));
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Popover
        open={abierto}
        onOpenChange={(o) => {
          setAbierto(o);
          if (!o) router.replace(`/etiquetas?skus=${elegidos.join(",")}`);
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10">
            <ListChecks /> Elegir productos ({elegidos.length})
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput value={busqueda} onValueChange={setBusqueda} placeholder="SKU o nombre…" />
            <CommandList className="max-h-72">
              <CommandGroup>
                {resultados.map((p) => (
                  <CommandItem key={p.sku} value={String(p.sku)} onSelect={() => alternar(p.sku)}>
                    <Check className={cn("size-4", elegidos.includes(p.sku) ? "opacity-100" : "opacity-0")} />
                    <span className="w-9 font-mono text-xs text-muted-foreground">{p.sku}</span>
                    <span className="truncate">{p.nombre}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button variant="ghost" className="h-10" onClick={() => router.replace("/etiquetas")}>
        Alta rotación
      </Button>
      <Button className="h-10" onClick={() => window.print()}>
        <Printer /> Imprimir
      </Button>
    </div>
  );
}
