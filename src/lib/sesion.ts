import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { COOKIE_SESION, leerToken } from "./sesion-token";
import type { Usuario } from "./types";

export async function usuarioActual(): Promise<Usuario | null> {
  const almacen = await cookies();
  return leerToken(almacen.get(COOKIE_SESION)?.value);
}

export async function requerirUsuario(): Promise<Usuario> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/login");
  return usuario;
}
