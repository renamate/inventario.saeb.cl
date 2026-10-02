import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_SESION, leerToken } from "./lib/sesion-token";

export async function proxy(request: NextRequest) {
  const usuario = await leerToken(request.cookies.get(COOKIE_SESION)?.value);
  if (usuario) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("volver", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:png|svg|jpg|ico|webp)$).*)"],
};
