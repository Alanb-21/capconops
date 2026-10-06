import { useMemo, useState, type DragEvent } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, CalendarClock, Clock, FileStack, Gauge, PiggyBank, Sparkles, Trophy, Users, XCircle } from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  Drawer,
  Kpi,
  Note,
  PageHeader,
  Pill,
  Progress,
  Stat,
  clsx,
  useMoney,
} from '../components/ui';
import { CHART, ChartTooltip, axisProps } from '../components/charts';
import { TakeoffAgentModal } from '../components/tenders/TakeoffAgent';
import { TAKEOFF_TENDER_ID } from '../components/tenders/takeoffData';
import { useStore } from '../store/useStore';
import { TENDER_STAGES, type Tender, type TenderStage } from '../data/types';
import { estimatorLoad, openTenders, pipelineValueEur, tendersClosingThisWeek, winRate, winRateByContractor, winRateBySector } from '../data/metrics';
import { eur, num, pct, toEur } from '../lib/format';
import { daysUntil, fmtDate } from '../lib/dates';

const CLOSED_SHOWN = 8;
const PRE_SUBMIT: TenderStage[] = ['Enquiry received', 'Drawings reviewed', 'Design / value engineering', 'Priced'];

/** People who price tenders. Aaron is the only full-time estimator; the others price on top of their main role. */
const ESTIMATORS: { name: string; note: string }[] = [
  { name: "Aaron O'Neill", note: 'Full-time estimator' },
  { name: 'Stephen Morris', note: 'Design-led tenders, alongside design' },
  { name: 'Colm Whitty', note: 'UK regional tenders' },
  { name: 'Donnacha Tobin', note: 'Key accounts' },
];
const WEEK_HOURS = 37.5;

function nextStage(s: TenderStage): TenderStage | null {
  if (s === 'Won' || s === 'Lost') return null;
  return TENDER_STAGES[TENDER_STAGES.indexOf(s) + 1] ?? null;
}

