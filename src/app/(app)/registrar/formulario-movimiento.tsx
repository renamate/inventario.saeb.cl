"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CheckCircle2,
  Clock,
  Loader2,
  Minus,
  Plus,
  ScanLine,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { registrarMovimiento } from "@/app/acciones";
import { Escaner } from "@/components/escaner";
import { EspecialBadge, EstadoBadge } from "@/components/estado-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COOKIE_RESPONSABLE } from "@/lib/sesion-token";
import { calcularEstado, formatoCantidad } from "@/lib/stock";
import { normalizar } from "@/lib/texto";
import { TIPO_LABEL, type EstadoStock, type Movimiento, type TipoMovimiento, type Usuario } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ProductoOpcion = {
  sku: number;
  nombre: string;
  um: string;
  almacen: string;
  existencia: number;
  stockMinimo: number | null;
  especial: boolean;
  estado: EstadoStock;
  codigos: string[];
};

type Props = {
  productos: ProductoOpcion[];
  usuario: Usuario;
  tiposPermitidos: TipoMovimiento[];
  skuInicial?: number;
  tipoInicial: TipoMovimiento;
  escanearAlInicio: boolean;
  responsableInicial?: string;
};

const TIPOS: { tipo: TipoMovimiento; icon: typeof ArrowUpFromLine; ayuda: string }[] = [
  { tipo: "salida", icon: ArrowUpFromLine, ayuda: "Retiro de bodega. Cantidad positiva." },
  { tipo: "ingreso", icon: ArrowDownToLine, ayuda: "Llegada de mercadería. Cantidad positiva." },
  { tipo: "ajuste", icon: SlidersHorizontal, ayuda: "Corrección de inventario: + agrega, − descuenta." },
];


/** Interpreta el contenido de un QR o código de barra y devuelve el SKU si existe en el catálogo. */
function resolverCodigo(codigo: string, productos: ProductoOpcion[]): ProductoOpcion | undefined {
  const texto = codigo.trim();
  const deUrl = texto.match(/\/r\/(\d+)/)?.[1] ?? texto.match(/[?&]sku=(\d+)/)?.[1];
  const candidato = deUrl ?? texto;
  const porSku = productos.find((p) => String(p.sku) === candidato);
  if (porSku) return porSku;
  return productos.find((p) => p.codigos.includes(texto));
}

