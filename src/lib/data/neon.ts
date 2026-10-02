import "server-only";

import { Pool, type QueryResultRow } from "@neondatabase/serverless";

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

let pool: Pool | null = null;

function db(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new ErrorDatos("Falta DATABASE_URL para conectar a Neon.");
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

async function q<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  try {
    const { rows } = await db().query<T>(text, params);
    return rows;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ErrorDatos(`Neon: ${msg}`);
  }
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

function iso(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  return typeof v === "string" ? v : new Date(v).toISOString();
}

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
    fecha: iso(f.fecha)!,
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
    fechaSolicitud: iso(f.fecha_solicitud),
    fechaCompra: iso(f.fecha_compra),
    fechaRecepcion: iso(f.fecha_recepcion),
    observacion: f.observacion,
  };
}

async function idPorNombre(tabla: "proveedores" | "unidades_medida", columna: "nombre" | "codigo", valor: string | null | undefined) {
  if (!valor) return null;
  const filas = await q<{ id: number }>(`select id from ${tabla} where ${columna} = $1 limit 1`, [valor]);
  return filas[0]?.id ?? null;
}

export const repositorioNeon: Repositorio = {
  modo: "neon",

  async listarStock() {
    const [filas, provs] = await Promise.all([
      q<FilaStock>("select * from v_stock order by nombre"),
      q<FilaProveedor>("select * from v_producto_proveedor"),
    ]);
    const porSku = new Map<number, ProveedorProducto[]>();
    for (const p of provs) {
      porSku.set(p.sku, [...(porSku.get(p.sku) ?? []), aProveedor(p)]);
    }
    return filas.map((f) => aProducto(f, (porSku.get(f.sku) ?? []).sort((a, b) => Number(b.preferido) - Number(a.preferido))));
  },

  async obtenerProducto(sku) {
    const [filas, provs] = await Promise.all([
      q<FilaStock>("select * from v_stock where sku = $1 limit 1", [sku]),
      q<FilaProveedor>("select * from v_producto_proveedor where sku = $1", [sku]),
    ]);
    const f = filas[0];
    if (!f) return null;
    return aProducto(f, provs.map(aProveedor));
  },

  async listarMovimientos(filtros: FiltrosMovimientos = {}) {
    const where: string[] = [];
    const params: unknown[] = [];
    const add = (clause: string, value: unknown) => {
      params.push(value);
      where.push(clause.replace("?", `$${params.length}`));
    };
    if (filtros.sku) add("sku = ?", filtros.sku);
    if (filtros.tipo) add("tipo = ?", filtros.tipo);
    if (filtros.almacen) add("almacen = ?", filtros.almacen);
    if (filtros.desde) add("fecha >= ?", filtros.desde);
    if (filtros.hasta) add("fecha <= ?", filtros.hasta);
    const sql =
      "select * from v_movimientos" +
      (where.length ? ` where ${where.join(" and ")}` : "") +
      " order by fecha desc, folio desc limit 2000";
    return (await q<FilaMovimiento>(sql, params)).map(aMovimiento);
  },

  async crearMovimiento(input: NuevoMovimiento, responsableId: string) {
    const insertados = await q<{ id: string }>(
      `insert into movimientos (sku, tipo, cantidad, valor_unitario, observacion, responsable_id, responsable_nombre, solicitud_compra_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [
        input.sku,
        input.tipo,
        input.cantidad,
        input.valorUnitario ?? null,
        input.observacion ?? null,
        responsableId,
        input.responsable,
        input.solicitudId ?? null,
      ],
    );
    const filas = await q<FilaMovimiento>("select * from v_movimientos where id = $1 limit 1", [insertados[0].id]);
    return aMovimiento(filas[0]);
  },

  async listarSolicitudes() {
    return (await q<FilaSolicitud>("select * from v_solicitudes order by fecha_solicitud asc nulls last")).map(aSolicitud);
  },

  async crearSolicitud(input: NuevaSolicitud) {
    let proveedor = input.proveedor ?? null;
    let codigo = input.codigoProveedor ?? null;
    let umId: number | null = null;
    if (input.sku !== null) {
      const productos = await q<{ um_id: number }>("select um_id from productos where sku = $1 limit 1", [input.sku]);
      if (!productos[0]) throw new ErrorDatos(`El SKU ${input.sku} no existe en el catálogo.`);
      umId = productos[0].um_id;
      if (!proveedor) {
        const pref = await q<FilaProveedor>(
          "select * from v_producto_proveedor where sku = $1 order by preferido desc limit 1",
          [input.sku],
        );
        proveedor = pref[0]?.proveedor ?? null;
        codigo = codigo ?? pref[0]?.codigo_proveedor ?? null;
      }
    }
    const estado = input.estado ?? "por_comprar";
    const ahora = new Date().toISOString();
    const proveedorId = await idPorNombre("proveedores", "nombre", proveedor);
    const insertadas = await q<{ id: string }>(
      `insert into solicitudes_compra (
         sku, producto_texto, cantidad, um_id, proveedor_id, codigo_proveedor, enlace,
         estado, origen, asignado_a, fecha_compra, fecha_recepcion, observacion
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       returning id`,
      [
        input.sku,
        input.productoTexto ?? null,
        input.cantidad,
        umId,
        proveedorId,
        codigo,
        input.enlace ?? null,
        estado,
        input.origen,
        input.asignadoA ?? null,
        estado !== "por_comprar" ? ahora : null,
        estado === "recibido" ? ahora : null,
        input.observacion ?? null,
      ],
    );
    const filas = await q<FilaSolicitud>("select * from v_solicitudes where id = $1 limit 1", [insertadas[0].id]);
    return aSolicitud(filas[0]);
  },

  async cambiarEstadoSolicitud(id: string, estado: EstadoSolicitud, cambios = {}) {
    const actuales = await q<{ fecha_compra: string | null; fecha_recepcion: string | null }>(
      "select fecha_compra, fecha_recepcion from solicitudes_compra where id = $1 limit 1",
      [id],
    );
    const actual = actuales[0];
    if (!actual) throw new ErrorDatos("La solicitud no existe.");
    const ahora = new Date().toISOString();
    const sets = ["estado = $1", "fecha_compra = $2", "fecha_recepcion = $3"];
    const params: unknown[] = [
      estado,
      estado === "por_comprar" ? null : (actual.fecha_compra ?? ahora),
      estado === "recibido" ? (actual.fecha_recepcion ?? ahora) : null,
    ];
    if (cambios.cantidad !== undefined) {
      params.push(cambios.cantidad);
      sets.push(`cantidad = $${params.length}`);
    }
    if (cambios.asignadoA !== undefined) {
      params.push(cambios.asignadoA);
      sets.push(`asignado_a = $${params.length}`);
    }
    params.push(id);
    await q(`update solicitudes_compra set ${sets.join(", ")} where id = $${params.length}`, params);
    const filas = await q<FilaSolicitud>("select * from v_solicitudes where id = $1 limit 1", [id]);
    return aSolicitud(filas[0]);
  },

  async reiniciarDemo() {
    throw new ErrorDatos("En modo Neon los datos se reinician ejecutando db/seed.sql contra el proyecto de pruebas.");
  },
};
