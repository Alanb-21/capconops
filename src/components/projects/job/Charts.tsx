import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Job } from '../../../data/types';
import { DESIGN } from '../../../data/seed';
import { weekLabel } from '../../../lib/dates';
import { num } from '../../../lib/format';
import { axisProps, CHART, ChartTooltip } from '../../charts';

export function MetresBySystemChart({ job }: { job: Job }) {
  const data = [
    { system: 'Siphonic', Installed: job.siphonicInstalled, Designed: job.siphonicDesigned },
    { system: 'Gravity', Installed: job.gravityInstalled, Designed: job.gravityDesigned },
  ];
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="system" {...axisProps} />
          <YAxis {...axisProps} width={44} tickFormatter={(v: number) => num(v)} />
          <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={<ChartTooltip format={(v) => `${num(v)} m`} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--c-ink-3)' }} />
          <Bar dataKey="Installed" fill={CHART.brand} radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false} />
          <Bar dataKey="Designed" fill={CHART.brand3} radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeklyInstalledChart({ job }: { job: Job }) {
  const data = [
    ...job.weeklyInstalled.map((v, i) => ({ week: weekLabel(i - 12), m: v, current: false })),
    { week: 'This wk', m: job.weekToDate, current: true },
  ];
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="week" {...axisProps} interval={1} />
          <YAxis {...axisProps} width={40} />
          <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={<ChartTooltip format={(v) => `${num(v)} m`} labelFormat={(l) => (l === 'This wk' ? 'This week to date' : `w/c ${l}`)} />} />
          <Bar dataKey="m" name="Installed" radius={[5, 5, 0, 0]} maxBarSize={26} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.week} fill={d.current ? CHART.brand2 : CHART.brand} fillOpacity={d.current ? 1 : 0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Design-only jobs: drawing clashes resolved over the last 8 weeks. */
export function ClashTrendChart({ job }: { job: Job }) {
  const rec = DESIGN.find((d) => d.jobId === job.id);
  const data = (rec?.clashTrend ?? []).map((v, i) => ({ week: weekLabel(i - 8), clashes: v }));
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="week" {...axisProps} />
          <YAxis {...axisProps} width={40} />
          <Tooltip content={<ChartTooltip labelFormat={(l) => `w/c ${l}`} />} />
          <Line dataKey="clashes" name="Open clashes" stroke={CHART.brand} strokeWidth={2.25} dot={{ r: 3, fill: CHART.brand }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DesignedSplitChart({ job }: { job: Job }) {
  const data = [
    { system: 'Siphonic', Designed: job.siphonicDesigned },
    { system: 'Gravity', Designed: job.gravityDesigned },
  ];
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke={CHART.grid} />
          <XAxis type="number" {...axisProps} tickFormatter={(v: number) => num(v)} />
          <YAxis type="category" dataKey="system" {...axisProps} width={64} />
          <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={<ChartTooltip format={(v) => `${num(v)} m`} />} />
          <Bar dataKey="Designed" radius={[0, 6, 6, 0]} maxBarSize={36} isAnimationActive={false}>
            <Cell fill={CHART.brand} />
            <Cell fill={CHART.brand2} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
