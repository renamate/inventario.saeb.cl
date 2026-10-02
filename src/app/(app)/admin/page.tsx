import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Database, FileSpreadsheet } from "lucide-react";

import { Encabezado } from "@/components/encabezado";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { repo } from "@/lib/data";
import { permisos } from "@/lib/permisos";
import { requerirUsuario } from "@/lib/sesion";
import type { SeedData } from "@/lib/seed-types";
import seedJson from "../../../../data/seed.json";

import { BotonReiniciar } from "./boton-reiniciar";

export const metadata: Metadata = { title: "Administración" };

const seed = seedJson as SeedData;

function calidadDatos() {
  const umVariantes = [...new Set(seed.productos.map((p) => p.umOriginal).filter((u) => u && u.toLowerCase().startsWith("paq")))];
  const stockNegativo = seed.stockInicial.filter((s) => s.cantidad < 0).map((s) => s.sku);
  const sinMinimo = seed.productos.filter((p) => p.stockMinimo === null).map((p) => p.sku);
  const especialConMinimo = seed.productos.filter((p) => p.especial && (p.stockMinimo ?? 0) > 0).map((p) => p.sku);
  const conProveedor = new Set(seed.productoProveedor.map((pp) => pp.sku));
  const sinProveedor = seed.productos.filter((p) => !conProveedor.has(p.sku)).length;
  const dobleProveedor = [...new Set(seed.productoProveedor.filter((pp) => !pp.preferido).map((pp) => pp.sku))];
  const movSinFecha = seed.movimientos.filter((m) => m.observacion?.includes("sin fecha")).length;

  return [
    { titulo: "Movimientos sin fecha", detalle: `${movSinFecha} de ${seed.movimientos.length}. Se importaron con fecha 18-sep-2026 (última modificación del Excel).` },
    { titulo: "Stock inicial negativo", detalle: `SKU ${stockNegativo.join(", ")}. Forman el indicador "stock negativo".` },
    { titulo: "UM inconsistente", detalle: `Variantes de paquete en el Excel: ${umVariantes.map((u) => `"${u}"`).join(", ")}. Se normalizaron a ${[...new Set(seed.productos.map((p) => p.um))].length} unidades.` },
    { titulo: "Sin cantidad mínima", detalle: `SKU ${sinMinimo.join(", ")}. Se trata como mínimo 0 (igual que el Excel).` },
    { titulo: "Especiales con mínimo mayor que 0", detalle: `${especialConMinimo.length} productos (ej.: SKU ${especialConMinimo.slice(0, 5).join(", ")}). Prevalece ESPECIAL: no generan alerta.` },
    { titulo: "Sin proveedor", detalle: `${sinProveedor} de ${seed.productos.length} productos.` },
    { titulo: "Dos proveedores o códigos", detalle: `SKU ${dobleProveedor.join(", ")}: se separaron en proveedor preferido y alternativo.` },
  ];
}

export default async function AdminPage() {
  const usuario = await requerirUsuario();
  if (!permisos.administrar(usuario.rol)) redirect("/");
  const modo = repo().modo;

  return (
    <>
      <Encabezado titulo="Administración" descripcion="Origen de los datos, calidad del Excel importado y herramientas de la demo." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-4" /> Origen de datos
            </CardTitle>
            <CardDescription>
              {modo === "neon"
                ? "Conectado a Neon (Postgres). Los datos persisten entre sesiones y dispositivos."
                : "Modo demo local: los datos del Excel se cargan desde data/seed.json y los cambios viven en el servidor mientras está encendido."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Badge variant={modo === "neon" ? "default" : "outline"}>{modo === "neon" ? "Neon" : "Demo local"}</Badge>
            <dl className="grid grid-cols-2 gap-2">
              <dt className="text-muted-foreground">Archivo fuente</dt>
              <dd className="truncate">{seed.fuente}</dd>
              <dt className="text-muted-foreground">Productos</dt>
              <dd>{seed.productos.length}</dd>
              <dt className="text-muted-foreground">Almacenes</dt>
              <dd>{seed.almacenes.length}</dd>
              <dt className="text-muted-foreground">Movimientos importados</dt>
              <dd>{seed.movimientos.length}</dd>
              <dt className="text-muted-foreground">Solicitudes importadas</dt>
              <dd>{seed.solicitudes.length}</dd>
            </dl>
            {modo === "local" && <BotonReiniciar />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-4" /> Calidad de datos del Excel
            </CardTitle>
            <CardDescription>Temas a resolver con la encargada antes del MVP.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {calidadDatos().map((c) => (
                <li key={c.titulo}>
                  <div className="font-medium">{c.titulo}</div>
                  <div className="text-muted-foreground">{c.detalle}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
