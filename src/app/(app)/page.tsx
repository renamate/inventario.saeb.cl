import Link from "next/link";
import { AlertTriangle, ArrowRight, MinusCircle, Package, ShoppingCart } from "lucide-react";

import { Encabezado } from "@/components/encabezado";
import { EstadoBadge, TipoBadge } from "@/components/estado-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { repo } from "@/lib/data";
import { alertasSinSolicitud, formatoCantidad, formatoDelta, indicadores, resumenPorAlmacen } from "@/lib/stock";
import { formatoFechaHora } from "@/lib/fechas";
import seed from "../../../data/seed.json";

import { GraficoAlmacenes } from "./grafico-almacenes";

export default async function DashboardPage() {
  const r = repo();
  const [productos, solicitudes, movimientos] = await Promise.all([r.listarStock(), r.listarSolicitudes(), r.listarMovimientos()]);
  const kpi = indicadores(productos, solicitudes);
  const porAlmacen = resumenPorAlmacen(productos);
  const atencion = productos
    .filter((p) => p.estado !== "ok")
    .sort((a, b) => (a.estado === b.estado ? a.existencia - b.existencia : a.estado === "negativo" ? -1 : 1));
  const alertas = alertasSinSolicitud(productos, solicitudes).length;
  const excel = seed.excelIndicadores;

  const tarjetas = [
    { titulo: "Productos activos", valor: kpi.productosActivos, excel: excel.productosActivos, icon: Package, tono: "text-primary bg-secondary", href: "/catalogo" },
    { titulo: "Stock crítico", valor: kpi.stockCritico, excel: excel.stockCritico, icon: AlertTriangle, tono: "text-amber-700 bg-amber-100", href: "/catalogo?estado=critico" },
    { titulo: "Stock negativo", valor: kpi.stockNegativo, excel: excel.stockNegativo, icon: MinusCircle, tono: "text-red-700 bg-red-100", href: "/catalogo?estado=negativo" },
    { titulo: "Por comprar", valor: kpi.porComprar, excel: excel.porComprar, icon: ShoppingCart, tono: "text-sky-700 bg-sky-100", href: "/compras" },
  ];

  return (
    <>
      <Encabezado
        titulo="Resumen de inventario"
        descripcion="Stock calculado en tiempo real: stock inicial 2027 + ingresos − salidas + ajustes."
      >
        <Button asChild className="h-10">
          <Link href="/registrar">Registrar movimiento</Link>
        </Button>
      </Encabezado>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {tarjetas.map((t) => (
          <Link key={t.titulo} href={t.href} className="group">
            <Card className="h-full gap-3 transition-shadow group-hover:shadow-md">
              <CardHeader className="gap-0">
                <CardDescription className="text-xs font-medium sm:text-sm">{t.titulo}</CardDescription>
                <CardAction>
                  <span className={`flex size-8 items-center justify-center rounded-lg ${t.tono}`}>
                    <t.icon className="size-4" />
                  </span>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tabular-nums sm:text-4xl">{t.valor}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Excel al importar: <span className="tabular-nums">{t.excel}</span>
                  {t.valor === t.excel ? " · cuadra" : ""}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Regla de stock crítico (igual al Excel): producto no marcado como especial con existencia entre 0 y el mínimo, ambos
        incluidos. Los productos especiales pueden llegar a 0 sin alerta.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Estado por almacén</CardTitle>
            <CardDescription>Los 6 almacenes son divisiones lógicas de la bodega y ordenan el presupuesto anual.</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoAlmacenes datos={porAlmacen} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">Almacén</th>
                    <th className="py-2 text-right font-medium">Productos</th>
                    <th className="py-2 text-right font-medium">OK</th>
                    <th className="py-2 text-right font-medium">Crítico</th>
                    <th className="py-2 text-right font-medium">Negativo</th>
                  </tr>
                </thead>
                <tbody>
                  {porAlmacen.map((a) => (
                    <tr key={a.almacen} className="border-t">
                      <td className="py-2">
                        <Link href={`/catalogo?almacen=${encodeURIComponent(a.almacen)}`} className="hover:underline">
                          {a.almacen}
                        </Link>
                      </td>
                      <td className="py-2 text-right tabular-nums">{a.productos}</td>
                      <td className="py-2 text-right tabular-nums">{a.ok}</td>
                      <td className="py-2 text-right tabular-nums">{a.critico || "—"}</td>
                      <td className="py-2 text-right tabular-nums">{a.negativo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Requieren atención</CardTitle>
            <CardDescription>
              {atencion.length} productos críticos o negativos
              {alertas > 0 && ` · ${alertas} sin solicitud de compra`}
            </CardDescription>
            <CardAction>
              <Button asChild variant="outline" size="sm">
                <Link href="/compras">
                  Compras <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {atencion.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Todo el stock está sobre el mínimo.</p>
            ) : (
              <ul className="-mx-2 max-h-[26rem] divide-y overflow-y-auto">
                {atencion.map((p) => (
                  <li key={p.sku}>
                    <Link href={`/catalogo/${p.sku}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60">
                      <span className="w-9 shrink-0 font-mono text-xs text-muted-foreground">{p.sku}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{p.nombre}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatoCantidad(p.existencia)} {p.um} · mín. {p.stockMinimo ?? "sin definir"}
                        </span>
                      </span>
                      <EstadoBadge estado={p.estado} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Últimos movimientos</CardTitle>
          <CardAction>
            <Button asChild variant="outline" size="sm">
              <Link href="/historial">
                Ver historial <ArrowRight />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {movimientos.slice(0, 6).map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <TipoBadge tipo={m.tipo} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{m.producto}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatoFechaHora(m.fecha)} · {m.responsable}
                  </span>
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {formatoDelta(m)} {m.um}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
