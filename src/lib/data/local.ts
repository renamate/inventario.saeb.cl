import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import seedJson from "../../../data/seed.json";
import type { SeedData } from "../seed-types";
import { calcularEstado } from "../stock";
import type {
  EstadoSolicitud,
  FiltrosMovimientos,
  Movimiento,
  NuevaSolicitud,
  NuevoMovimiento,
  ProductoStock,
  Solicitud,
} from "../types";
import { ErrorDatos, type Repositorio } from "./repo";
import { folioDelDia } from "./folio";

const seed = seedJson as SeedData;

type MovimientoGuardado = Omit<Movimiento, "producto" | "almacen" | "um"> & { responsableId: string | null };
type SolicitudGuardada = Omit<Solicitud, "producto" | "almacen" | "um"> & {
  productoTexto: string | null;
  um: string | null;
};

type Estado = { version: 1; movimientos: MovimientoGuardado[]; solicitudes: SolicitudGuardada[] };

const RUTA_DB =
  process.env.LOCAL_DB_PATH ?? (process.env.VERCEL ? "/tmp/saeb-demo-db.json" : path.join(process.cwd(), ".data", "demo-db.json"));

function estadoInicial(): Estado {
  return {
    version: 1,
    movimientos: seed.movimientos.map((m) => ({
      id: randomUUID(),
      folio: m.folio,
      fecha: new Date(m.fecha).toISOString(),
      sku: m.sku,
      tipo: m.tipo,
      cantidad: m.cantidad,
      valorUnitario: m.valorUnitario,
      observacion: m.observacion,
      responsable: m.responsable,
      responsableId: null,
      solicitudId: null,
    })),
    solicitudes: seed.solicitudes.map((s) => ({
      id: randomUUID(),
      sku: s.sku,
      productoTexto: s.productoTexto,
      cantidad: s.cantidad,
      um: s.um,
      proveedor: s.proveedor,
      codigoProveedor: s.codigoProveedor,
      enlace: s.enlace,
      estado: s.estado,
      origen: s.origen,
      asignadoA: null,
      fechaSolicitud: s.fechaSolicitud ? new Date(s.fechaSolicitud).toISOString() : null,
      fechaCompra: null,
      fechaRecepcion: s.fechaRecepcion ? new Date(s.fechaRecepcion).toISOString() : null,
      observacion: s.observacion,
    })),
  };
}

const globalo = globalThis as unknown as { __saebDemo?: Estado };

function cargar(): Estado {
  if (globalo.__saebDemo) return globalo.__saebDemo;
  let estado: Estado | null = null;
  try {
    if (existsSync(RUTA_DB)) estado = JSON.parse(readFileSync(RUTA_DB, "utf8")) as Estado;
  } catch {
    estado = null;
  }
  globalo.__saebDemo = estado ?? estadoInicial();
  return globalo.__saebDemo;
}

function guardar(estado: Estado) {
  globalo.__saebDemo = estado;
  try {
    mkdirSync(path.dirname(RUTA_DB), { recursive: true });
    writeFileSync(RUTA_DB, JSON.stringify(estado));
  } catch {
    // Sin disco escribible el modo demo sigue funcionando en memoria.
  }
}

const productosPorSku = new Map(seed.productos.map((p) => [p.sku, p]));
const stockInicialPorSku = new Map(seed.stockInicial.map((s) => [s.sku, s.cantidad]));
const urlProveedor = new Map(seed.proveedores.map((p) => [p.nombre, p.urlPortal]));

