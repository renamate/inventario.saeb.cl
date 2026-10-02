const TZ = "America/Santiago";

const fechaHora = new Intl.DateTimeFormat("es-CL", {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const soloFecha = new Intl.DateTimeFormat("es-CL", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });

export function formatoFechaHora(iso: string): string {
  return fechaHora.format(new Date(iso));
}

export function formatoFecha(iso: string | null): string {
  return iso ? soloFecha.format(new Date(iso)) : "—";
}

/** Convierte "yyyy-mm-dd" (fecha local de Chile) al inicio o fin de ese día en ISO. */
export function limiteDia(fecha: string | undefined, fin: boolean): string | undefined {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return undefined;
  const base = new Date(`${fecha}T${fin ? "23:59:59.999" : "00:00:00"}Z`);
  const offset = offsetMinutos(base);
  return new Date(base.getTime() - offset * 60_000).toISOString();
}

function offsetMinutos(fecha: Date): number {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" }).formatToParts(fecha);
  const nombre = partes.find((p) => p.type === "timeZoneName")?.value ?? "GMT-03:00";
  const m = nombre.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return -180;
  const signo = m[1] === "-" ? -1 : 1;
  return signo * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}
