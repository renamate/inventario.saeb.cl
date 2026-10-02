import type { Usuario } from "./types";

export const COOKIE_SESION = "saeb_sesion";
export const COOKIE_RESPONSABLE = "saeb_responsable";
export const DURACION_SESION_S = 60 * 60 * 24 * 14;

const DEV_SECRET = "saeb-poc-secreto-solo-para-desarrollo";

function secreto(): string {
  return process.env.AUTH_SECRET || DEV_SECRET;
}

const codificador = new TextEncoder();

function aBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function desdeBase64Url(texto: string): Uint8Array {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((texto.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function firmar(datos: string): Promise<string> {
  const clave = await crypto.subtle.importKey("raw", codificador.encode(secreto()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return aBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", clave, codificador.encode(datos))));
}

export async function crearToken(usuario: Usuario): Promise<string> {
  const payload = aBase64Url(codificador.encode(JSON.stringify({ ...usuario, exp: Date.now() + DURACION_SESION_S * 1000 })));
  return `${payload}.${await firmar(payload)}`;
}

export async function leerToken(token: string | undefined): Promise<Usuario | null> {
  if (!token) return null;
  const [payload, firma] = token.split(".");
  if (!payload || !firma) return null;
  if ((await firmar(payload)) !== firma) return null;
  try {
    const datos = JSON.parse(new TextDecoder().decode(desdeBase64Url(payload))) as Usuario & { exp: number };
    if (datos.exp < Date.now()) return null;
    return { id: datos.id, nombre: datos.nombre, rol: datos.rol };
  } catch {
    return null;
  }
}
