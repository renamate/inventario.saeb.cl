export type Rol = "voluntario" | "encargada" | "admin";
export type TipoMovimiento = "ingreso" | "salida" | "ajuste";
export type EstadoSolicitud = "por_comprar" | "comprado" | "recibido";
export type EstadoStock = "ok" | "critico" | "negativo";

export type Usuario = { id: string; nombre: string; rol: Rol };

export type ProveedorProducto = {
  proveedor: string;
  urlPortal: string | null;
  codigoProveedor: string | null;
  observacion: string | null;
  preferido: boolean;
};

export type ProductoStock = {
  sku: number;
  nombre: string;
  descripcionProveedor: string | null;
  um: string;
  especial: boolean;
  stockMinimo: number | null;
  almacen: string;
  activo: boolean;
  stockInicial: number;
  ingresos: number;
  salidas: number;
  ajustes: number;
  existencia: number;
  estado: EstadoStock;
  proveedores: ProveedorProducto[];
};

export type Movimiento = {
  id: string;
  folio: string;
  fecha: string;
  sku: number;
  producto: string;
  almacen: string;
  um: string;
  tipo: TipoMovimiento;
  cantidad: number;
  valorUnitario: number | null;
  observacion: string | null;
  responsable: string;
  solicitudId: string | null;
};

export type NuevoMovimiento = {
  sku: number;
  tipo: TipoMovimiento;
  cantidad: number;
  observacion?: string | null;
  responsable: string;
  valorUnitario?: number | null;
  solicitudId?: string | null;
};

export type Solicitud = {
  id: string;
  sku: number | null;
  producto: string;
  almacen: string | null;
  cantidad: number;
  um: string | null;
  proveedor: string | null;
  codigoProveedor: string | null;
  enlace: string | null;
  estado: EstadoSolicitud;
  origen: "manual" | "alerta";
  asignadoA: string | null;
  fechaSolicitud: string | null;
  fechaCompra: string | null;
  fechaRecepcion: string | null;
  observacion: string | null;
};

export type NuevaSolicitud = {
  sku: number | null;
  productoTexto?: string | null;
  cantidad: number;
  proveedor?: string | null;
  codigoProveedor?: string | null;
  enlace?: string | null;
  estado?: EstadoSolicitud;
  origen: "manual" | "alerta";
  asignadoA?: string | null;
  observacion?: string | null;
};

export type FiltrosMovimientos = {
  desde?: string;
  hasta?: string;
  sku?: number;
  almacen?: string;
  tipo?: TipoMovimiento;
};

export const TIPO_LABEL: Record<TipoMovimiento, string> = {
  ingreso: "Ingreso",
  salida: "Salida",
  ajuste: "Ajuste",
};

export const ESTADO_SOLICITUD_LABEL: Record<EstadoSolicitud, string> = {
  por_comprar: "Por comprar",
  comprado: "Comprado",
  recibido: "Recibido",
};

export const ESTADO_STOCK_LABEL: Record<EstadoStock, string> = {
  ok: "OK",
  critico: "Crítico",
  negativo: "Negativo",
};

export const ROL_LABEL: Record<Rol, string> = {
  voluntario: "Voluntario",
  encargada: "Encargada",
  admin: "Administrador",
};
