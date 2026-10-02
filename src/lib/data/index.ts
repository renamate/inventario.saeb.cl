import "server-only";

import { repositorioLocal } from "./local";
import { repositorioNeon } from "./neon";
import type { Repositorio } from "./repo";

export function neonConfigurado(): boolean {
  if (process.env.DATA_MODE === "local") return false;
  return Boolean(process.env.DATABASE_URL);
}

export function repo(): Repositorio {
  return neonConfigurado() ? repositorioNeon : repositorioLocal;
}
