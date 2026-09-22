/** Indirection so callers don't invoke `Date.now()` directly during render. */
export function now(): number {
  return Date.now();
}

/** Two-letter initials for an avatar, e.g. "Priya Shah" -> "PS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "3h 12m" style duration between two instants, floored to the minute. */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Separate from formatDuration so call sites are clearly business minutes, not wall-clock.
export function formatBusinessMinutes(minutes: number): string {
  return formatDuration(minutes * 60_000);
}

/** Relative "age" of a timestamp against now, e.g. "2d 4h open". */
export function formatAge(iso: string): string {
  return formatDuration(now() - new Date(iso).getTime());
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
