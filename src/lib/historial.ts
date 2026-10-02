import "server-only";

import { repo } from "./data";
import { limiteDia } from "./fechas";
import { normalizar } from "./texto";
import type { TipoMovimiento } from "./types";

export type ParamsHistorial = { desde?: string; hasta?: string; q?: string; almacen?: string; tipo?: string };

const TIPOS: TipoMovimiento[] = ["ingreso", "salida", "ajuste"];

export function leerParams(sp: Record<string, string | string[] | undefined>): ParamsHistorial {
  const t = (k: string) => (typeof sp[k] === "string" && sp[k] !== "" ? (sp[k] as string) : undefined);
  return { desde: t("desde"), hasta: t("hasta"), q: t("q"), almacen: t("almacen"), tipo: t("tipo") };
}

export async function buscarMovimientos(p: ParamsHistorial) {
  const q = p.q?.trim();
  const sku = q && /^\d+$/.test(q) ? Number(q) : undefined;
  const movimientos = await repo().listarMovimientos({
    desde: limiteDia(p.desde, false),
    hasta: limiteDia(p.hasta, true),
    sku,
    almacen: p.almacen,
    tipo: TIPOS.includes(p.tipo as TipoMovimiento) ? (p.tipo as TipoMovimiento) : undefined,
  });
  if (!q || sku !== undefined) return movimientos;
  const t = normalizar(q);
  return movimientos.filter((m) => normalizar(m.producto).includes(t) || normalizar(m.responsable).includes(t));
}
