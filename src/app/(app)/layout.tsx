import { AppShell } from "@/components/app-shell";
import { repo } from "@/lib/data";
import { requerirUsuario } from "@/lib/sesion";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuario = await requerirUsuario();
  return (
    <AppShell usuario={usuario} modo={repo().modo}>
      {children}
    </AppShell>
  );
}
