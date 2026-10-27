/**
 * Utilitários de normalização e comparação tolerante a acentuação e caixa (Syngeti)
 */

export function normalizeString(str?: string | null): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacríticos e acentuações
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " "); // Reduz múltiplos espaços a um único espaço
}

export function areStringsEquivalent(a?: string | null, b?: string | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return normalizeString(a) === normalizeString(b);
}

/**
 * Retorna se a string 'haystack' contém 'needle' de forma tolerante a acentos e maiúsculas/minúsculas
 */
export function fuzzyIncludes(haystack?: string | null, needle?: string | null): boolean {
  if (!needle || needle.trim() === "") return true;
  if (!haystack) return false;
  return normalizeString(haystack).includes(normalizeString(needle));
}
