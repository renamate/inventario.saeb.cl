import "server-only";

import { headers } from "next/headers";
import QRCode from "qrcode";

export async function origenApp(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export function urlEtiqueta(origen: string, sku: number): string {
  return `${origen}/r/${sku}`;
}

export async function qrSvg(texto: string): Promise<string> {
  return QRCode.toString(texto, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
}
