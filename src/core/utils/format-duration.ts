/**
 * Compact duration string for uptime and similar readings:
 * `15 d 14 h 26 m` → "15d 14h 26m". Empty leading units are dropped.
 */
export function formatUptime(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return '—';
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (totalMinutes > 0) return `${totalMinutes}m`;
  return '<1m';
}

/** Android reports "never" for screen timeouts as a very large millisecond value. */
const NEVER_TIMEOUT_MS = 2_147_000_000;

/** Screen-timeout style duration: "30 s", "10 min", "1 min 30 s" or "Never". */
export function formatTimeout(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '—';
  if (milliseconds >= NEVER_TIMEOUT_MS) return 'Never';
  const totalSeconds = Math.round(milliseconds / 1000);
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}
