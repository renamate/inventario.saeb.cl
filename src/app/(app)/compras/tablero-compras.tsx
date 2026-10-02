"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight, BellRing, CalendarDays, ExternalLink, GripVertical, Loader2, Plus, User } from "lucide-react";
import { toast } from "sonner";

import { crearSolicitud, moverSolicitud } from "@/app/acciones";
import { EstadoBadge } from "@/components/estado-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatoFecha } from "@/lib/fechas";
import { formatoCantidad } from "@/lib/stock";
import { ESTADO_SOLICITUD_LABEL, type EstadoSolicitud, type EstadoStock, type Solicitud } from "@/lib/types";
import { cn } from "@/lib/utils";

import { NuevaSolicitudDialog, type ProductoCatalogo } from "./nueva-solicitud";

export type TarjetaAlerta = {
  sku: number;
  producto: string;
  almacen: string;
  um: string;
  existencia: number;
  stockMinimo: number | null;
  estado: EstadoStock;
  cantidadSugerida: number;
  proveedor: string | null;
  codigoProveedor: string | null;
  urlPortal: string | null;
};

const COLUMNAS: { estado: EstadoSolicitud; descripcion: string; color: string }[] = [
  { estado: "por_comprar", descripcion: "Alertas y solicitudes pendientes", color: "bg-amber-500" },
  { estado: "comprado", descripcion: "Pedido hecho, esperando llegada", color: "bg-sky-500" },
  { estado: "recibido", descripcion: "Llegó a bodega", color: "bg-emerald-500" },
];

const SIGUIENTE: Record<EstadoSolicitud, EstadoSolicitud | null> = {
  por_comprar: "comprado",
  comprado: "recibido",
  recibido: null,
};

type Props = {
  solicitudes: Solicitud[];
  alertas: TarjetaAlerta[];
  catalogo: ProductoCatalogo[];
  puedeGestionar: boolean;
  usuarioNombre: string;
};

type Recepcion = { solicitud: Solicitud; cantidad: string; registrarIngreso: boolean };

