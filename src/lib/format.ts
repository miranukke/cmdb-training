/** The UI is English, so dates are too (the browser locale would mix languages). */
export const UI_LOCALE = 'en-GB';

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return h ? `${h}:${mm}:${String(sec).padStart(2, '0')}` : `${mm}:${String(sec).padStart(2, '0')}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(UI_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(UI_LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);
