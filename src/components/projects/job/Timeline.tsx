// Programme timeline: our forecast vs the main contractor programme, with
// a today marker and milestones. Plain flex/absolute layout, no chart lib.
import { Check, Diamond } from 'lucide-react';
import type { Job } from '../../../data/types';
import { daysUntil, fmtDate, isoAdd, MONTHS, parse, TODAY_ISO } from '../../../lib/dates';
import { clsx, healthColor } from '../../ui';
import { deltaLabel, deltaTone, programmeDelta, toneText } from '../shared';

export interface Milestone {
  name: string;
  date: string;
  done: boolean;
}

export function jobMilestones(j: Job): Milestone[] {
  if (j.id === 'CE-2291') {
    return [
      { name: 'Building 1 siphonic water test', date: '2026-09-30', done: true },
      { name: 'Building 2 roof handover (JPC rev 14)', date: '2026-10-12', done: false },
      { name: 'Building 2 siphonic water test', date: '2026-10-14', done: false },
      { name: 'Building 3 gravity complete', date: '2026-11-06', done: false },
      { name: 'Testing & commissioning complete', date: '2026-12-04', done: false },
      { name: 'Handover to John Paul Construction', date: j.forecastEnd, done: false },
    ];
  }
  const list: Milestone[] = [{ name: j.designOnly ? 'Design commission' : 'Start on site', date: j.start, done: j.start <= TODAY_ISO }];
  list.push({ name: j.nextMilestone.name, date: j.nextMilestone.date, done: j.nextMilestone.date < TODAY_ISO });
  if (!j.designOnly) {
    const tc = isoAdd(-28, j.forecastEnd);
    if (tc > j.nextMilestone.date && tc > j.start) list.push({ name: 'Testing & commissioning', date: tc, done: tc < TODAY_ISO });
    list.push({ name: 'Package complete', date: j.forecastEnd, done: j.forecastEnd < TODAY_ISO });
  } else {
    list.push({ name: 'Final design issue', date: j.forecastEnd, done: false });
  }
  const seen = new Set<string>();
  return list
    .filter((m) => (seen.has(m.name) ? false : (seen.add(m.name), true)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const t = (d: string) => parse(d.slice(0, 10)).getTime();

export function ProgrammeTimeline({ job, compact }: { job: Job; compact?: boolean }) {
  const ms = jobMilestones(job);
  const lo = Math.min(t(job.start), ...ms.map((m) => t(m.date)));
  const hi = Math.max(t(job.mcProgrammeEnd), t(job.forecastEnd), ...ms.map((m) => t(m.date)));
  const pad = (hi - lo) * 0.04 || 86_400_000 * 7;
  const from = lo - pad;
  const to = hi + pad;
  const pos = (d: string) => Math.max(0, Math.min(100, ((t(d) - from) / (to - from)) * 100));
  const today = pos(TODAY_ISO);
  const delta = programmeDelta(job);

  // month ticks (thin out for long jobs)
  const ticks: { label: string; at: number }[] = [];
  const d0 = new Date(from);
  const cur = new Date(d0.getFullYear(), d0.getMonth() + 1, 1);
  const months = Math.round((to - from) / (30 * 86_400_000));
  const every = months > 30 ? 6 : months > 14 ? 3 : 1;
  while (cur.getTime() < to) {
    if (cur.getMonth() % every === 0 || every === 1) {
      const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-01`;
      ticks.push({ label: `${MONTHS[cur.getMonth()]}${cur.getMonth() === 0 || every > 1 ? ` ${String(cur.getFullYear()).slice(2)}` : ''}`, at: pos(iso) });
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  const span = Math.max(1, t(job.forecastEnd) - t(job.start));
  const elapsed = Math.max(0, Math.min(1, (t(TODAY_ISO) - t(job.start)) / span));

  const Bar = ({ label, sub, start, end, color, progress }: { label: string; sub: string; start: string; end: string; color: string; progress?: number }) => (
    <div className="grid grid-cols-[150px_1fr] items-center gap-3">
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-medium text-ink">{label}</div>
        <div className="truncate text-[11px] text-ink-3 tnum">{sub}</div>
      </div>
      <div className="relative h-7">
        <div
          className="absolute top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full"
          style={{ left: `${pos(start)}%`, width: `${Math.max(0.5, pos(end) - pos(start))}%`, background: `color-mix(in srgb, ${color} 28%, transparent)` }}
        >
          {progress !== undefined && <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: color }} />}
        </div>
        <div className="absolute top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full" style={{ left: `calc(${pos(end)}% - 1px)`, background: color }} />
      </div>
    </div>
  );

  return (
    <div>
      <div className="relative">
        {/* month axis */}
        <div className="grid grid-cols-[150px_1fr] gap-3">
          <div />
          <div className="relative h-5 border-b hairline">
            {ticks.map((tk) => (
              <span key={tk.label + tk.at} className="absolute -translate-x-1/2 whitespace-nowrap text-[10.5px] text-ink-3" style={{ left: `${tk.at}%` }}>
                {tk.label}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          <Bar label={job.designOnly ? 'Client programme' : 'Main contractor'} sub={`${fmtDate(job.start)} → ${fmtDate(job.mcProgrammeEnd, { year: true })}`} start={job.start} end={job.mcProgrammeEnd} color="var(--c-ink-3)" />
          <Bar label="Our forecast" sub={`${fmtDate(job.start)} → ${fmtDate(job.forecastEnd, { year: true })}`} start={job.start} end={job.forecastEnd} color={healthColor(job.health)} progress={elapsed} />
          {/* milestones */}
          <div className="grid grid-cols-[150px_1fr] items-center gap-3">
            <div className="text-[12.5px] font-medium text-ink">Milestones</div>
            <div className="relative h-7">
              <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--c-hairline)]" />
              {ms.map((m) => (
                <span
                  key={m.name}
                  title={`${m.name} · ${fmtDate(m.date, { weekday: true })}`}
                  className={clsx('absolute top-1/2 -translate-x-1/2 -translate-y-1/2', m.done ? 'text-ok' : 'text-brand')}
                  style={{ left: `${pos(m.date)}%` }}
                >
                  <Diamond size={13} fill="currentColor" strokeWidth={1.5} />
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* today marker */}
        <div className="pointer-events-none absolute inset-y-0 grid grid-cols-[150px_1fr] gap-3" style={{ left: 0, right: 0 }}>
          <div />
          <div className="relative">
            <div className="absolute bottom-0 top-6 w-px bg-[var(--c-bad)] opacity-70" style={{ left: `${today}%` }} />
            <span className="absolute -bottom-4 -translate-x-1/2 rounded-full bg-bad-soft px-1.5 text-[10px] font-semibold text-bad" style={{ left: `${today}%` }}>
              Today
            </span>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-ink-3">
        <span>
          {job.designOnly ? 'Forecast vs client programme' : 'Forecast vs main contractor'}: <span className={clsx('font-semibold tnum', toneText[deltaTone(delta)])}>{deltaLabel(delta)}</span>
        </span>
        <span>
          Time elapsed <span className="font-semibold text-ink tnum">{Math.round(elapsed * 100)}%</span>
        </span>
      </div>

      {!compact && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {ms.map((m) => {
            const du = daysUntil(m.date);
            return (
              <div key={m.name} className="flex items-center gap-3 rounded-xl bg-sunk px-3 py-2">
                <span className={clsx('grid h-6 w-6 shrink-0 place-items-center rounded-full', m.done ? 'bg-ok-soft text-ok' : 'bg-brand-soft text-brand')}>
                  {m.done ? <Check size={13} /> : <Diamond size={11} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-ink">{m.name}</div>
                  <div className="text-[11.5px] text-ink-3 tnum">{fmtDate(m.date, { weekday: true, year: true })}</div>
                </div>
                <span className={clsx('shrink-0 text-[11.5px] tnum', m.done ? 'text-ok' : 'text-ink-3')}>
                  {m.done ? 'Done' : du === 0 ? 'Today' : du > 0 ? `in ${du}d` : `${-du}d ago`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
