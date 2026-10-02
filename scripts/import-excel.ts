/**
 * Importa el Excel "SAEB 2027 Inventario CDP" y genera:
 *   - data/seed.json  → datos para el modo demo local (sin Neon)
 *   - db/seed.sql     → inserts para cargar el proyecto Neon
 *
 * Uso: npm run import:excel -- "ruta/al/archivo.xlsx"
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

import type { SeedData, SeedProveedorProducto } from "../src/lib/seed-types";

const ANIO = 2027;
// Los movimientos del Excel no tienen fecha; se les asigna la fecha de la última
// modificación del archivo para que queden trazados en el historial.
const FECHA_MOVIMIENTOS_SIN_FECHA = "2026-09-18T12:00:00-03:00";
const RESPONSABLE_IMPORTACION = "Importación Excel";

const URL_PROVEEDORES: Record<string, string> = {
  Prisa: "https://www.prisa.cl",
  Easy: "https://www.easy.cl",
};

const UM_NORMALIZADA: Record<string, { codigo: string; descripcion: string }> = {
  un: { codigo: "Un", descripcion: "Unidad" },
  caja: { codigo: "Caja", descripcion: "Caja" },
  paq: { codigo: "Paq", descripcion: "Paquete" },
  "bidón": { codigo: "Bidón", descripcion: "Bidón" },
  bidon: { codigo: "Bidón", descripcion: "Bidón" },
  "paq 50u": { codigo: "Paq 50u", descripcion: "Paquete de 50 unidades" },
  "paq 100u": { codigo: "Paq 100u", descripcion: "Paquete de 100 unidades" },
  "paq 100": { codigo: "Paq 100u", descripcion: "Paquete de 100 unidades" },
  "paq (100u)": { codigo: "Paq 100u", descripcion: "Paquete de 100 unidades" },
  "paq 200u": { codigo: "Paq 200u", descripcion: "Paquete de 200 unidades" },
};

function normalizarUm(valor: unknown): { codigo: string; descripcion: string } {
  const clave = String(valor ?? "Un").trim().toLowerCase();
  return UM_NORMALIZADA[clave] ?? { codigo: String(valor).trim(), descripcion: String(valor).trim() };
}

function texto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const t = String(valor).trim();
  return t === "" || t === "-" ? null : t;
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function filasTabla(ws: XLSX.WorkSheet, filaEncabezado: number): unknown[][] {
  const filas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
  return filas.slice(filaEncabezado);
}

function fechaIso(valor: unknown): string | null {
  if (valor instanceof Date) {
    const y = valor.getFullYear();
    const m = String(valor.getMonth() + 1).padStart(2, "0");
    const d = String(valor.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}T09:00:00-03:00`;
  }
  return null;
}

function sqlValor(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function main() {
  const archivo = process.argv[2];
  if (!archivo) {
    console.error('Indica la ruta del Excel: npm run import:excel -- "archivo.xlsx"');
    process.exit(1);
  }

  const wb = XLSX.read(readFileSync(archivo), { cellDates: true });

  const dash = filasTabla(wb.Sheets["DASHBOARD"], 3)[0] ?? [];
  const excelIndicadores = {
    productosActivos: Number(dash[0]),
    stockCritico: Number(dash[2]),
    stockNegativo: Number(dash[4]),
    porComprar: Number(dash[6]),
  };

  const almacenes = new Set<string>();
  const unidades = new Map<string, string>();
  const proveedores = new Set<string>();
  const productos: SeedData["productos"] = [];
  const productoProveedor: SeedProveedorProducto[] = [];
  const stockInicial: SeedData["stockInicial"] = [];

  for (const r of filasTabla(wb.Sheets["PRODUCTOS"], 3)) {
    const sku = numero(r[0]);
    if (sku === null) continue;
    const nombre = texto(r[1])!;
    const um = normalizarUm(r[3]);
    const almacen = texto(r[11]) ?? "Sin almacén";
    almacenes.add(almacen);
    unidades.set(um.codigo, um.descripcion);

    productos.push({
      sku,
      nombre,
      descripcionProveedor: texto(r[2]),
      um: um.codigo,
      umOriginal: texto(r[3]),
      especial: String(r[4] ?? "").trim().toUpperCase() === "X",
      stockMinimo: numero(r[10]),
      almacen,
      activo: true,
    });
    stockInicial.push({ anio: ANIO, sku, cantidad: numero(r[5]) ?? 0 });

    const nombresProv = (texto(r[12]) ?? "").split("/").map((s) => s.trim()).filter(Boolean);
    const codigos = (texto(r[14]) ?? "").split("/").map((s) => s.trim()).filter(Boolean);
    nombresProv.forEach((prov, i) => {
      proveedores.add(prov);
      productoProveedor.push({
        sku,
        proveedor: prov,
        codigoProveedor: codigos[i] ?? null,
        observacion: i === 0 ? texto(r[13]) : null,
        preferido: i === 0,
      });
    });
  }

  const porNombre = new Map(productos.map((p) => [p.nombre.toLowerCase(), p]));
  const porSku = new Map(productos.map((p) => [p.sku, p]));

  const movimientos: SeedData["movimientos"] = [];
  let correlativo = 0;
  for (const r of filasTabla(wb.Sheets["MOVIMIENTOS"], 3)) {
    const sku = numero(r[4]) ?? numero(r[2]);
    const tipoTexto = texto(r[6]);
    const cantidad = numero(r[7]);
    if (sku === null || !tipoTexto || cantidad === null) continue;
    if (!porSku.has(sku)) throw new Error(`Movimiento con SKU inexistente: ${sku}`);
    const tipo = tipoTexto.toLowerCase().startsWith("ingreso")
      ? "ingreso"
      : tipoTexto.toLowerCase().startsWith("salida")
        ? "salida"
        : "ajuste";
    correlativo += 1;
    const fecha = fechaIso(r[1]) ?? FECHA_MOVIMIENTOS_SIN_FECHA;
    movimientos.push({
      folio: `${fecha.slice(0, 10).replace(/-/g, "")}-${String(correlativo).padStart(4, "0")}`,
      fecha,
      sku,
      tipo,
      cantidad,
      valorUnitario: numero(r[9]),
      observacion: texto(r[10]) ?? (fechaIso(r[1]) ? null : "Importado del Excel (sin fecha original)"),
      responsable: RESPONSABLE_IMPORTACION,
    });
  }

  const solicitudes: SeedData["solicitudes"] = [];
  for (const r of filasTabla(wb.Sheets["COMPRAR"], 3)) {
    const productoTexto = texto(r[0]);
    if (!productoTexto) continue;
    const producto = porNombre.get(productoTexto.toLowerCase());
    const proveedor = texto(r[3]);
    if (proveedor) proveedores.add(proveedor);
    const um = normalizarUm(r[2]);
    unidades.set(um.codigo, um.descripcion);
    const estadoTexto = (texto(r[5]) ?? "Por comprar").toLowerCase();
    const enlaceObs = texto(r[8]);
    const esEnlace = enlaceObs?.startsWith("http") ?? false;
    solicitudes.push({
      sku: producto?.sku ?? null,
      productoTexto: producto ? null : productoTexto,
      cantidad: numero(r[1]) ?? 1,
      um: um.codigo,
      proveedor,
      codigoProveedor: texto(r[4]),
      enlace: esEnlace ? enlaceObs : null,
      estado: estadoTexto.startsWith("recib") ? "recibido" : estadoTexto.startsWith("compr") ? "comprado" : "por_comprar",
      origen: "manual",
      fechaSolicitud: fechaIso(r[6]),
      fechaRecepcion: fechaIso(r[7]),
      observacion: esEnlace ? null : enlaceObs,
    });
  }

  const seed: SeedData = {
    fuente: path.basename(archivo),
    generadoEn: new Date().toISOString(),
    anio: ANIO,
    excelIndicadores,
    almacenes: [...almacenes].sort(),
    unidades: [...unidades].map(([codigo, descripcion]) => ({ codigo, descripcion })),
    proveedores: [...proveedores].sort().map((nombre) => ({ nombre, urlPortal: URL_PROVEEDORES[nombre] ?? null })),
    productos,
    productoProveedor,
    stockInicial,
    movimientos,
    solicitudes,
  };

  mkdirSync("data", { recursive: true });
  writeFileSync("data/seed.json", JSON.stringify(seed, null, 2) + "\n");
  mkdirSync("db", { recursive: true });
  writeFileSync("db/seed.sql", generarSql(seed));

  console.log(
    `OK: ${productos.length} productos, ${seed.almacenes.length} almacenes, ${seed.proveedores.length} proveedores, ` +
      `${movimientos.length} movimientos, ${solicitudes.length} solicitudes.`,
  );
  console.log("Indicadores del Excel:", excelIndicadores);
}

function generarSql(seed: SeedData): string {
  const l: string[] = [];
  l.push("-- Generado por scripts/import-excel.ts a partir de " + seed.fuente);
  l.push("-- Ejecutar DESPUÉS de las migraciones. Es idempotente: limpia y recarga los datos.");
  l.push("begin;");
  l.push("truncate movimientos, solicitudes_compra, stock_inicial, producto_proveedor, productos, proveedores, unidades_medida, almacenes, periodos, perfiles restart identity cascade;");
  l.push("");
  l.push("insert into perfiles (id, nombre, rol) values");
  l.push("  ('00000000-0000-4000-8000-000000000001', 'Voluntario demo', 'voluntario'),");
  l.push("  ('00000000-0000-4000-8000-000000000002', 'Encargada demo', 'encargada'),");
  l.push("  ('00000000-0000-4000-8000-000000000003', 'Administrador demo', 'admin'),");
  l.push("  ('00000000-0000-4000-8000-000000000099', 'Importación Excel', 'admin');");
  l.push(`insert into periodos (anio, fecha_inicio, cerrado) values (${seed.anio}, '${seed.anio}-01-01', false);`);
  l.push("insert into almacenes (nombre) values " + seed.almacenes.map((a) => `(${sqlValor(a)})`).join(", ") + ";");
  l.push(
    "insert into unidades_medida (codigo, descripcion) values " +
      seed.unidades.map((u) => `(${sqlValor(u.codigo)}, ${sqlValor(u.descripcion)})`).join(", ") +
      ";",
  );
  l.push(
    "insert into proveedores (nombre, url_portal) values " +
      seed.proveedores.map((p) => `(${sqlValor(p.nombre)}, ${sqlValor(p.urlPortal)})`).join(", ") +
      ";",
  );
  l.push("");
  l.push("insert into productos (sku, nombre, descripcion_proveedor, um_id, especial, stock_minimo, almacen_id, activo) values");
  l.push(
    seed.productos
      .map(
        (p) =>
          `  (${p.sku}, ${sqlValor(p.nombre)}, ${sqlValor(p.descripcionProveedor)}, (select id from unidades_medida where codigo = ${sqlValor(p.um)}), ${sqlValor(p.especial)}, ${sqlValor(p.stockMinimo)}, (select id from almacenes where nombre = ${sqlValor(p.almacen)}), true)`,
      )
      .join(",\n") + ";",
  );
  l.push("");
  l.push("insert into stock_inicial (anio, sku, cantidad) values");
  l.push(seed.stockInicial.map((s) => `  (${s.anio}, ${s.sku}, ${s.cantidad})`).join(",\n") + ";");
  l.push("");
  l.push("insert into producto_proveedor (sku, proveedor_id, codigo_proveedor, observacion, preferido) values");
  l.push(
    seed.productoProveedor
      .map(
        (pp) =>
          `  (${pp.sku}, (select id from proveedores where nombre = ${sqlValor(pp.proveedor)}), ${sqlValor(pp.codigoProveedor)}, ${sqlValor(pp.observacion)}, ${sqlValor(pp.preferido)})`,
      )
      .join(",\n") + ";",
  );
  l.push("");
  l.push("insert into movimientos (folio, fecha, sku, tipo, cantidad, valor_unitario, observacion, responsable_id, responsable_nombre) values");
  l.push(
    seed.movimientos
      .map(
        (m) =>
          `  (${sqlValor(m.folio)}, ${sqlValor(m.fecha)}, ${m.sku}, ${sqlValor(m.tipo)}, ${m.cantidad}, ${sqlValor(m.valorUnitario)}, ${sqlValor(m.observacion)}, '00000000-0000-4000-8000-000000000099', ${sqlValor(m.responsable)})`,
      )
      .join(",\n") + ";",
  );
  l.push("");
  l.push("insert into solicitudes_compra (sku, producto_texto, cantidad, um_id, proveedor_id, codigo_proveedor, enlace, estado, origen, fecha_solicitud, fecha_recepcion, observacion) values");
  l.push(
    seed.solicitudes
      .map(
        (s) =>
          `  (${sqlValor(s.sku)}, ${sqlValor(s.productoTexto)}, ${s.cantidad}, (select id from unidades_medida where codigo = ${sqlValor(s.um)}), ${s.proveedor ? `(select id from proveedores where nombre = ${sqlValor(s.proveedor)})` : "null"}, ${sqlValor(s.codigoProveedor)}, ${sqlValor(s.enlace)}, ${sqlValor(s.estado)}, ${sqlValor(s.origen)}, ${sqlValor(s.fechaSolicitud)}, ${sqlValor(s.fechaRecepcion)}, ${sqlValor(s.observacion)})`,
      )
      .join(",\n") + ";",
  );
  l.push("commit;");
  return l.join("\n") + "\n";
}

main();
