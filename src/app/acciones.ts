"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { repo } from "@/lib/data";
import { ErrorDatos } from "@/lib/data/repo";
import { USUARIOS_DEMO, permisos } from "@/lib/permisos";
import { COOKIE_SESION, DURACION_SESION_S, crearToken } from "@/lib/sesion-token";
import { requerirUsuario } from "@/lib/sesion";
import { TIPO_LABEL, type EstadoSolicitud, type Movimiento, type Solicitud } from "@/lib/types";

export type Resultado<T = undefined> = { ok: true; datos: T } | { ok: false; error: string };

function claveDemo() {
  return process.env.DEMO_PASSWORD || "saeb2027";
}

function rutaSegura(volver: unknown): string {
  const r = typeof volver === "string" ? volver : "/";
  return r.startsWith("/") && !r.startsWith("//") && !r.startsWith("/login") ? r : "/";
}

export async function iniciarSesion(_prev: { error?: string } | undefined, formData: FormData) {
  const usuario = USUARIOS_DEMO.find((u) => u.rol === formData.get("rol"));
  if (!usuario) return { error: "Elige un perfil de demostración." };
  if (formData.get("clave") !== claveDemo()) return { error: "La clave de acceso no es correcta." };

  const almacen = await cookies();
  almacen.set(COOKIE_SESION, await crearToken({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SESION_S,
  });
  redirect(rutaSegura(formData.get("volver")));
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE_SESION);
  redirect("/login");
}

function refrescar() {
  for (const ruta of ["/", "/catalogo", "/compras", "/historial", "/registrar"]) revalidatePath(ruta, "layout");
}

function mensajeError(e: unknown): string {
  if (e instanceof ErrorDatos) return e.message;
  console.error(e);
  return "No se pudo guardar. Revisa la conexión e inténtalo de nuevo.";
}

const esquemaMovimiento = z
  .object({
    sku: z.coerce.number().int().positive({ message: "Elige un producto del catálogo." }),
    tipo: z.enum(["ingreso", "salida", "ajuste"]),
    cantidad: z.coerce.number().refine((n) => Number.isFinite(n) && n !== 0, "Ingresa una cantidad distinta de 0."),
    responsable: z.string().trim().min(2, "Indica quién registra el movimiento.").max(80),
    observacion: z.string().trim().max(300).optional(),
  })
  .refine((d) => d.tipo === "ajuste" || d.cantidad > 0, {
    message: "Ingresos y salidas se registran con cantidad positiva.",
    path: ["cantidad"],
  });

export async function registrarMovimiento(
  entrada: z.input<typeof esquemaMovimiento>,
): Promise<Resultado<{ movimiento: Movimiento; existenciaAnterior: number; existenciaNueva: number }>> {
  const usuario = await requerirUsuario();
  const datos = esquemaMovimiento.safeParse(entrada);
  if (!datos.success) return { ok: false, error: datos.error.issues[0]?.message ?? "Datos inválidos." };
  const { sku, tipo, cantidad, responsable, observacion } = datos.data;

  if (!permisos.registrar(usuario.rol, tipo)) {
    return { ok: false, error: `Tu perfil no puede registrar movimientos de tipo "${TIPO_LABEL[tipo]}".` };
  }
  try {
    const r = repo();
    const producto = await r.obtenerProducto(sku);
    if (!producto) return { ok: false, error: `El SKU ${sku} no existe en el catálogo.` };
    const movimiento = await r.crearMovimiento({ sku, tipo, cantidad, responsable, observacion: observacion || null }, usuario.id);
    const delta = tipo === "salida" ? -cantidad : cantidad;
    refrescar();
    return {
      ok: true,
      datos: { movimiento, existenciaAnterior: producto.existencia, existenciaNueva: producto.existencia + delta },
    };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}

const esquemaSolicitud = z.object({
  sku: z.coerce.number().int().positive().nullable(),
  productoTexto: z.string().trim().max(160).nullable().optional(),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor que 0."),
  enlace: z.union([z.url("El enlace debe ser una URL válida."), z.literal("")]).optional(),
  asignadoA: z.string().trim().max(80).optional(),
  observacion: z.string().trim().max(300).optional(),
  estado: z.enum(["por_comprar", "comprado", "recibido"]).optional(),
  origen: z.enum(["manual", "alerta"]),
});

export async function crearSolicitud(entrada: z.input<typeof esquemaSolicitud>): Promise<Resultado<Solicitud>> {
  const usuario = await requerirUsuario();
  if (!permisos.gestionarCompras(usuario.rol)) return { ok: false, error: "Tu perfil no puede crear solicitudes de compra." };
  const datos = esquemaSolicitud.safeParse(entrada);
  if (!datos.success) return { ok: false, error: datos.error.issues[0]?.message ?? "Datos inválidos." };
  if (datos.data.sku === null && !datos.data.productoTexto) return { ok: false, error: "Elige un producto o escribe su nombre." };
  try {
    const solicitud = await repo().crearSolicitud({
      ...datos.data,
      enlace: datos.data.enlace || null,
      asignadoA: datos.data.asignadoA || null,
      observacion: datos.data.observacion || null,
    });
    refrescar();
    return { ok: true, datos: solicitud };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}

export async function moverSolicitud(entrada: {
  id: string;
  estado: EstadoSolicitud;
  cantidadRecibida?: number;
  registrarIngreso?: boolean;
}): Promise<Resultado<{ solicitud: Solicitud; ingreso: Movimiento | null }>> {
  const usuario = await requerirUsuario();
  if (!permisos.gestionarCompras(usuario.rol)) return { ok: false, error: "Tu perfil solo puede ver el tablero de compras." };
  try {
    const r = repo();
    const solicitud = await r.cambiarEstadoSolicitud(entrada.id, entrada.estado, {
      cantidad: entrada.cantidadRecibida && entrada.cantidadRecibida > 0 ? entrada.cantidadRecibida : undefined,
    });
    let ingreso: Movimiento | null = null;
    if (entrada.estado === "recibido" && entrada.registrarIngreso && solicitud.sku !== null) {
      ingreso = await r.crearMovimiento(
        {
          sku: solicitud.sku,
          tipo: "ingreso",
          cantidad: solicitud.cantidad,
          responsable: usuario.nombre,
          observacion: `Recepción de compra${solicitud.proveedor ? ` (${solicitud.proveedor})` : ""}`,
          solicitudId: solicitud.id,
        },
        usuario.id,
      );
    }
    refrescar();
    return { ok: true, datos: { solicitud, ingreso } };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}

export async function reiniciarDemo(): Promise<Resultado> {
  const usuario = await requerirUsuario();
  if (!permisos.administrar(usuario.rol)) return { ok: false, error: "Solo el administrador puede reiniciar la demo." };
  try {
    await repo().reiniciarDemo();
    refrescar();
    return { ok: true, datos: undefined };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}
