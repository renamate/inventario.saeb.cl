import type { EstadoStock, Movimiento, ProductoStock, Solicitud } from "./types";

/**
 * Misma regla que el DASHBOARD del Excel y que la vista v_stock:
 * negativo si existencia < 0; crítico si no es ESPECIAL y existencia <= mínimo
 * (mínimo vacío cuenta como 0); si no, ok.
 */
export function calcularEstado(existencia: number, stockMinimo: number | null, especial: boolean): EstadoStock {
  if (existencia < 0) return "negativo";
  if (!especial && existencia <= (stockMinimo ?? 0)) return "critico";
  return "ok";
}

export function indicadores(productos: ProductoStock[], solicitudes: Solicitud[]) {
  const activos = productos.filter((p) => p.activo);
  return {
    productosActivos: activos.length,
    stockCritico: activos.filter((p) => p.estado === "critico").length,
    stockNegativo: activos.filter((p) => p.estado === "negativo").length,
    porComprar: solicitudes.filter((s) => s.estado === "por_comprar").length,
  };
}

export function resumenPorAlmacen(productos: ProductoStock[]) {
  const mapa = new Map<string, { almacen: string; productos: number; ok: number; critico: number; negativo: number }>();
  for (const p of productos) {
    const fila = mapa.get(p.almacen) ?? { almacen: p.almacen, productos: 0, ok: 0, critico: 0, negativo: 0 };
    fila.productos += 1;
    fila[p.estado] += 1;
    mapa.set(p.almacen, fila);
  }
  return [...mapa.values()].sort((a, b) => b.productos - a.productos);
}

/** Productos críticos o negativos (no especiales) sin una solicitud abierta: se muestran como tarjetas sugeridas. */
export function alertasSinSolicitud(productos: ProductoStock[], solicitudes: Solicitud[]) {
  const abiertas = new Set(
    solicitudes.filter((s) => s.estado !== "recibido" && s.sku !== null).map((s) => s.sku as number),
  );
  return productos.filter((p) => p.activo && p.estado !== "ok" && !p.especial && !abiertas.has(p.sku));
}

/** Cantidad sugerida para reponer: lo que falta para llegar al doble del mínimo (al menos 1). */
export function cantidadSugerida(p: ProductoStock): number {
  const minimo = p.stockMinimo ?? 0;
  return Math.max(1, Math.ceil(minimo * 2 - p.existencia));
}

export function formatoCantidad(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n);
}

/** Efecto del movimiento sobre la existencia: las salidas restan y los ajustes llevan su propio signo. */
export function deltaMovimiento(m: Pick<Movimiento, "tipo" | "cantidad">): number {
  return m.tipo === "salida" ? -m.cantidad : m.cantidad;
}

export function formatoDelta(m: Pick<Movimiento, "tipo" | "cantidad">): string {
  const d = deltaMovimiento(m);
  return `${d > 0 ? "+" : "−"}${formatoCantidad(Math.abs(d))}`;
}
