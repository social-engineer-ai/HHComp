/**
 * Normalize a person's name for NDA signature comparison.
 * - trim
 * - collapse whitespace
 * - case-insensitive
 * - unicode NFC normalization
 */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").normalize("NFC").toLowerCase();
}

export function namesMatch(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}
