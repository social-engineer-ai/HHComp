export function normalizeTeamName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function validateTeamName(name: string): string | null {
  const t = name.trim();
  if (t.length < 2) return "Team name must be at least 2 characters.";
  if (t.length > 64) return "Team name must be at most 64 characters.";
  if (!/^[\w\s&'./-]+$/.test(t))
    return "Team name may only contain letters, numbers, spaces, and & ' . / -";
  return null;
}
