const ILLINOIS_RE = /^[a-z0-9._+-]+@illinois\.edu$/i;

export function isIllinoisEmail(email: string): boolean {
  return ILLINOIS_RE.test(email.trim());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
