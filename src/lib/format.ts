import type { Currency } from '../data/types';

/** Demo FX rate used for the group EUR toggle. Shown in the UI next to the toggle. */
export const GBP_TO_EUR = 1.16;

export type CurrencyMode = 'local' | 'group';

export function toEur(amount: number, currency: Currency): number {
  return currency === 'GBP' ? amount * GBP_TO_EUR : amount;
}

const SYMBOL: Record<Currency, string> = { EUR: '€', GBP: '£' };

/**
 * Format money. In group mode everything is converted to EUR.
 * compact: €1.2m / €480k.
 */
export function money(
  amount: number,
  currency: Currency = 'EUR',
  opts: { mode?: CurrencyMode; compact?: boolean; decimals?: number } = {},
): string {
  const { mode = 'local', compact = false } = opts;
  let cur = currency;
  let v = amount;
  if (mode === 'group' && currency !== 'EUR') {
    v = toEur(amount, currency);
    cur = 'EUR';
  }
  if (!Number.isFinite(v)) v = 0;
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  const sym = SYMBOL[cur];
  if (compact) {
    if (a >= 999_500) return `${sign}${sym}${(a / 1_000_000).toFixed(a >= 9_950_000 ? 1 : 2)}m`;
    if (a >= 10_000) return `${sign}${sym}${Math.round(a / 1000)}k`;
    if (a >= 1000) return `${sign}${sym}${(a / 1000).toFixed(1)}k`;
  }
  return `${sign}${sym}${a.toLocaleString('en-IE', { maximumFractionDigits: opts.decimals ?? 0, minimumFractionDigits: opts.decimals ?? 0 })}`;
}

/** Group EUR compact formatter for already-converted totals. */
export const eur = (v: number, compact = true) => money(v, 'EUR', { compact });

export function num(v: number, decimals = 0): string {
  if (!Number.isFinite(v)) v = 0;
  return v.toLocaleString('en-IE', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export function pct(v: number, decimals = 0): string {
  if (!Number.isFinite(v)) v = 0;
  return `${(v * 100).toFixed(decimals)}%`;
}

export function metres(v: number): string {
  return `${num(Math.round(v))} m`;
}

export function plural(n: number, one: string, many = one + 's') {
  return `${num(n)} ${n === 1 ? one : many}`;
}
