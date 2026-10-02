import { buscarMovimientos, leerParams } from "@/lib/historial";
import { permisos } from "@/lib/permisos";
import { usuarioActual } from "@/lib/sesion";
import { TIPO_LABEL } from "@/lib/types";

function celda(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return new Response("No autenticado", { status: 401 });
  if (!permisos.exportar(usuario.rol)) return new Response("Tu perfil no puede exportar", { status: 403 });

  const params = leerParams(Object.fromEntries(new URL(request.url).searchParams));
  const movimientos = await buscarMovimientos(params);

  const encabezado = ["Folio", "Fecha", "SKU", "Producto", "Almacén", "Tipo", "Cantidad", "UM", "Valor unitario", "Responsable", "Observación"];
  const filas = movimientos.map((m) =>
    [
      m.folio,
      new Date(m.fecha).toLocaleString("sv-SE", { timeZone: "America/Santiago" }),
      m.sku,
      m.producto,
      m.almacen,
      TIPO_LABEL[m.tipo],
      String(m.cantidad).replace(".", ","),
      m.um,
      m.valorUnitario ?? "",
      m.responsable,
      m.observacion ?? "",
    ]
      .map(celda)
      .join(";"),
  );
  // BOM + punto y coma: Excel en español-Chile lo abre con tildes y columnas correctas.
  const csv = "\uFEFF" + [encabezado.join(";"), ...filas].join("\r\n");
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="movimientos-saeb-${hoy}.csv"`,
    },
  });
}