function calcularStock(estado: Estado): ProductoStock[] {
  const totales = new Map<number, { ingresos: number; salidas: number; ajustes: number }>();
  for (const m of estado.movimientos) {
    const t = totales.get(m.sku) ?? { ingresos: 0, salidas: 0, ajustes: 0 };
    if (m.tipo === "ingreso") t.ingresos += m.cantidad;
    else if (m.tipo === "salida") t.salidas += m.cantidad;
    else t.ajustes += m.cantidad;
    totales.set(m.sku, t);
  }
  return seed.productos
    .map((p) => {
      const t = totales.get(p.sku) ?? { ingresos: 0, salidas: 0, ajustes: 0 };
      const stockInicial = stockInicialPorSku.get(p.sku) ?? 0;
      const existencia = stockInicial + t.ingresos - t.salidas + t.ajustes;
      return {
        sku: p.sku,
        nombre: p.nombre,
        descripcionProveedor: p.descripcionProveedor,
        um: p.um,
        especial: p.especial,
        stockMinimo: p.stockMinimo,
        almacen: p.almacen,
        activo: p.activo,
        stockInicial,
        ...t,
        existencia,
        estado: calcularEstado(existencia, p.stockMinimo, p.especial),
        proveedores: seed.productoProveedor
          .filter((pp) => pp.sku === p.sku)
          .map((pp) => ({
            proveedor: pp.proveedor,
            urlPortal: urlProveedor.get(pp.proveedor) ?? null,
            codigoProveedor: pp.codigoProveedor,
            observacion: pp.observacion,
            preferido: pp.preferido,
          })),
      } satisfies ProductoStock;
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function aMovimiento(m: MovimientoGuardado): Movimiento {
  const p = productosPorSku.get(m.sku)!;
  const { responsableId: _omitido, ...resto } = m;
  void _omitido;
  return { ...resto, producto: p.nombre, almacen: p.almacen, um: p.um };
}

function aSolicitud(s: SolicitudGuardada): Solicitud {
  const p = s.sku !== null ? productosPorSku.get(s.sku) : undefined;
  const { productoTexto, ...resto } = s;
  return { ...resto, producto: p?.nombre ?? productoTexto ?? "Producto sin nombre", almacen: p?.almacen ?? null, um: s.um ?? p?.um ?? null };
}

export const repositorioLocal: Repositorio = {
  modo: "local",

  async listarStock() {
    return calcularStock(cargar());
  },

  async obtenerProducto(sku) {
    return calcularStock(cargar()).find((p) => p.sku === sku) ?? null;
  },

  async listarMovimientos(filtros: FiltrosMovimientos = {}) {
    return cargar()
      .movimientos.filter((m) => {
        if (filtros.sku && m.sku !== filtros.sku) return false;
        if (filtros.tipo && m.tipo !== filtros.tipo) return false;
        if (filtros.almacen && productosPorSku.get(m.sku)?.almacen !== filtros.almacen) return false;
        if (filtros.desde && m.fecha < new Date(filtros.desde).toISOString()) return false;
        if (filtros.hasta && m.fecha > new Date(filtros.hasta).toISOString()) return false;
        return true;
      })
      .map(aMovimiento)
      .sort((a, b) => (a.fecha === b.fecha ? b.folio.localeCompare(a.folio) : b.fecha.localeCompare(a.fecha)));
  },

  async crearMovimiento(input: NuevoMovimiento, responsableId: string) {
    const estado = cargar();
    if (!productosPorSku.has(input.sku)) throw new ErrorDatos(`El SKU ${input.sku} no existe en el catálogo.`);
    const ahora = new Date();
    const folio = folioDelDia(ahora, estado.movimientos.map((m) => m.folio));
    const nuevo: MovimientoGuardado = {
      id: randomUUID(),
      folio,
      fecha: ahora.toISOString(),
      sku: input.sku,
      tipo: input.tipo,
      cantidad: input.cantidad,
      valorUnitario: input.valorUnitario ?? null,
      observacion: input.observacion ?? null,
      responsable: input.responsable,
      responsableId,
      solicitudId: input.solicitudId ?? null,
    };
    guardar({ ...estado, movimientos: [...estado.movimientos, nuevo] });
    return aMovimiento(nuevo);
  },

  async listarSolicitudes() {
    return cargar().solicitudes.map(aSolicitud);
  },

  async crearSolicitud(input: NuevaSolicitud) {
    const estado = cargar();
    const p = input.sku !== null ? productosPorSku.get(input.sku) : undefined;
    if (input.sku !== null && !p) throw new ErrorDatos(`El SKU ${input.sku} no existe en el catálogo.`);
    const preferido = seed.productoProveedor.find((pp) => pp.sku === input.sku && pp.preferido);
    const ahora = new Date().toISOString();
    const estadoSolicitud = input.estado ?? "por_comprar";
    const nueva: SolicitudGuardada = {
      id: randomUUID(),
      sku: input.sku,
      productoTexto: input.productoTexto ?? null,
      cantidad: input.cantidad,
      um: p?.um ?? null,
      proveedor: input.proveedor ?? preferido?.proveedor ?? null,
      codigoProveedor: input.codigoProveedor ?? preferido?.codigoProveedor ?? null,
      enlace: input.enlace ?? null,
      estado: estadoSolicitud,
      origen: input.origen,
      asignadoA: input.asignadoA ?? null,
      fechaSolicitud: ahora,
      fechaCompra: estadoSolicitud !== "por_comprar" ? ahora : null,
      fechaRecepcion: estadoSolicitud === "recibido" ? ahora : null,
      observacion: input.observacion ?? null,
    };
    guardar({ ...estado, solicitudes: [...estado.solicitudes, nueva] });
    return aSolicitud(nueva);
  },

  async cambiarEstadoSolicitud(id: string, nuevoEstado: EstadoSolicitud, cambios = {}) {
    const estado = cargar();
    const actual = estado.solicitudes.find((s) => s.id === id);
    if (!actual) throw new ErrorDatos("La solicitud no existe.");
    const ahora = new Date().toISOString();
    const actualizada: SolicitudGuardada = {
      ...actual,
      estado: nuevoEstado,
      cantidad: cambios.cantidad ?? actual.cantidad,
      asignadoA: cambios.asignadoA !== undefined ? cambios.asignadoA : actual.asignadoA,
      fechaCompra: nuevoEstado === "por_comprar" ? null : (actual.fechaCompra ?? ahora),
      fechaRecepcion: nuevoEstado === "recibido" ? (actual.fechaRecepcion ?? ahora) : null,
    };
    guardar({ ...estado, solicitudes: estado.solicitudes.map((s) => (s.id === id ? actualizada : s)) });
    return aSolicitud(actualizada);
  },

  async reiniciarDemo() {
    guardar(estadoInicial());
  },
};
