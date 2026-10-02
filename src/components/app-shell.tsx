"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  QrCode,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";

import { cerrarSesion } from "@/app/acciones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ROL_LABEL, type Usuario } from "@/lib/types";

type Props = { usuario: Usuario; modo: "supabase" | "local"; children: React.ReactNode };

const NAV = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/catalogo", label: "Catálogo", icon: Package },
  { href: "/registrar", label: "Registrar", icon: Plus, destacado: true },
  { href: "/compras", label: "Compras", icon: ShoppingCart },
  { href: "/historial", label: "Historial", icon: History },
];

const NAV_EXTRA = [
  { href: "/etiquetas", label: "Etiquetas QR", icon: QrCode },
  { href: "/roles", label: "Roles y permisos", icon: ShieldCheck },
];

function activo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <ClipboardList className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">Inventario SAEB</span>
        <span className="block text-xs text-muted-foreground">Bodega CDP · 2027</span>
      </span>
    </Link>
  );
}

function MenuUsuario({ usuario, modo }: Omit<Props, "children">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 rounded-full pr-3 pl-1.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {usuario.nombre.slice(0, 1)}
          </span>
          <span className="hidden text-sm sm:inline">{ROL_LABEL[usuario.rol]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="font-medium">{usuario.nombre}</div>
          <div className="text-xs font-normal text-muted-foreground">Perfil: {ROL_LABEL[usuario.rol]}</div>
          <div className="mt-1 text-xs font-normal text-muted-foreground">
            Datos: {modo === "supabase" ? "Supabase" : "demo local"}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {NAV_EXTRA.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href}>
              <item.icon /> {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        {usuario.rol === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck /> Administración
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => cerrarSesion()}>
          <LogOut /> Cambiar de perfil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ usuario, modo, children }: Props) {
  const pathname = usePathname();
  const extras = usuario.rol === "admin" ? [...NAV_EXTRA, { href: "/admin", label: "Administración", icon: ShieldCheck }] : NAV_EXTRA;

  return (
    <div className="flex min-h-dvh">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card px-4 py-5 lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                activo(pathname, item.href) && "bg-secondary text-secondary-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.href === "/registrar" ? "Registrar movimiento" : item.label}
            </Link>
          ))}
          <div className="mt-4 mb-1 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Más</div>
          {extras.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                activo(pathname, item.href) && "bg-secondary text-secondary-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border bg-muted/50 p-3 text-xs text-muted-foreground">
          {modo === "supabase" ? (
            <>Conectado a Supabase.</>
          ) : (
            <>
              <Badge variant="outline" className="mb-1.5">
                Modo demo local
              </Badge>
              <p>Datos reales del Excel cargados en memoria. Conecta Supabase para persistirlos.</p>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden text-sm text-muted-foreground lg:block">
            Hola, <span className="font-medium text-foreground">{usuario.nombre}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="h-10 gap-2 rounded-full px-3">
              <Link href="/registrar?escanear=1" aria-label="Escanear código">
                <ScanLine className="size-4" />
                <span className="hidden sm:inline">Escanear</span>
              </Link>
            </Button>
            <MenuUsuario usuario={usuario} modo={modo} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) =>
            item.destacado ? (
              <Link key={item.href} href={item.href} className="flex flex-col items-center justify-end pb-2" aria-label="Registrar movimiento">
                <span
                  className={cn(
                    "-mt-6 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg ring-4 ring-background",
                    activo(pathname, item.href) && "bg-primary/90",
                  )}
                >
                  <item.icon className="size-6" />
                </span>
                <span className="mt-1 text-[11px] font-medium text-foreground">{item.label}</span>
              </Link>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground",
                  activo(pathname, item.href) && "text-primary",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
