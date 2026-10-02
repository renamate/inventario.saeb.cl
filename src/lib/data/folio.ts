const formatoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Folio correlativo por día en hora de Chile: yyyymmdd-0001. */
export function folioDelDia(fecha: Date, foliosExistentes: string[]): string {
  const prefijo = formatoDia.format(fecha).replace(/-/g, "");
  const max = foliosExistentes
    .filter((f) => f.startsWith(prefijo + "-"))
    .reduce((acc, f) => Math.max(acc, Number(f.split("-")[1]) || 0), 0);
  return `${prefijo}-${String(max + 1).padStart(4, "0")}`;
}
