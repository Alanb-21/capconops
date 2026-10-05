// The demo runs on a fixed clock so numbers never drift between rehearsal and
// the live call. "Today" is Tuesday 6 October 2026.
export const TODAY = new Date('2026-10-06T08:30:00');
export const TODAY_ISO = '2026-10-06';

const DAY = 86_400_000;

export function addDays(d: Date | string, n: number): Date {
  const base = typeof d === 'string' ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')) : d;
  return new Date(base.getTime() + n * DAY);
}

export function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isoAdd(n: number, from: Date | string = TODAY): string {
  return iso(addDays(from, n));
}

export function parse(d: string): Date {
  return new Date(d.length === 10 ? d + 'T00:00:00' : d);
}

/** Whole days from today until d (negative = past). */
export function daysUntil(d: string): number {
  const a = parse(iso(TODAY)).getTime();
  const b = parse(d.slice(0, 10)).getTime();
  return Math.round((b - a) / DAY);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b.slice(0, 10)).getTime() - parse(a.slice(0, 10)).getTime()) / DAY);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function fmtDate(d: string, opts: { year?: boolean; weekday?: boolean } = {}): string {
  const x = parse(d);
  let s = `${x.getDate()} ${MONTHS[x.getMonth()]}`;
  if (opts.year) s += ` ${x.getFullYear()}`;
  if (opts.weekday) s = `${WD[x.getDay()]} ${s}`;
  return s;
}

export function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

export function fmtTime(d: string): string {
  const x = parse(d);
  return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
}

/** "2h ago", "yesterday", "3 days ago" relative to the demo clock. */
export function ago(d: string, now: Date = TODAY): string {
  const diff = (now.getTime() - parse(d).getTime()) / 60000;
  if (diff < 1) return 'just now';
  if (diff < 60) return `${Math.round(diff)} min ago`;
  if (diff < 60 * 24) return `${Math.round(diff / 60)}h ago`;
  const days = Math.round(diff / (60 * 24));
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** Monday of the demo week. */
export const WEEK_START = '2026-10-05';

export function weekLabel(offsetFromThisWeek: number): string {
  const d = addDays(WEEK_START, offsetFromThisWeek * 7);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export { MONTHS };
