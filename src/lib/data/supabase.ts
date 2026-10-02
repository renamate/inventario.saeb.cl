import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { calcularEstado } from "../stock";
import type {
  EstadoSolicitud,
  FiltrosMovimientos,
  Movimiento,
  NuevaSolicitud,
  NuevoMovimiento,
  ProductoStock,
  ProveedorProducto,
  Solicitud,
} from "../types";
import { ErrorDatos, type Repositorio } from "./repo";

let cliente: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!cliente) {
    cliente = createClient(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}

function verificar<T>(resultado: { data: T | null; error: { message: string } | null }): T {
  if (resultado.error) throw new ErrorDatos(`Supabase: ${resultado.error.message}`);
  return resultado.data as T;
}

type FilaStock = {
  sku: number;
  nombre: string;
  descripcion_proveedor: string | null;
  um: string;
  especial: boolean;
  stock_minimo: number | null;
  almacen: string;
  activo: boolean;
  stock_inicial: number;
  ingresos: number;
  salidas: number;
  ajustes: number;
  existencia: number;
};

type FilaProveedor = {
  sku: number;
  proveedor: string;
  url_portal: string | null;
  codigo_proveedor: string | null;
  observacion: string | null;
  preferido: boolean;
};

type FilaMovimiento = {
  id: string;
  folio: string;
  fecha: string;
  sku: number;
  producto: string;
  almacen: string;
  um: string;
  tipo: Movimiento["tipo"];
  cantidad: number;
  valor_unitario: number | null;
  observacion: string | null;
  responsable: string;
  solicitud_compra_id: string | null;
};

type FilaSolicitud = {
  id: string;
  sku: number | null;
  producto: string;
  almacen: string | null;
  cantidad: number;
  um: string | null;
  proveedor: string | null;
  codigo_proveedor: string | null;
  enlace: string | null;
  estado: EstadoSolicitud;
  origen: "manual" | "alerta";
  asignado_a: string | null;
  fecha_solicitud: string | null;
  fecha_compra: string | null;
  fecha_recepcion: string | null;
  observacion: string | null;
};

function aProducto(f: FilaStock, proveedores: ProveedorProducto[]): ProductoStock {
  const n = (v: unknown) => Number(v ?? 0);
  const existencia = n(f.existencia);
  const stockMinimo = f.stock_minimo === null ? null : n(f.stock_minimo);
  return {
    sku: f.sku,
    nombre: f.nombre,
    descripcionProveedor: f.descripcion_proveedor,
    um: f.um,
    especial: f.especial,
    stockMinimo,
    almacen: f.almacen,
    activo: f.activo,
    stockInicial: n(f.stock_inicial),
    ingresos: n(f.ingresos),
    salidas: n(f.salidas),
    ajustes: n(f.ajustes),
    existencia,
    estado: calcularEstado(existencia, stockMinimo, f.especial),
    proveedores,
  };
}

function aProveedor(f: FilaProveedor): ProveedorProducto {
  return {
    proveedor: f.proveedor,
    urlPortal: f.url_portal,
    codigoProveedor: f.codigo_proveedor,
    observacion: f.observacion,
    preferido: f.preferido,
  };
}

function aMovimiento(f: FilaMovimiento): Movimiento {
  return {
    id: f.id,
    folio: f.folio,
    fecha: f.fecha,
    sku: f.sku,
    producto: f.producto,
    almacen: f.almacen,
    um: f.um,
    tipo: f.tipo,
    cantidad: Number(f.cantidad),
    valorUnitario: f.valor_unitario === null ? null : Number(f.valor_unitario),
    observacion: f.observacion,
    responsable: f.responsable,
    solicitudId: f.solicitud_compra_id,
  };
}

function aSolicitud(f: FilaSolicitud): Solicitud {
  return {
    id: f.id,
    sku: f.sku,
    producto: f.producto,
    almacen: f.almacen,
    cantidad: Number(f.cantidad),
    um: f.um,
    proveedor: f.proveedor,
    codigoProveedor: f.codigo_proveedor,
    enlace: f.enlace,
    estado: f.estado,
    origen: f.origen,
    asignadoA: f.asignado_a,
    fechaSolicitud: f.fecha_solicitud,
    fechaCompra: f.fecha_compra,
    fechaRecepcion: f.fecha_recepcion,
    observacion: f.observacion,
  };
}

async function idPorNombre(tabla: "proveedores" | "unidades_medida", columna: string, valor: string | null | undefined) {
  if (!valor) return null;
  const fila = verificar(await db().from(tabla).select("id").eq(columna, valor).maybeSingle()) as { id: number } | null;
  return fila?.id ?? null;
}

export const repositorioSupabase: Repositorio = {
  modo: "supabase",

  async listarStock() {
    const [filas, provs] = await Promise.all([
      db().from("v_stock").select("*").order("nombre"),
      db().from("v_producto_proveedor").select("*"),
    ]);
    const porSku = new Map<number, ProveedorProducto[]>();
    for (const p of verificar(provs) as FilaProveedor[]) {
      porSku.set(p.sku, [...(porSku.get(p.sku) ?? []), aProveedor(p)]);
    }
    return (verificar(filas) as FilaStock[]).map((f) =>
      aProducto(f, (porSku.get(f.sku) ?? []).sort((a, b) => Number(b.preferido) - Number(a.preferido))),
    );
  },

  async obtenerProducto(sku) {
    const [fila, provs] = await Promise.all([
      db().from("v_stock").select("*").eq("sku", sku).maybeSingle(),
      db().from("v_producto_proveedor").select("*").eq("sku", sku),
    ]);
    const f = verificar(fila) as FilaStock | null;
    if (!f) return null;
    return aProducto(f, (verificar(provs) as FilaProveedor[]).map(aProveedor));
  },

  async listarMovimientos(filtros: FiltrosMovimientos = {}) {
    let q = db().from("v_movimientos").select("*").order("fecha", { ascending: false }).order("folio", { ascending: false }).limit(2000);
    if (filtros.sku) q = q.eq("sku", filtros.sku);
    if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
    if (filtros.almacen) q = q.eq("almacen", filtros.almacen);
    if (filtros.desde) q = q.gte("fecha", filtros.desde);
    if (filtros.hasta) q = q.lte("fecha", filtros.hasta);
    return (verificar(await q) as FilaMovimiento[]).map(aMovimiento);
  },

  async crearMovimiento(input: NuevoMovimiento, responsableId: string) {
    const insertado = verificar(
      await db()
        .from("movimientos")
        .insert({
          sku: input.sku,
          tipo: input.tipo,
          cantidad: input.cantidad,
          valor_unitario: input.valorUnitario ?? null,
          observacion: input.observacion ?? null,
          responsable_id: responsableId,
          responsable_nombre: input.responsable,
          solicitud_compra_id: input.solicitudId ?? null,
        })
        .select("id")
        .single(),
    ) as { id: string };
    const fila = verificar(await db().from("v_movimientos").select("*").eq("id", insertado.id).single()) as FilaMovimiento;
    return aMovimiento(fila);
  },

  async listarSolicitudes() {
    const filas = verificar(await db().from("v_solicitudes").select("*").order("fecha_solicitud", { ascending: true }));
    return (filas as FilaSolicitud[]).map(aSolicitud);
  },

  async crearSolicitud(input: NuevaSolicitud) {
    let proveedor = input.proveedor ?? null;
    let codigo = input.codigoProveedor ?? null;
    let umId: number | null = null;
    if (input.sku !== null) {
      const producto = verificar(await db().from("productos").select("um_id").eq("sku", input.sku).maybeSingle()) as
        | { um_id: number }
        | null;
      if (!producto) throw new ErrorDatos(`El SKU ${input.sku} no existe en el catálogo.`);
      umId = producto.um_id;
      if (!proveedor) {
        const pref = verificar(
          await db().from("v_producto_proveedor").select("*").eq("sku", input.sku).order("preferido", { ascending: false }).limit(1),
        ) as FilaProveedor[];
        proveedor = pref[0]?.proveedor ?? null;
        codigo = codigo ?? pref[0]?.codigo_proveedor ?? null;
      }
    }
    const estado = input.estado ?? "por_comprar";
    const ahora = new Date().toISOString();
    const insertada = verificar(
      await db()
        .from("solicitudes_compra")
        .insert({
          sku: input.sku,
          producto_texto: input.productoTexto ?? null,
          cantidad: input.cantidad,
          um_id: umId,
          proveedor_id: await idPorNombre("proveedores", "nombre", proveedor),
          codigo_proveedor: codigo,
          enlace: input.enlace ?? null,
          estado,
          origen: input.origen,
          asignado_a: input.asignadoA ?? null,
          fecha_compra: estado !== "por_comprar" ? ahora : null,
          fecha_recepcion: estado === "recibido" ? ahora : null,
          observacion: input.observacion ?? null,
        })
        .select("id")
        .single(),
    ) as { id: string };
    return aSolicitud(verificar(await db().from("v_solicitudes").select("*").eq("id", insertada.id).single()) as FilaSolicitud);
  },

  async cambiarEstadoSolicitud(id: string, estado: EstadoSolicitud, cambios = {}) {
    const actual = verificar(await db().from("solicitudes_compra").select("fecha_compra, fecha_recepcion").eq("id", id).maybeSingle()) as
      | { fecha_compra: string | null; fecha_recepcion: string | null }
      | null;
    if (!actual) throw new ErrorDatos("La solicitud no existe.");
    const ahora = new Date().toISOString();
    const update: Record<string, unknown> = {
      estado,
      fecha_compra: estado === "por_comprar" ? null : (actual.fecha_compra ?? ahora),
      fecha_recepcion: estado === "recibido" ? (actual.fecha_recepcion ?? ahora) : null,
    };
    if (cambios.cantidad !== undefined) update.cantidad = cambios.cantidad;
    if (cambios.asignadoA !== undefined) update.asignado_a = cambios.asignadoA;
    verificar(await db().from("solicitudes_compra").update(update).eq("id", id));
    return aSolicitud(verificar(await db().from("v_solicitudes").select("*").eq("id", id).single()) as FilaSolicitud);
  },

  async reiniciarDemo() {
    throw new ErrorDatos("En modo Supabase los datos se reinician ejecutando supabase/seed.sql.");
  },
};
