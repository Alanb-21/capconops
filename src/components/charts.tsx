// Shared Recharts styling. Use CHART colours (CSS vars) so light/dark both work.
import type { ReactNode } from 'react';

export const CHART = {
  brand: 'var(--c-brand)',
  brand2: 'var(--c-brand-2)',
  brand3: 'var(--c-brand-3)',
  muted: 'var(--c-ink-3)',
  ok: 'var(--c-ok)',
  warn: 'var(--c-warn)',
  bad: 'var(--c-bad)',
  grid: 'var(--c-hairline)',
};

export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 11, fill: 'var(--c-ink-3)' },
} as const;

interface TooltipPayload {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

export function ChartTooltip({
  active,
  payload,
  label,
  format,
  labelFormat,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  format?: (v: number, name?: string) => string;
  labelFormat?: (l: string | number) => ReactNode;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-[12px] shadow-lg">
      {label !== undefined && <div className="mb-1 font-medium text-ink">{labelFormat ? labelFormat(label) : label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto pl-3 font-medium text-ink tnum">
            {typeof p.value === 'number' ? (format ? format(p.value, String(p.name)) : p.value.toLocaleString('en-IE')) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}
