/** Normaliza texto eliminando diacríticos, comas, puntuación y espacios repetidos. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("es-AR");
}

/** Verifica si todos los términos de búsqueda coinciden (en cualquier orden) con los campos dados. */
export function matchesNormalizedSearch(
  query: string,
  fields: ReadonlyArray<string | null | undefined>,
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const haystack = normalizeSearchText(fields.filter(Boolean).join(" "));
  if (!haystack) return false;
  return normalizedQuery.split(" ").every((token) => haystack.includes(token));
}
