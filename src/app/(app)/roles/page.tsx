import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";

import { cerrarSesion } from "@/app/acciones";
import { Encabezado } from "@/components/encabezado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MATRIZ_PERMISOS, USUARIOS_DEMO } from "@/lib/permisos";
import { requerirUsuario } from "@/lib/sesion";
import { ROL_LABEL, type Rol } from "@/lib/types";

export const metadata: Metadata = { title: "Roles y permisos" };

const ROLES: Rol[] = ["voluntario", "encargada", "admin"];

export default async function RolesPage() {
  const usuario = await requerirUsuario();
  return (
    <>
      <Encabezado titulo="Roles y permisos" descripcion="Qué ve y qué puede hacer cada perfil de demostración.">
        <form action={cerrarSesion}>
          <Button variant="outline" className="h-10">
            Cambiar de perfil
          </Button>
        </form>
      </Encabezado>

      <div className="grid gap-3 md:grid-cols-3">
        {USUARIOS_DEMO.map((u) => (
          <Card key={u.rol} className={u.rol === usuario.rol ? "border-primary ring-1 ring-primary" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {ROL_LABEL[u.rol]}
                {u.rol === usuario.rol && <Badge>Tu perfil</Badge>}
              </CardTitle>
              <CardDescription>{u.descripcion}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="mt-4 py-0">
        <CardContent className="overflow-x-auto px-0">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-3 font-medium">Acción</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-3 py-3 text-center font-medium">
                    {ROL_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIZ_PERMISOS.map((fila) => (
                <tr key={fila.accion} className="border-b last:border-0">
                  <td className="px-4 py-3">{fila.accion}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 py-3 text-center">
                      {fila.roles[r] ? (
                        <Check className="mx-auto size-4 text-emerald-600" aria-label="Permitido" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted-foreground" aria-label="No permitido" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Los permisos se validan en el servidor en cada acción, no solo en la interfaz. En el MVP se reemplazan los perfiles demo
        por usuarios reales con Supabase Auth.
      </p>
    </>
  );
}
