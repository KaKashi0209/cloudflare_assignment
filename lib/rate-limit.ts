const windows = new Map<string, { count: number; resetsAt: number }>();
export function takeRateLimit(key: string, maximum = 10, durationMs = 60_000): boolean {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetsAt < now) { windows.set(key, { count: 1, resetsAt: now + durationMs }); return true; }
  if (current.count >= maximum) return false;
  current.count += 1; return true;
}
