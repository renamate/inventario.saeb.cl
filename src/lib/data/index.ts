import "server-only";

import { repositorioLocal } from "./local";
import type { Repositorio } from "./repo";
import { repositorioSupabase } from "./supabase";

export function supabaseConfigurado(): boolean {
  if (process.env.DATA_MODE === "local") return false;
  return Boolean((process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) && (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY));
}

export function repo(): Repositorio {
  return supabaseConfigurado() ? repositorioSupabase : repositorioLocal;
}
