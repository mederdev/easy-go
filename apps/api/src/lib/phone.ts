/** Normalize a loose phone into "+<digits>". Keeps a single leading +. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  return `+${digits}`;
}