export function FormularioMovimiento({ productos: productosIniciales, usuario, tiposPermitidos, skuInicial, tipoInicial, escanearAlInicio, responsableInicial }: Props) {
  const [productos, setProductos] = useState(productosIniciales);
  const [sku, setSku] = useState<number | null>(
    skuInicial && productosIniciales.some((p) => p.sku === skuInicial) ? skuInicial : null,
  );
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<TipoMovimiento>(tipoInicial);
  const [cantidad, setCantidad] = useState("1");
  const [signoAjuste, setSignoAjuste] = useState<1 | -1>(-1);
  const [responsable, setResponsable] = useState(responsableInicial ?? usuario.nombre);
  const [observacion, setObservacion] = useState("");
  const [escaneando, setEscaneando] = useState(escanearAlInicio);
  const [error, setError] = useState<string | null>(
    skuInicial && !productosIniciales.some((p) => p.sku === skuInicial) ? `El SKU ${skuInicial} no existe en el catálogo.` : null,
  );
  const [exito, setExito] = useState<{ movimiento: Movimiento; antes: number; despues: number } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const producto = productos.find((p) => p.sku === sku) ?? null;
  const cantidadNum = Number(cantidad.replace(",", "."));
  const cantidadValida = Number.isFinite(cantidadNum) && cantidadNum > 0;
  const delta = !cantidadValida ? 0 : tipo === "salida" ? -cantidadNum : tipo === "ingreso" ? cantidadNum : signoAjuste * cantidadNum;
  const despues = producto ? producto.existencia + delta : 0;
  const estadoDespues = producto ? calcularEstado(despues, producto.stockMinimo, producto.especial) : "ok";

  const resultados = useMemo(() => {
    const t = normalizar(busqueda.trim());
    if (!t) return productos.slice(0, 40);
    return productos
      .filter((p) => String(p.sku).startsWith(t) || normalizar(p.nombre).includes(t) || p.codigos.some((c) => c.startsWith(t)))
      .sort((a, b) => Number(String(b.sku) === t) - Number(String(a.sku) === t))
      .slice(0, 40);
  }, [busqueda, productos]);

  function elegir(p: ProductoOpcion) {
    setSku(p.sku);
    setBusqueda("");
    setError(null);
  }

  function alEscanear(codigo: string) {
    const p = resolverCodigo(codigo, productos);
    setEscaneando(false);
    if (p) {
      elegir(p);
      toast.success(`SKU ${p.sku} · ${p.nombre}`);
    } else {
      setError(`El código "${codigo}" no corresponde a ningún producto del catálogo.`);
    }
  }

  function ajustarCantidad(paso: number) {
    const base = cantidadValida ? cantidadNum : 0;
    setCantidad(String(Math.max(1, base + paso)));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!producto) return setError("Elige un producto del catálogo.");
    if (!cantidadValida) return setError("Ingresa una cantidad mayor que 0.");
    setError(null);
    iniciar(async () => {
      const r = await registrarMovimiento({
        sku: producto.sku,
        tipo,
        cantidad: tipo === "ajuste" ? signoAjuste * cantidadNum : cantidadNum,
        responsable,
        observacion,
      });
      if (!r.ok) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      if (usuario.rol === "voluntario") {
        document.cookie = `${COOKIE_RESPONSABLE}=${encodeURIComponent(responsable)}; path=/; max-age=31536000; samesite=lax`;
      }
      setProductos((lista) =>
        lista.map((p) =>
          p.sku === producto.sku
            ? { ...p, existencia: r.datos.existenciaNueva, estado: calcularEstado(r.datos.existenciaNueva, p.stockMinimo, p.especial) }
            : p,
        ),
      );
      setExito({ movimiento: r.datos.movimiento, antes: r.datos.existenciaAnterior, despues: r.datos.existenciaNueva });
      toast.success(`${TIPO_LABEL[tipo]} registrada · folio ${r.datos.movimiento.folio}`);
    });
  }

  function reiniciar() {
    setExito(null);
    setSku(null);
    setCantidad("1");
    setObservacion("");
  }

  if (exito && producto) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="size-14 text-emerald-600" />
          <h2 className="mt-3 text-xl font-semibold">Movimiento registrado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Folio <span className="font-mono">{exito.movimiento.folio}</span> · {exito.movimiento.responsable}
          </p>
          <div className="mt-5 w-full rounded-xl bg-muted/60 p-4">
            <div className="text-sm font-medium">{producto.nombre}</div>
            <div className="mt-2 flex items-center justify-center gap-3 text-2xl font-semibold tabular-nums">
              <span className="text-muted-foreground">{formatoCantidad(exito.antes)}</span>
              <ArrowRight className="size-5 text-muted-foreground" />
              <span>{formatoCantidad(exito.despues)}</span>
              <span className="text-base font-normal text-muted-foreground">{producto.um}</span>
            </div>
            <div className="mt-2 flex justify-center">
              <EstadoBadge estado={producto.estado} />
            </div>
          </div>
          <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
            <Button className="h-12 text-base" onClick={reiniciar}>
              Registrar otro
            </Button>
            <Button asChild variant="outline" className="h-12 text-base">
              <Link href={`/catalogo/${producto.sku}`}>Ver producto</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Producto</Label>
          <span className="text-xs text-muted-foreground">SKU ↔ nombre</span>
        </div>
        {producto ? (
          <div className="flex items-start gap-3 rounded-xl border border-primary/40 bg-secondary/50 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-mono font-medium text-foreground">SKU {producto.sku}</span>· {producto.almacen}
              </div>
              <div className="mt-0.5 font-medium leading-snug">{producto.nombre}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
                <span className="tabular-nums">
                  Stock: <strong>{formatoCantidad(producto.existencia)}</strong> {producto.um}
                </span>
                <EstadoBadge estado={producto.estado} />
                {producto.especial && <EspecialBadge />}
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setSku(null)} aria-label="Cambiar producto">
              <X />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button type="button" className="h-14 w-full gap-2 text-base" onClick={() => setEscaneando(true)}>
              <ScanLine className="size-5" /> Escanear QR o código de barra
            </Button>
            <Command shouldFilter={false} className="rounded-xl! border">
              <CommandInput
                value={busqueda}
                onValueChange={setBusqueda}
                placeholder="Escribe el SKU o el nombre…"
                className="h-11 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && /^\d+$/.test(busqueda.trim())) {
                    const exacto = productos.find((p) => String(p.sku) === busqueda.trim());
                    if (exacto) {
                      e.preventDefault();
                      elegir(exacto);
                    }
                  }
                }}
              />
              <CommandList className="max-h-72">
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-1 py-2">
                    <Search className="size-5 text-muted-foreground" />
                    No existe en el catálogo. Revisa el SKU o el nombre.
                  </div>
                </CommandEmpty>
                <CommandGroup heading={busqueda ? `${resultados.length} coincidencias` : "Productos"}>
                  {resultados.map((p) => (
                    <CommandItem key={p.sku} value={String(p.sku)} onSelect={() => elegir(p)} className="gap-3 py-2">
                      <span className="w-9 shrink-0 font-mono text-xs text-muted-foreground">{p.sku}</span>
                      <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatoCantidad(p.existencia)} {p.um}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <Label>Tipo de movimiento</Label>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map(({ tipo: t, icon: Icono }) => {
            const permitido = tiposPermitidos.includes(t);
            return (
              <button
                key={t}
                type="button"
                disabled={!permitido}
                onClick={() => setTipo(t)}
                aria-pressed={tipo === t}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-sm font-medium transition-colors",
                  tipo === t ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                  !permitido && "cursor-not-allowed opacity-40",
                )}
              >
                <Icono className="size-5" />
                {TIPO_LABEL[t]}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {TIPOS.find((t) => t.tipo === tipo)?.ayuda}
          {tiposPermitidos.length === 1 && " Tu perfil solo registra salidas."}
        </p>
      </section>

      <section className="space-y-2">
        <Label htmlFor="cantidad">Cantidad</Label>
        {tipo === "ajuste" && (
          <div className="grid grid-cols-2 gap-2">
            {([1, -1] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSignoAjuste(s)}
                aria-pressed={signoAjuste === s}
                className={cn(
                  "h-10 rounded-lg border text-sm font-medium",
                  signoAjuste === s ? "border-primary bg-secondary text-secondary-foreground" : "bg-card",
                )}
              >
                {s === 1 ? "+ Agregar" : "− Descontar"}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-stretch gap-2">
          <Button type="button" variant="outline" className="h-14 w-14" onClick={() => ajustarCantidad(-1)} aria-label="Restar">
            <Minus />
          </Button>
          <div className="relative flex-1">
            <Input
              id="cantidad"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value.replace(/[^\d.,]/g, ""))}
              inputMode="decimal"
              className="h-14 pr-20 text-center text-2xl font-semibold tabular-nums"
              aria-describedby="um"
            />
            <span id="um" className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
              {producto?.um ?? "UM"}
            </span>
          </div>
          <Button type="button" variant="outline" className="h-14 w-14" onClick={() => ajustarCantidad(1)} aria-label="Sumar">
            <Plus />
          </Button>
        </div>
        {producto && cantidadValida && (
          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Stock resultante</span>
            <span className="flex items-center gap-2 font-medium tabular-nums">
              {formatoCantidad(producto.existencia)} <ArrowRight className="size-3.5" /> {formatoCantidad(despues)} {producto.um}
              <EstadoBadge estado={estadoDespues} />
            </span>
          </div>
        )}
        {producto && despues < 0 && (
          <p className="flex items-center gap-1.5 text-xs text-amber-700">
            <TriangleAlert className="size-3.5" /> El stock quedará negativo. Revisa la cantidad o avisa a la encargada.
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="responsable">Responsable</Label>
          <Input id="responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)} className="h-11" autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label>Fecha y hora</Label>
          <div className="flex h-11 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground">
            <Clock className="size-4" /> Automática al guardar
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="observacion">
          Observación <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="observacion"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          placeholder="Ej.: para aseo del auditorio"
          rows={2}
        />
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="sticky bottom-24 z-10 lg:static">
        <Button type="submit" className="h-14 w-full text-base shadow-lg lg:shadow-none" disabled={pendiente || !producto}>
          {pendiente && <Loader2 className="animate-spin" />}
          {producto ? `Guardar ${TIPO_LABEL[tipo].toLowerCase()}` : "Elige un producto para continuar"}
        </Button>
      </div>

      <Escaner abierto={escaneando} onAbiertoChange={setEscaneando} onCodigo={alEscanear} />
    </form>
  );
}
