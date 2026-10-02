import type { Metadata } from "next";
import { cookies } from "next/headers";

import { repo } from "@/lib/data";
import { TIPOS_PERMITIDOS } from "@/lib/permisos";
import { requerirUsuario } from "@/lib/sesion";
import { COOKIE_RESPONSABLE } from "@/lib/sesion-token";
import type { TipoMovimiento } from "@/lib/types";

import { FormularioMovimiento, type ProductoOpcion } from "./formulario-movimiento";

export const metadata: Metadata = { title: "Registrar movimiento" };

export default async function RegistrarPage({ searchParams }: PageProps<"/registrar">) {
  const usuario = await requerirUsuario();
  const params = await searchParams;
  const productos = await repo().listarStock();

  const opciones: ProductoOpcion[] = productos
    .filter((p) => p.activo)
    .map((p) => ({
      sku: p.sku,
      nombre: p.nombre,
      um: p.um,
      almacen: p.almacen,
      existencia: p.existencia,
      stockMinimo: p.stockMinimo,
      especial: p.especial,
      estado: p.estado,
      codigos: p.proveedores.map((pp) => pp.codigoProveedor).filter((c): c is string => Boolean(c)),
    }));

  const skuInicial = Number(params.sku);
  const tipoInicial = typeof params.tipo === "string" ? (params.tipo as TipoMovimiento) : undefined;
  const permitidos = TIPOS_PERMITIDOS[usuario.rol];
  const recordado = (await cookies()).get(COOKIE_RESPONSABLE)?.value;
  const responsableInicial = usuario.rol === "voluntario" && recordado ? decodeURIComponent(recordado) : undefined;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Registrar movimiento</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Escanea la etiqueta o busca por SKU o nombre. Solo se aceptan productos del catálogo.
      </p>
      <FormularioMovimiento
        key={`${params.sku ?? ""}-${params.tipo ?? ""}-${params.escanear ?? ""}`}
        productos={opciones}
        usuario={usuario}
        tiposPermitidos={permitidos}
        skuInicial={Number.isInteger(skuInicial) ? skuInicial : undefined}
        tipoInicial={tipoInicial && permitidos.includes(tipoInicial) ? tipoInicial : "salida"}
        escanearAlInicio={params.escanear === "1"}
        responsableInicial={responsableInicial}
      />
    </div>
  );
}
