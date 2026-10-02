/** Minúsculas y sin tildes, para buscar "higienico" y encontrar "higiénico". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
