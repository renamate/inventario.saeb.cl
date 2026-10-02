import type { EstadoSolicitud, TipoMovimiento } from "./types";

export type SeedProveedorProducto = {
  sku: number;
  proveedor: string;
  codigoProveedor: string | null;
  observacion: string | null;
  preferido: boolean;
};

export type SeedData = {
  fuente: string;
  generadoEn: string;
  anio: number;
  excelIndicadores: {
    productosActivos: number;
    stockCritico: number;
    stockNegativo: number;
    porComprar: number;
  };
  almacenes: string[];
  unidades: { codigo: string; descripcion: string }[];
  proveedores: { nombre: string; urlPortal: string | null }[];
  productos: {
    sku: number;
    nombre: string;
    descripcionProveedor: string | null;
    um: string;
    umOriginal: string | null;
    especial: boolean;
    stockMinimo: number | null;
    almacen: string;
    activo: boolean;
  }[];
  productoProveedor: SeedProveedorProducto[];
  stockInicial: { anio: number; sku: number; cantidad: number }[];
  movimientos: {
    folio: string;
    fecha: string;
    sku: number;
    tipo: TipoMovimiento;
    cantidad: number;
    valorUnitario: number | null;
    observacion: string | null;
    responsable: string;
  }[];
  solicitudes: {
    sku: number | null;
    productoTexto: string | null;
    cantidad: number;
    um: string;
    proveedor: string | null;
    codigoProveedor: string | null;
    enlace: string | null;
    estado: EstadoSolicitud;
    origen: "manual" | "alerta";
    fechaSolicitud: string | null;
    fechaRecepcion: string | null;
    observacion: string | null;
  }[];
};
