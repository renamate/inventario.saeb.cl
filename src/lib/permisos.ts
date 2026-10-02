import type { Rol, TipoMovimiento, Usuario } from "./types";

export const USUARIOS_DEMO: (Usuario & { descripcion: string })[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    nombre: "Voluntario demo",
    rol: "voluntario",
    descripcion: "Registra salidas desde el teléfono y consulta stock.",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    nombre: "Encargada demo",
    rol: "encargada",
    descripcion: "Registra ingresos y ajustes, y gestiona el tablero de compras.",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    nombre: "Administrador demo",
    rol: "admin",
    descripcion: "Todo lo anterior, más calidad de datos y reinicio de la demo.",
  },
];

export const TIPOS_PERMITIDOS: Record<Rol, TipoMovimiento[]> = {
  voluntario: ["salida"],
  encargada: ["salida", "ingreso", "ajuste"],
  admin: ["salida", "ingreso", "ajuste"],
};

export const permisos = {
  registrar: (rol: Rol, tipo: TipoMovimiento) => TIPOS_PERMITIDOS[rol].includes(tipo),
  gestionarCompras: (rol: Rol) => rol !== "voluntario",
  exportar: (rol: Rol) => rol !== "voluntario",
  administrar: (rol: Rol) => rol === "admin",
};

export const MATRIZ_PERMISOS: { accion: string; roles: Record<Rol, boolean> }[] = [
  { accion: "Ver dashboard, catálogo e historial", roles: { voluntario: true, encargada: true, admin: true } },
  { accion: "Registrar salidas (formulario o QR)", roles: { voluntario: true, encargada: true, admin: true } },
  { accion: "Registrar ingresos y ajustes", roles: { voluntario: false, encargada: true, admin: true } },
  { accion: "Ver tablero de compras", roles: { voluntario: true, encargada: true, admin: true } },
  { accion: "Crear y mover tarjetas de compra", roles: { voluntario: false, encargada: true, admin: true } },
  { accion: "Imprimir etiquetas QR y exportar CSV", roles: { voluntario: false, encargada: true, admin: true } },
  { accion: "Calidad de datos y reinicio de la demo", roles: { voluntario: false, encargada: false, admin: true } },
];
