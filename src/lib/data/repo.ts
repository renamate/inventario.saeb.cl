import type {
  EstadoSolicitud,
  FiltrosMovimientos,
  Movimiento,
  NuevaSolicitud,
  NuevoMovimiento,
  ProductoStock,
  Solicitud,
} from "../types";

export type ModoDatos = "neon" | "local";

export interface Repositorio {
  modo: ModoDatos;
  listarStock(): Promise<ProductoStock[]>;
  obtenerProducto(sku: number): Promise<ProductoStock | null>;
  listarMovimientos(filtros?: FiltrosMovimientos): Promise<Movimiento[]>;
  crearMovimiento(input: NuevoMovimiento, responsableId: string): Promise<Movimiento>;
  listarSolicitudes(): Promise<Solicitud[]>;
  crearSolicitud(input: NuevaSolicitud): Promise<Solicitud>;
  cambiarEstadoSolicitud(
    id: string,
    estado: EstadoSolicitud,
    cambios?: { cantidad?: number; asignadoA?: string | null },
  ): Promise<Solicitud>;
  reiniciarDemo(): Promise<void>;
}

export class ErrorDatos extends Error {}
