import bcrypt from "bcryptjs";

const COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function validatePasswordStrength(p: string): string | null {
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (p.length > 200) return "Password is too long.";
  return null;
}