export function TableroCompras({ solicitudes: iniciales, alertas: alertasIniciales, catalogo, puedeGestionar, usuarioNombre }: Props) {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState(iniciales);
  const [alertas, setAlertas] = useState(alertasIniciales);
  const [pendiente, iniciar] = useTransition();
  const [recepcion, setRecepcion] = useState<Recepcion | null>(null);
  const [nueva, setNueva] = useState(false);
  const [columnaMovil, setColumnaMovil] = useState<EstadoSolicitud>("por_comprar");

  const [propsPrevias, setPropsPrevias] = useState({ iniciales, alertasIniciales });
  if (propsPrevias.iniciales !== iniciales || propsPrevias.alertasIniciales !== alertasIniciales) {
    setPropsPrevias({ iniciales, alertasIniciales });
    setSolicitudes(iniciales);
    setAlertas(alertasIniciales);
  }

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const porEstado = useMemo(() => {
    const m: Record<EstadoSolicitud, Solicitud[]> = { por_comprar: [], comprado: [], recibido: [] };
    for (const s of solicitudes) m[s.estado].push(s);
    m.recibido.sort((a, b) => (b.fechaRecepcion ?? "").localeCompare(a.fechaRecepcion ?? ""));
    return m;
  }, [solicitudes]);

  function convertirAlerta(alerta: TarjetaAlerta, estado: EstadoSolicitud) {
    if (estado === "recibido") {
      toast.info("Primero pasa la tarjeta a Comprado.");
      return;
    }
    iniciar(async () => {
      const r = await crearSolicitud({
        sku: alerta.sku,
        cantidad: alerta.cantidadSugerida,
        origen: "alerta",
        estado,
        asignadoA: usuarioNombre,
      });
      if (!r.ok) return void toast.error(r.error);
      setAlertas((a) => a.filter((x) => x.sku !== alerta.sku));
      setSolicitudes((s) => [...s, r.datos]);
      toast.success(`Solicitud creada: ${alerta.producto} → ${ESTADO_SOLICITUD_LABEL[estado]}`);
      router.refresh();
    });
  }

  function mover(solicitud: Solicitud, estado: EstadoSolicitud) {
    if (solicitud.estado === estado) return;
    if (estado === "recibido") {
      setRecepcion({ solicitud, cantidad: String(solicitud.cantidad), registrarIngreso: solicitud.sku !== null });
      return;
    }
    ejecutarMovimiento({ id: solicitud.id, estado });
  }

  function ejecutarMovimiento(entrada: Parameters<typeof moverSolicitud>[0]) {
    const previo = solicitudes;
    setSolicitudes((s) => s.map((x) => (x.id === entrada.id ? { ...x, estado: entrada.estado } : x)));
    iniciar(async () => {
      const r = await moverSolicitud(entrada);
      if (!r.ok) {
        setSolicitudes(previo);
        toast.error(r.error);
        return;
      }
      setSolicitudes((s) => s.map((x) => (x.id === entrada.id ? r.datos.solicitud : x)));
      toast.success(
        r.datos.ingreso
          ? `Recibido e ingresado a bodega (folio ${r.datos.ingreso.folio}).`
          : `Movida a ${ESTADO_SOLICITUD_LABEL[entrada.estado]}.`,
      );
      router.refresh();
    });
  }

  function alSoltar(e: DragEndEvent) {
    const destino = e.over?.id as EstadoSolicitud | undefined;
    if (!destino) return;
    const id = String(e.active.id);
    if (id.startsWith("alerta-")) {
      const alerta = alertas.find((a) => `alerta-${a.sku}` === id);
      if (alerta && destino !== "por_comprar") convertirAlerta(alerta, destino);
      return;
    }
    const s = solicitudes.find((x) => x.id === id);
    if (s) mover(s, destino);
  }

  const total = (estado: EstadoSolicitud) => porEstado[estado].length + (estado === "por_comprar" ? alertas.length : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline" className="gap-1.5 py-1">
            <BellRing className="size-3.5 text-amber-600" /> {alertas.length} alertas de stock sin solicitud
          </Badge>
          <Badge variant="outline" className="py-1">
            {porEstado.por_comprar.length} solicitudes por comprar
          </Badge>
        </div>
        {puedeGestionar ? (
          <Button onClick={() => setNueva(true)} className="h-10">
            <Plus /> Nueva solicitud
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Tu perfil puede ver el tablero; la encargada mueve las tarjetas.</p>
        )}
      </div>

      <Tabs value={columnaMovil} onValueChange={(v) => setColumnaMovil(v as EstadoSolicitud)} className="md:hidden">
        <TabsList className="grid w-full grid-cols-3">
          {COLUMNAS.map((c) => (
            <TabsTrigger key={c.estado} value={c.estado} className="text-xs">
              {ESTADO_SOLICITUD_LABEL[c.estado]} ({total(c.estado)})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DndContext sensors={sensores} onDragEnd={alSoltar}>
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNAS.map((col) => (
            <Columna
              key={col.estado}
              estado={col.estado}
              descripcion={col.descripcion}
              color={col.color}
              total={total(col.estado)}
              oculta={columnaMovil !== col.estado}
            >
              {col.estado === "por_comprar" &&
                alertas.map((a) => (
                  <Arrastrable key={`alerta-${a.sku}`} id={`alerta-${a.sku}`} habilitado={puedeGestionar}>
                    <CardAlerta alerta={a} puedeGestionar={puedeGestionar} pendiente={pendiente} onAvanzar={() => convertirAlerta(a, "comprado")} onSolicitar={() => convertirAlerta(a, "por_comprar")} />
                  </Arrastrable>
                ))}
              {porEstado[col.estado].map((s) => (
                <Arrastrable key={s.id} id={s.id} habilitado={puedeGestionar && s.estado !== "recibido"}>
                  <CardSolicitud solicitud={s} puedeGestionar={puedeGestionar} pendiente={pendiente} onMover={(e) => mover(s, e)} />
                </Arrastrable>
              ))}
              {total(col.estado) === 0 && (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {col.estado === "por_comprar" ? "Nada pendiente. El stock está sobre el mínimo." : "Sin tarjetas por ahora."}
                </p>
              )}
            </Columna>
          ))}
        </div>
      </DndContext>

      <Dialog open={recepcion !== null} onOpenChange={(o) => !o && setRecepcion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar recepción</DialogTitle>
            <DialogDescription>{recepcion?.solicitud.producto}</DialogDescription>
          </DialogHeader>
          {recepcion && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cant-recibida">Cantidad recibida ({recepcion.solicitud.um ?? "UM"})</Label>
                <Input
                  id="cant-recibida"
                  inputMode="decimal"
                  className="h-11"
                  value={recepcion.cantidad}
                  onChange={(e) => setRecepcion({ ...recepcion, cantidad: e.target.value.replace(/[^\d.,]/g, "") })}
                />
              </div>
              {recepcion.solicitud.sku !== null ? (
                <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                  <Checkbox
                    checked={recepcion.registrarIngreso}
                    onCheckedChange={(v) => setRecepcion({ ...recepcion, registrarIngreso: v === true })}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">Registrar el ingreso en bodega</span>
                    <span className="block text-muted-foreground">Suma la cantidad al stock del SKU {recepcion.solicitud.sku}.</span>
                  </span>
                </label>
              ) : (
                <p className="text-sm text-muted-foreground">Producto fuera del catálogo: no se registra ingreso automático.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecepcion(null)}>
              Cancelar
            </Button>
            <Button
              disabled={pendiente}
              onClick={() => {
                if (!recepcion) return;
                const cantidad = Number(recepcion.cantidad.replace(",", "."));
                if (!(cantidad > 0)) return void toast.error("Ingresa una cantidad mayor que 0.");
                ejecutarMovimiento({
                  id: recepcion.solicitud.id,
                  estado: "recibido",
                  cantidadRecibida: cantidad,
                  registrarIngreso: recepcion.registrarIngreso,
                });
                setRecepcion(null);
              }}
            >
              {pendiente && <Loader2 className="animate-spin" />} Marcar recibido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NuevaSolicitudDialog
        abierto={nueva}
        onAbiertoChange={setNueva}
        catalogo={catalogo}
        usuarioNombre={usuarioNombre}
        onCreada={(s) => {
          setSolicitudes((x) => [...x, s]);
          setAlertas((a) => a.filter((x) => x.sku !== s.sku));
          router.refresh();
        }}
      />
    </div>
  );
}

function Columna({
  estado,
  descripcion,
  color,
  total,
  oculta,
  children,
}: {
  estado: EstadoSolicitud;
  descripcion: string;
  color: string;
  total: number;
  oculta: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-40 flex-col rounded-2xl border bg-muted/40 p-3 transition-colors",
        isOver && "border-primary bg-secondary/60",
        oculta && "hidden md:flex",
      )}
    >
      <header className="mb-3 flex items-center gap-2 px-1">
        <span className={cn("size-2.5 rounded-full", color)} />
        <h2 className="font-semibold">{ESTADO_SOLICITUD_LABEL[estado]}</h2>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums">{total}</span>
        <span className="ml-auto hidden text-xs text-muted-foreground lg:inline">{descripcion}</span>
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Arrastrable({ id, habilitado, children }: { id: string; habilitado: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled: !habilitado });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("relative touch-manipulation", isDragging && "z-50 opacity-90 shadow-xl")}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

function Proveedor({ nombre, codigo, enlace }: { nombre: string | null; codigo: string | null; enlace: string | null }) {
  if (!nombre && !codigo && !enlace) return <span className="text-muted-foreground">Proveedor por definir</span>;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {nombre && <span className="font-medium">{nombre}</span>}
      {codigo && <span className="font-mono text-xs text-muted-foreground">cód. {codigo}</span>}
      {enlace && (
        <a
          href={enlace}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
        >
          Enlace <ExternalLink className="size-3" />
        </a>
      )}
    </span>
  );
}

function CardAlerta({
  alerta,
  puedeGestionar,
  pendiente,
  onAvanzar,
  onSolicitar,
}: {
  alerta: TarjetaAlerta;
  puedeGestionar: boolean;
  pendiente: boolean;
  onAvanzar: () => void;
  onSolicitar: () => void;
}) {
  return (
    <article className="rounded-xl border border-amber-300 bg-card p-3 shadow-xs">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge className="border-transparent bg-amber-100 text-amber-900">
              <BellRing /> Alerta automática
            </Badge>
            <span className="font-mono">SKU {alerta.sku}</span>
          </div>
          <Link
            href={`/catalogo/${alerta.sku}`}
            className="mt-1 block text-sm leading-snug font-medium hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {alerta.producto}
          </Link>
        </div>
        {puedeGestionar && <GripVertical className="mt-1 size-4 shrink-0 text-muted-foreground" />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <EstadoBadge estado={alerta.estado} />
        <span className="tabular-nums text-muted-foreground">
          Stock {formatoCantidad(alerta.existencia)} {alerta.um} · mín. {alerta.stockMinimo ?? "—"}
        </span>
      </div>
      <div className="mt-2 text-sm">
        <Proveedor nombre={alerta.proveedor} codigo={alerta.codigoProveedor} enlace={alerta.urlPortal} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Sugerido: {alerta.cantidadSugerida} {alerta.um} · {alerta.almacen}
      </div>
      {puedeGestionar && (
        <div className="mt-3 grid grid-cols-2 gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" disabled={pendiente} onClick={onSolicitar}>
            Crear solicitud
          </Button>
          <Button size="sm" disabled={pendiente} onClick={onAvanzar}>
            Comprado <ArrowRight />
          </Button>
        </div>
      )}
    </article>
  );
}

function CardSolicitud({
  solicitud: s,
  puedeGestionar,
  pendiente,
  onMover,
}: {
  solicitud: Solicitud;
  puedeGestionar: boolean;
  pendiente: boolean;
  onMover: (estado: EstadoSolicitud) => void;
}) {
  const siguiente = SIGUIENTE[s.estado];
  return (
    <article className={cn("rounded-xl border bg-card p-3 shadow-xs", s.estado === "recibido" && "opacity-80")}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="outline">{s.origen === "alerta" ? "Desde alerta" : "Solicitud"}</Badge>
            {s.sku !== null ? <span className="font-mono">SKU {s.sku}</span> : <span>Producto nuevo</span>}
          </div>
          {s.sku !== null ? (
            <Link
              href={`/catalogo/${s.sku}`}
              className="mt-1 block text-sm leading-snug font-medium hover:underline"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {s.producto}
            </Link>
          ) : (
            <div className="mt-1 text-sm leading-snug font-medium">{s.producto}</div>
          )}
        </div>
        {puedeGestionar && s.estado !== "recibido" && <GripVertical className="mt-1 size-4 shrink-0 text-muted-foreground" />}
      </div>
      <div className="mt-2 text-sm">
        <span className="font-semibold tabular-nums">
          {formatoCantidad(s.cantidad)} {s.um ?? ""}
        </span>
        <span className="mx-1.5 text-muted-foreground">·</span>
        <Proveedor nombre={s.proveedor} codigo={s.codigoProveedor} enlace={s.enlace} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3" /> Solicitado {formatoFecha(s.fechaSolicitud)}
        </span>
        {s.fechaRecepcion && <span>Recibido {formatoFecha(s.fechaRecepcion)}</span>}
        {s.asignadoA && (
          <span className="inline-flex items-center gap-1">
            <User className="size-3" /> {s.asignadoA}
          </span>
        )}
      </div>
      {s.observacion && <p className="mt-1 text-xs text-muted-foreground">{s.observacion}</p>}
      {puedeGestionar && siguiente && (
        <div className="mt-3 flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
          {s.estado === "comprado" && (
            <Button size="sm" variant="ghost" disabled={pendiente} onClick={() => onMover("por_comprar")}>
              Volver
            </Button>
          )}
          <Button size="sm" className="ml-auto" disabled={pendiente} onClick={() => onMover(siguiente)}>
            {ESTADO_SOLICITUD_LABEL[siguiente]} <ArrowRight />
          </Button>
        </div>
      )}
    </article>
  );
}
