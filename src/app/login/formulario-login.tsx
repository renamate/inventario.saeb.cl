"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";

import { iniciarSesion } from "@/app/acciones";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USUARIOS_DEMO } from "@/lib/permisos";
import { ROL_LABEL, type Rol } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FormularioLogin({ volver, mostrarPista }: { volver: string; mostrarPista: boolean }) {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, undefined);
  const [rol, setRol] = useState<Rol>("voluntario");

  return (
    <Card>
      <CardContent>
        <form action={accion} className="space-y-5">
          <input type="hidden" name="volver" value={volver} />
          <input type="hidden" name="rol" value={rol} />
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Entrar como</legend>
            {USUARIOS_DEMO.map((u) => (
              <button
                type="button"
                key={u.rol}
                onClick={() => setRol(u.rol)}
                aria-pressed={rol === u.rol}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/60",
                  rol === u.rol && "border-primary bg-secondary/60 ring-1 ring-primary",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                    rol === u.rol && "border-primary",
                  )}
                >
                  {rol === u.rol && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <span>
                  <span className="block text-sm font-medium">{ROL_LABEL[u.rol]}</span>
                  <span className="block text-xs text-muted-foreground">{u.descripcion}</span>
                </span>
              </button>
            ))}
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="clave">Clave de acceso</Label>
            <Input id="clave" name="clave" type="password" autoComplete="current-password" required className="h-11" />
            {mostrarPista && <p className="text-xs text-muted-foreground">Desarrollo local: la clave por defecto es saeb2027.</p>}
          </div>
          {estado?.error && (
            <Alert variant="destructive">
              <AlertDescription>{estado.error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="h-11 w-full text-base" disabled={pendiente}>
            {pendiente && <Loader2 className="animate-spin" />} Ingresar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
