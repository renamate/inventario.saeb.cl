import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ESTADO_STOCK_LABEL, TIPO_LABEL, type EstadoStock, type TipoMovimiento } from "@/lib/types";

const ESTILO_ESTADO: Record<EstadoStock, string> = {
  ok: "border-transparent bg-emerald-100 text-emerald-800",
  critico: "border-transparent bg-amber-100 text-amber-900",
  negativo: "border-transparent bg-red-100 text-red-800",
};

export function EstadoBadge({ estado, className }: { estado: EstadoStock; className?: string }) {
  return <Badge className={cn(ESTILO_ESTADO[estado], className)}>{ESTADO_STOCK_LABEL[estado]}</Badge>;
}

const ESTILO_TIPO: Record<TipoMovimiento, string> = {
  ingreso: "border-transparent bg-sky-100 text-sky-800",
  salida: "border-transparent bg-slate-100 text-slate-800",
  ajuste: "border-transparent bg-violet-100 text-violet-800",
};

export function TipoBadge({ tipo }: { tipo: TipoMovimiento }) {
  return <Badge className={ESTILO_TIPO[tipo]}>{TIPO_LABEL[tipo]}</Badge>;
}

export function EspecialBadge() {
  return (
    <Badge variant="outline" className="text-muted-foreground" title="Puede llegar a 0 sin generar alerta">
      Especial
    </Badge>
  );
}