export default function Tenders() {
  const tenders = useStore((s) => s.tenders);
  const moveTender = useStore((s) => s.moveTender);
  const toast = useStore((s) => s.toast);
  const takeoffSent = useStore((s) => s.takeoffSent);
  const fmt = useMoney();

  const [takeoffOpen, setTakeoffOpen] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dragOver, setDragOver] = useState<TenderStage | null>(null);
  const sel = tenders.find((t) => t.id === selId) ?? null;

  const open = useMemo(() => openTenders(tenders), [tenders]);
  const kpis = useMemo(() => {
    const closingWeek = tendersClosingThisWeek(tenders);
    const ta = tenders.filter((t) => t.turnaroundDays !== undefined);
    const avgTa = ta.length ? ta.reduce((a, t) => a + (t.turnaroundDays ?? 0), 0) / ta.length : 0;
    const veWon = tenders.filter((t) => t.stage === 'Won').reduce((a, t) => a + toEur(t.veSaving, t.currency), 0);
    const won = tenders.filter((t) => t.stage === 'Won').length;
    const lost = tenders.filter((t) => t.stage === 'Lost').length;
    return { pipeline: pipelineValueEur(tenders), open: open.length, closingWeek, avgTa, veWon, won, lost, wr: winRate(tenders) };
  }, [tenders, open]);

  // ---------------------------------------------------------------- workload
  const workload = useMemo(() => {
    return ESTIMATORS.map((e) => {
      const { tenders: count, perWeek } = estimatorLoad(tenders, e.name);
      const mine = open.filter((t) => t.estimator === e.name && PRE_SUBMIT.includes(t.stage));
      return { ...e, capacity: WEEK_HOURS, tenders: count, perWeek, load: perWeek / WEEK_HOURS, closingSoon: mine.filter((t) => daysUntil(t.closeDate) <= 7).length };
    });
  }, [open, tenders]);
  const aaron = workload[0];

  // ---------------------------------------------------------------- charts
  const turnaround = useMemo(
    () =>
      tenders
        .filter((t) => t.turnaroundDays !== undefined)
        .sort((a, b) => b.closeDate.localeCompare(a.closeDate))
        .slice(0, 16)
        .reverse()
        .map((t) => ({ id: t.id.replace('TN-', ''), name: t.name, days: t.turnaroundDays ?? 0, stage: t.stage })),
    [tenders],
  );
  const bySector = useMemo(() => winRateBySector(tenders).sort((a, b) => b.rate - a.rate), [tenders]);
  const byMc = useMemo(() => winRateByContractor(tenders).slice(0, 8), [tenders]);
  const veBySector = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tenders) if (t.stage === 'Won') m.set(t.sector, (m.get(t.sector) ?? 0) + toEur(t.veSaving, t.currency));
    return [...m.entries()].map(([sector, v]) => ({ sector, v })).sort((a, b) => b.v - a.v);
  }, [tenders]);
  const veOffered = useMemo(() => open.reduce((a, t) => a + toEur(t.veSaving, t.currency), 0), [open]);

  // ---------------------------------------------------------------- kanban
  const columns = useMemo(
    () =>
      TENDER_STAGES.map((stage) => {
        const items = tenders.filter((t) => t.stage === stage);
        const closed = stage === 'Won' || stage === 'Lost';
        items.sort((a, b) => (closed ? b.closeDate.localeCompare(a.closeDate) : a.closeDate.localeCompare(b.closeDate)));
        // keep the agent's tender at the top of its column
        items.sort((a, b) => Number(b.id === TAKEOFF_TENDER_ID) - Number(a.id === TAKEOFF_TENDER_ID));
        const total = items.reduce((a, t) => a + toEur(t.value, t.currency), 0);
        return { stage, items, closed, total };
      }),
    [tenders],
  );

  const doMove = (t: Tender, to: TenderStage) => {
    if (t.stage === to) return;
    moveTender(t.id, to);
    toast({ title: `${t.name}`, detail: `Moved to ${to}`, tone: to === 'Lost' ? 'info' : 'success' });
  };

  const onDrop = (e: DragEvent, stage: TenderStage) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('application/x-tender');
    const t = tenders.find((x) => x.id === id);
    if (t) doMove(t, stage);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Estimating"
        title="Tenders & Estimating"
        subtitle="Every enquiry from first drawings to award, who is pricing it, and how we are converting."
        actions={
          <Button variant="primary" icon={<Sparkles size={15} />} onClick={() => setTakeoffOpen(true)} className="!h-10 !px-5" title="Run Takeoff Agent">
            Run Takeoff Agent
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Open pipeline" value={kpis.pipeline} format={(v) => eur(v)} sub="Group €, £1 = €1.16" icon={<FileStack size={15} />} />
        <Kpi label="Tenders open" value={kpis.open} sub={`${open.filter((t) => t.stage === 'Submitted').length} awaiting award`} icon={<Gauge size={15} />} delay={0.03} />
        <Kpi
          label="Closing this week"
          value={kpis.closingWeek.length}
          sub={`${kpis.closingWeek.filter((t) => t.estimator === "Aaron O'Neill").length} with Aaron, by Fri`}
          deltaTone="warn"
          delta={kpis.closingWeek.length ? 'due' : undefined}
          icon={<CalendarClock size={15} />}
          delay={0.06}
        />
        <Kpi label="Win rate, 12 months" value={kpis.wr * 100} format={(v) => `${Math.round(v)}%`} sub={`${kpis.won} won, ${kpis.lost} lost`} icon={<Trophy size={15} />} delay={0.09} />
        <Kpi label="Average turnaround" value={kpis.avgTa} format={(v) => `${v.toFixed(1)} days`} sub="Enquiry to submission" icon={<Clock size={15} />} delay={0.12} />
        <Kpi label="VE savings to clients" value={kpis.veWon} format={(v) => eur(v)} sub="On won tenders" icon={<PiggyBank size={15} />} delay={0.15} />
      </div>

      {/* Kanban */}
      <Card className="mt-5" delay={0.1}>
        <CardHeader
          title="Pipeline"
          subtitle="Click a tender for details. Drag a card to move it between stages."
          action={takeoffSent ? <Pill tone="brand" dot>Clonee Phase 3 priced by Takeoff Agent</Pill> : undefined}
        />
        <div className="grid grid-cols-7 gap-2.5">
          {columns.map((col) => {
            const showAll = expanded[col.stage];
            const shown = col.closed && !showAll ? col.items.slice(0, CLOSED_SHOWN) : col.items;
            const more = col.items.length - shown.length;
            return (
              <div
                key={col.stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(col.stage);
                }}
                onDragLeave={() => setDragOver((d) => (d === col.stage ? null : d))}
                onDrop={(e) => onDrop(e, col.stage)}
                className={clsx('flex min-w-0 flex-col rounded-2xl bg-sunk p-1.5 transition-colors', dragOver === col.stage && 'bg-brand-soft ring-1 ring-brand/40')}
              >
                <div className="px-1.5 pb-2 pt-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-[12px] font-semibold text-ink" title={col.stage}>
                      {col.stage === 'Design / value engineering' ? 'Design / VE' : col.stage}
                    </span>
                    <span className="shrink-0 rounded-full bg-surface-strong px-1.5 text-[11px] font-medium text-ink-2 tnum">{col.items.length}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-3 tnum">{eur(col.total)}</div>
                </div>
                <div className="scroll-thin flex max-h-[560px] flex-col gap-1.5 overflow-y-auto pr-0.5">
                  {shown.map((t) => (
                    <TenderCard key={t.id} t={t} onClick={() => setSelId(t.id)} fmt={fmt} />
                  ))}
                  {col.closed && col.items.length > CLOSED_SHOWN && (
                    <button
                      onClick={() => setExpanded((x) => ({ ...x, [col.stage]: !x[col.stage] }))}
                      className="rounded-xl px-2 py-2 text-[12px] font-medium text-brand hover:bg-surface-strong"
                    >
                      {showAll ? 'Show fewer' : `+${more} more`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Workload / win rates */}
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card delay={0.12}>
          <CardHeader title="Estimator workload" subtitle="Estimating hours needed per week, next two weeks, against a 37.5 h week" icon={<Users size={15} />} />
          <div className="rounded-2xl bg-bad-soft p-4">
            <div className="flex items-center gap-3">
              <Avatar name={aaron.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-ink">{aaron.name}</div>
                <div className="text-[12px] text-ink-2">
                  {aaron.tenders} live tenders, {aaron.closingSoon} closing within 7 days
                </div>
              </div>
              <div className="text-right">
                <div className="text-[26px] font-semibold leading-none text-bad tnum">{pct(aaron.load)}</div>
                <div className="mt-1 text-[11px] text-ink-3">of capacity</div>
              </div>
            </div>
            <div className="relative mt-4">
              <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
                <motion.div
                  className="h-full rounded-l-full bg-brand"
                  initial={{ width: 0 }}
                  animate={{ width: `${(1 / Math.max(1, aaron.load)) * 100}%` }}
                  transition={{ duration: 0.8 }}
                />
                <motion.div className="h-full flex-1 rounded-r-full bg-bad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.4 }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11.5px] text-ink-2 tnum">
                <span>
                  Needs <b className="text-ink">{num(aaron.perWeek, 1)} h</b> a week
                </span>
                <span>Capacity {aaron.capacity} h</span>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-ink-2">
              One person is carrying {Math.round((aaron.tenders / Math.max(1, open.filter((t) => PRE_SUBMIT.includes(t.stage)).length)) * 100)}% of live tenders. The Takeoff Agent
              does the measuring so Aaron only checks and prices.
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {workload.slice(1).map((w) => (
              <div key={w.name} className="flex items-center gap-3">
                <Avatar name={w.name} size={26} tone="neutral" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-ink">{w.name}</span>
                    <span className="shrink-0 text-[12px] text-ink-2 tnum">
                      {num(w.perWeek, 1)} h · {pct(w.load)}
                    </span>
                  </div>
                  <Progress value={w.load} tone={w.load > 1 ? 'warn' : 'accent'} className="mt-1" />
                  <div className="mt-0.5 text-[11px] text-ink-3">
                    {w.tenders} tenders · {w.note}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card delay={0.15}>
          <CardHeader title="Win rate by sector" subtitle="Won vs lost, last 12 months" icon={<Trophy size={15} />} />
          <div className="h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySector.map((s) => ({ ...s, ratePct: Math.round(s.rate * 100) }))} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={CHART.grid} />
                <XAxis type="number" domain={[0, 100]} {...axisProps} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="sector" width={104} {...axisProps} />
                <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={<ChartTooltip format={(v) => `${v}%`} />} />
                <ReferenceLine x={Math.round(kpis.wr * 100)} stroke={CHART.muted} strokeDasharray="3 3" />
                <Bar dataKey="ratePct" name="Win rate" radius={[0, 6, 6, 0]} barSize={14}>
                  {bySector.map((s) => (
                    <Cell key={s.sector} fill={s.rate >= kpis.wr ? CHART.brand : CHART.brand3} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Note>Dashed line: group win rate {pct(kpis.wr)}.</Note>
        </Card>

        <Card delay={0.18}>
          <CardHeader title="Win rate by main contractor" subtitle="Top 8, decided tenders" icon={<Users size={15} />} />
          <div className="space-y-3">
            {byMc.map((m) => (
              <div key={m.mc}>
                <div className="flex items-baseline justify-between gap-2 text-[13px]">
                  <span className="truncate font-medium text-ink">{m.mc}</span>
                  <span className="shrink-0 text-ink-2 tnum">
                    {pct(m.rate)} <span className="text-ink-3">({m.won}/{m.won + m.lost})</span>
                  </span>
                </div>
                <Progress value={m.rate} className="mt-1" tone={m.rate >= kpis.wr ? 'brand' : 'accent'} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2" delay={0.2}>
          <CardHeader title="Turnaround per tender" subtitle="Days from enquiry to submission, 16 most recent decided or submitted tenders" icon={<Clock size={15} />} />
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={turnaround} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="id" {...axisProps} interval={0} />
                <YAxis {...axisProps} />
                <Tooltip
                  cursor={{ fill: 'var(--c-surface-sunk)' }}
                  content={<ChartTooltip format={(v) => `${v} days`} labelFormat={(l) => turnaround.find((x) => x.id === l)?.name ?? l} />}
                />
                <ReferenceLine y={kpis.avgTa} stroke={CHART.muted} strokeDasharray="3 3" />
                <Bar dataKey="days" name="Turnaround" radius={[6, 6, 0, 0]} barSize={22}>
                  {turnaround.map((t) => (
                    <Cell key={t.id} fill={t.stage === 'Won' ? CHART.brand : t.stage === 'Lost' ? CHART.brand3 : CHART.brand2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-ink-3">
            <Legend color={CHART.brand} label="Won" />
            <Legend color={CHART.brand3} label="Lost" />
            <Legend color={CHART.brand2} label="Submitted" />
            <span>Dashed line: average {kpis.avgTa.toFixed(1)} days</span>
          </div>
        </Card>

        <Card delay={0.22}>
          <CardHeader title="Value engineering" subtitle="Savings offered to clients through our design" icon={<PiggyBank size={15} />} />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Delivered on won tenders" value={eur(kpis.veWon)} sub={`${kpis.won} projects`} />
            <Stat label="Offered in open pipeline" value={eur(veOffered)} sub={`${kpis.open} tenders`} />
          </div>
          <div className="mt-4 space-y-2.5">
            {veBySector.slice(0, 6).map((s) => (
              <div key={s.sector}>
                <div className="flex justify-between text-[12.5px]">
                  <span className="text-ink-2">{s.sector}</span>
                  <span className="font-medium text-ink tnum">{eur(s.v)}</span>
                </div>
                <Progress value={veBySector[0] ? s.v / veBySector[0].v : 0} tone="accent" className="mt-1" height={5} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <TenderDrawer t={sel} onClose={() => setSelId(null)} onMove={doMove} fmt={fmt} />
      <TakeoffAgentModal open={takeoffOpen} onClose={() => setTakeoffOpen(false)} />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function TenderCard({ t, onClick, fmt }: { t: Tender; onClick: () => void; fmt: ReturnType<typeof useMoney> }) {
  const d = daysUntil(t.closeDate);
  const urgent = PRE_SUBMIT.includes(t.stage) && d >= 0 && d <= 7;
  const isAgent = t.id === TAKEOFF_TENDER_ID;
  return (
    <motion.div layout="position" initial={false}>
    <button
      type="button"
      draggable
      onDragStart={(e) => e.dataTransfer.setData('application/x-tender', t.id)}
      onClick={onClick}
      className={clsx(
        'glass-strong w-full min-w-0 cursor-pointer rounded-xl p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md',
        isAgent && 'ring-2 ring-brand',
      )}
    >
      {isAgent && (
        <div className="mb-1.5 flex items-center gap-1 text-[10.5px] font-semibold text-brand">
          <Sparkles size={11} /> Takeoff Agent
        </div>
      )}
      <div className="line-clamp-2 text-[12.5px] font-medium leading-snug text-ink">{t.name}</div>
      <div className={clsx('mt-0.5 truncate text-[11.5px]', t.mainContractor === 'Undisclosed' ? 'italic text-ink-3' : 'text-ink-3')}>{t.mainContractor}</div>
      <div className="mt-1.5 text-[13px] font-semibold text-ink tnum">{fmt(t.value, t.currency, true)}</div>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className={clsx('truncate text-[11px] tnum', urgent ? 'font-semibold text-warn' : 'text-ink-3')}>
          {urgent ? `Closes ${d === 0 ? 'today' : `in ${d}d`}` : fmtDate(t.closeDate)}
        </span>
        <span title={t.estimator}>
          <Avatar name={t.estimator} size={20} tone={t.estimator === "Aaron O'Neill" ? 'brand' : 'neutral'} />
        </span>
      </div>
      <div className="mt-1.5">
        <span className="inline-block max-w-full truncate rounded-full bg-sunk px-2 py-0.5 text-[10.5px] font-medium text-ink-2">{t.sector}</span>
      </div>
    </button>
    </motion.div>
  );
}

function TenderDrawer({
  t,
  onClose,
  onMove,
  fmt,
}: {
  t: Tender | null;
  onClose: () => void;
  onMove: (t: Tender, to: TenderStage) => void;
  fmt: ReturnType<typeof useMoney>;
}) {
  const next = t ? nextStage(t.stage) : null;
  const d = t ? daysUntil(t.closeDate) : 0;
  return (
    <Drawer open={!!t} onClose={onClose} title={t?.name ?? ''} subtitle={t ? `${t.id} · ${t.location}` : undefined}>
      {t && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={t.stage === 'Won' ? 'ok' : t.stage === 'Lost' ? 'neutral' : 'brand'} dot>
              {t.stage}
            </Pill>
            <Pill>{t.sector}</Pill>
            <Pill>{t.system}</Pill>
            {t.id === TAKEOFF_TENDER_ID && (
              <Pill tone="accent">
                <Sparkles size={11} /> Measured by Takeoff Agent
              </Pill>
            )}
          </div>

          <div className="rounded-2xl bg-sunk p-4">
            <div className="text-[12px] text-ink-3">Tender value</div>
            <div className="text-[28px] font-semibold tracking-[-0.02em] text-ink tnum">{fmt(t.value, t.currency)}</div>
            <div className="mt-1 text-[12.5px] text-ink-2">
              Value engineering offered: <b className="text-ink tnum">{fmt(t.veSaving, t.currency)}</b>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Stat label="Main contractor" value={<span className={t.mainContractor === 'Undisclosed' ? 'text-ink-3' : ''}>{t.mainContractor}</span>} />
            <Stat label="Consultant" value={t.consultant ?? <span className="text-ink-3">Not named</span>} />
            <Stat label="Received" value={fmtDate(t.received, { year: true })} />
            <Stat
              label="Close date"
              value={<span className={PRE_SUBMIT.includes(t.stage) && d >= 0 && d <= 7 ? 'text-warn' : ''}>{fmtDate(t.closeDate, { weekday: true, year: true })}</span>}
              sub={PRE_SUBMIT.includes(t.stage) ? (d >= 0 ? `${d} days to go` : `${-d} days ago`) : undefined}
            />
            <Stat label="Roof area" value={`${num(t.roofArea)} m²`} />
            <Stat label="Estimating hours" value={`${t.hoursEstimate} h`} />
            {t.turnaroundDays !== undefined && <Stat label="Turnaround" value={`${t.turnaroundDays} days`} />}
          </div>

          <div className="flex items-center gap-3 rounded-2xl border hairline p-3">
            <Avatar name={t.estimator} size={34} />
            <div>
              <div className="text-[13.5px] font-medium text-ink">{t.estimator}</div>
              <div className="text-[12px] text-ink-3">Estimator</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t hairline pt-4">
            {next ? (
              <Button variant="primary" icon={<ArrowRight size={15} />} onClick={() => onMove(t, next)}>
                Move to next stage: {next}
              </Button>
            ) : (
              <span className="text-[13px] text-ink-3">Decided. {t.stage === 'Won' ? 'Handed to Projects for set-up.' : 'Kept for win/loss analysis.'}</span>
            )}
            {t.stage === 'Submitted' && (
              <Button variant="danger" icon={<XCircle size={15} />} onClick={() => onMove(t, 'Lost')}>
                Mark as lost
              </Button>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
