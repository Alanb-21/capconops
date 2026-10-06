import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, Box, Calculator, CloudCog, FileText, Layers, MessageSquareText, PenTool, Timer, Users } from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  Kpi,
  Note,
  PageHeader,
  Pill,
  Progress,
  Sparkline,
  Stat,
  Table,
  Td,
  Th,
  Tr,
  clsx,
  type Tone,
} from '../components/ui';
import { CHART, ChartTooltip, axisProps } from '../components/charts';
import { useStore } from '../store/useStore';
import { DESIGN, DRAWINGS, RFIS } from '../data/seed';
import type { DesignRecord, Drawing, Job } from '../data/types';
import { num, pct } from '../lib/format';
import { daysBetween, daysUntil, fmtDate, weekLabel } from '../lib/dates';

const HIGHLIGHTS = ['CE-2337', 'CE-2304'];

const drawingTone = (s: Drawing['status']): Tone =>
  s === 'For construction' ? 'brand' : s === 'As built' ? 'ok' : s === 'For comment' ? 'accent' : 'neutral';
const calcTone = (s: DesignRecord['hydraulicCalcs']): Tone => (s === 'Approved' ? 'ok' : s === 'Checked' ? 'brand' : s === 'In progress' ? 'accent' : 'neutral');
const signTone = (s: DesignRecord['signOff']): Tone => (s === 'Client approved' ? 'ok' : s === 'Internal' ? 'brand' : 'neutral');
const revNum = (rev: string) => {
  const n = parseInt(rev.replace(/\D/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};
const hoursPct = (d: DesignRecord) => (d.designHoursBudget > 0 ? d.designHoursUsed / d.designHoursBudget : 0);

type SortKey = 'job' | 'designer' | 'calcs' | 'signoff' | 'bim' | 'rfis' | 'hours';
const CALC_ORDER = ['Not started', 'In progress', 'Checked', 'Approved'];
const SIGN_ORDER = ['Pending', 'Internal', 'Client approved'];
const BIM_ORDER = ['Not required', 'LOD 300', 'LOD 350', 'LOD 400', 'As built'];

export default function Design() {
  const jobs = useStore((s) => s.jobs);
  const toast = useStore((s) => s.toast);
  const [selId, setSelId] = useState('CE-2337');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'hours', dir: -1 });
  const registerRef = useRef<HTMLDivElement>(null);

  const jobMap = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const drawingsBy = useMemo(() => {
    const m = new Map<string, Drawing[]>();
    for (const d of DRAWINGS) m.set(d.jobId, [...(m.get(d.jobId) ?? []), d]);
    return m;
  }, []);
  const rfisBy = useMemo(() => {
    const m = new Map<string, typeof RFIS>();
    for (const r of RFIS) m.set(r.jobId, [...(m.get(r.jobId) ?? []), r]);
    return m;
  }, []);

  const rows = useMemo(
    () =>
      DESIGN.filter((d) => jobMap.has(d.jobId)).map((d) => {
        const job = jobMap.get(d.jobId)!;
        const rf = rfisBy.get(d.jobId) ?? [];
        return { d, job, openRfis: rf.filter((r) => r.status === 'Open').length, drawings: (drawingsBy.get(d.jobId) ?? []).length };
      }),
    [jobMap, rfisBy, drawingsBy],
  );

  const kpis = useMemo(() => {
    const inDesign = rows.filter((r) => r.job.stage === 'Design' || r.job.designOnly);
    const used = rows.reduce((a, r) => a + r.d.designHoursUsed, 0);
    const budget = rows.reduce((a, r) => a + r.d.designHoursBudget, 0);
    const pendingCalcs = rows.filter((r) => r.d.hydraulicCalcs !== 'Approved').length;
    return {
      inDesign: inDesign.length,
      drawings: DRAWINGS.filter((d) => d.status !== 'Superseded').length,
      forComment: DRAWINGS.filter((d) => d.status === 'For comment').length,
      openRfis: RFIS.filter((r) => r.status === 'Open').length,
      over: rows.filter((r) => hoursPct(r.d) > 1).length,
      hoursPct: budget > 0 ? used / budget : 0,
      pendingCalcs,
    };
  }, [rows]);

  const sorted = useMemo(() => {
    const val = (r: (typeof rows)[number]): string | number => {
      switch (sort.key) {
        case 'job':
          return r.job.name;
        case 'designer':
          return r.d.designer;
        case 'calcs':
          return CALC_ORDER.indexOf(r.d.hydraulicCalcs);
        case 'signoff':
          return SIGN_ORDER.indexOf(r.d.signOff);
        case 'bim':
          return BIM_ORDER.indexOf(r.d.bimStatus);
        case 'rfis':
          return r.openRfis;
        case 'hours':
          return hoursPct(r.d);
      }
    };
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return c * sort.dir;
    });
  }, [rows, sort]);

  const designers = useMemo(() => {
    const names = [...new Set(DESIGN.map((d) => d.designer))];
    return names
      .map((name) => {
        const mine = rows.filter((r) => r.d.designer === name);
        const active = mine.filter((r) => r.job.stage === 'Design' || r.job.designOnly);
        const remaining = active.reduce((a, r) => a + Math.max(0, r.d.designHoursBudget - r.d.designHoursUsed), 0);
        const used = mine.reduce((a, r) => a + r.d.designHoursUsed, 0);
        const budget = mine.reduce((a, r) => a + r.d.designHoursBudget, 0);
        return { name, jobs: mine.length, active: active.length, remaining, ratio: budget > 0 ? used / budget : 0 };
      })
      .sort((a, b) => b.remaining - a.remaining);
  }, [rows]);
  const maxRemaining = Math.max(1, ...designers.map((d) => d.remaining));

  const select = (id: string) => {
    setSelId(id);
    registerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sel = rows.find((r) => r.d.jobId === selId) ?? rows[0];
  const sortHead = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => (
    <Th align={align}>
      <button
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'job' || key === 'designer' ? 1 : -1 }))}
        className={clsx('inline-flex items-center gap-1 uppercase hover:text-ink', sort.key === key && 'text-ink')}
      >
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </Th>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Design"
        title="Design & BIM"
        subtitle="Drawings, hydraulic calculations, BIM models, clashes and RFIs for every job, with design hours against budget."
        actions={
          <Button
            icon={<CloudCog size={15} />}
            onClick={() =>
              toast({ title: 'Autodesk Construction Cloud', detail: 'Example connection: model and drawing register sync confirmed on discovery.', tone: 'info' })
            }
          >
            Sync with ACC
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Jobs in design" value={kpis.inDesign} sub={`${kpis.pendingCalcs} with calcs not yet approved`} icon={<PenTool size={15} />} />
        <Kpi label="Live drawings" value={kpis.drawings} sub={`${kpis.forComment} out for comment`} icon={<FileText size={15} />} delay={0.03} />
        <Kpi label="Open RFIs" value={kpis.openRfis} sub="Raised by Capcon, awaiting answer" icon={<MessageSquareText size={15} />} delay={0.06} />
        <Kpi
          label="Design hours used"
          value={kpis.hoursPct * 100}
          format={(v) => `${Math.round(v)}%`}
          sub="Across all jobs, against budget"
          deltaTone={kpis.over ? 'warn' : 'ok'}
          delta={kpis.over ? `${kpis.over} over` : undefined}
          icon={<Timer size={15} />}
          delay={0.09}
        />
      </div>

      {/* highlight cards */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {HIGHLIGHTS.map((id, i) => {
          const r = rows.find((x) => x.d.jobId === id);
          if (!r) return null;
          return <HighlightCard key={id} row={r} drawings={drawingsBy.get(id) ?? []} rfis={rfisBy.get(id) ?? []} onOpen={() => select(id)} delay={0.08 + i * 0.04} />;
        })}
      </div>

      {/* register */}
      <div ref={registerRef} className="scroll-mt-4">
        <Card className="mt-5" delay={0.12}>
          <CardHeader
            title="Design register"
            subtitle={sel ? `${sel.job.id} · ${sel.job.name} · ${sel.d.designer}` : undefined}
            icon={<Layers size={15} />}
            action={
              <div className="flex flex-wrap items-center gap-2">
                {HIGHLIGHTS.map((id) => (
                  <button
                    key={id}
                    onClick={() => setSelId(id)}
                    className={clsx('rounded-full px-3 py-1 text-[12px] font-medium transition', selId === id ? 'bg-brand text-white dark:text-[#06101e]' : 'bg-sunk text-ink-2 hover:text-ink')}
                  >
                    {jobMap.get(id)?.shortName ?? id}
                  </button>
                ))}
                <select
                  value={selId}
                  onChange={(e) => setSelId(e.target.value)}
                  aria-label="Select job"
                  className="h-8 max-w-[260px] rounded-full border hairline bg-sunk px-3 text-[12.5px] text-ink outline-none [&>option]:bg-[var(--c-bg)] [&>option]:text-[var(--c-ink)]"
                >
                  {[...rows]
                    .sort((a, b) => a.job.name.localeCompare(b.job.name))
                    .map((r) => (
                      <option key={r.d.jobId} value={r.d.jobId}>
                        {r.job.id} · {r.job.name}
                      </option>
                    ))}
                </select>
              </div>
            }
          />
          {sel && <Register row={sel} drawings={drawingsBy.get(sel.d.jobId) ?? []} rfis={rfisBy.get(sel.d.jobId) ?? []} />}
        </Card>
      </div>

      {/* portfolio + designers */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card className="xl:col-span-2" delay={0.14}>
          <CardHeader title="Portfolio overview" subtitle={`All ${rows.length} jobs. Click a heading to sort, a row to open its register.`} icon={<Box size={15} />} />
          <Table className="max-h-[520px] overflow-y-auto">
            <thead>
              <tr className="[&>th]:bg-surface-strong">
                {sortHead('job', 'Job')}
                {sortHead('designer', 'Designer')}
                {sortHead('calcs', 'Calcs')}
                {sortHead('signoff', 'Sign-off')}
                {sortHead('bim', 'BIM')}
                {sortHead('rfis', 'RFIs', 'right')}
                {sortHead('hours', 'Hours', 'right')}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const hp = hoursPct(r.d);
                return (
                  <Tr key={r.d.jobId} onClick={() => select(r.d.jobId)} highlight={r.d.jobId === selId}>
                    <Td className="max-w-[320px]">
                      <div className="truncate font-medium text-ink">{r.job.name}</div>
                      <div className="text-[11.5px] text-ink-3">
                        {r.job.id} · {r.job.designOnly ? 'Design only' : r.job.stage}
                      </div>
                    </Td>
                    <Td className="max-w-[200px] truncate">{r.d.designer}</Td>
                    <Td>
                      <Pill tone={calcTone(r.d.hydraulicCalcs)}>{r.d.hydraulicCalcs}</Pill>
                    </Td>
                    <Td>
                      <Pill tone={signTone(r.d.signOff)}>{r.d.signOff}</Pill>
                    </Td>
                    <Td className="whitespace-nowrap">{r.d.bimStatus}</Td>
                    <Td align="right">{r.openRfis ? <span className="font-medium text-ink">{r.openRfis}</span> : <span className="text-ink-3">0</span>}</Td>
                    <Td align="right">
                      <div className="ml-auto w-[96px]">
                        <div className={clsx('text-[12px] tnum', hp > 1 ? 'font-semibold text-warn' : 'text-ink-2')}>
                          {num(r.d.designHoursUsed)} / {num(r.d.designHoursBudget)} h
                        </div>
                        <Progress value={hp} tone={hp > 1 ? 'warn' : 'brand'} height={4} className="mt-1" />
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>

        <>
          <Card delay={0.16}>
            <CardHeader title="Designer workload" subtitle="Design hours still to spend on jobs in design" icon={<Users size={15} />} />
            <div className="space-y-4">
              {designers.map((d) => (
                <div key={d.name} className="flex items-start gap-3">
                  <Avatar name={d.name.replace('Design team ', '').replace(/[()]/g, '')} size={30} tone={d.name.startsWith('Design team') ? 'neutral' : 'brand'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">{d.name}</span>
                      <span className="shrink-0 text-[12.5px] font-semibold text-ink tnum">{num(d.remaining)} h</span>
                    </div>
                    <Progress value={d.remaining / maxRemaining} tone="accent" className="mt-1" />
                    <div className="mt-1 text-[11.5px] text-ink-3">
                      {d.active} in design · {d.jobs} jobs in total · {pct(d.ratio)} of budget used
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card delay={0.18}>
            <CardHeader title="BIM and model sync" icon={<CloudCog size={15} />} />
            <div className="space-y-3 text-[13px] text-ink-2">
              <p>
                Design to <b className="text-ink">BIM Level 2</b> (ISO 19650). Siphonic and gravity models authored in <b className="text-ink">Revit</b>, published to{' '}
                <b className="text-ink">Autodesk Construction Cloud</b> for clash detection with the main contractor’s federated model.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <SyncItem label="Drawing register" detail="Revisions and status" />
                <SyncItem label="Clash reports" detail="Weekly counts" />
                <SyncItem label="RFIs" detail="Two-way with ACC" />
                <SyncItem label="Model LOD" detail="Per job" />
              </div>
              <Note>Example connection, confirmed on discovery.</Note>
            </div>
          </Card>
        </>
      </div>
    </div>
  );
}

function SyncItem({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-xl bg-sunk px-3 py-2">
      <div className="text-[12.5px] font-medium text-ink">{label}</div>
      <div className="text-[11.5px] text-ink-3">{detail}</div>
    </div>
  );
}

interface Row {
  d: DesignRecord;
  job: Job;
  openRfis: number;
  drawings: number;
}

function HighlightCard({ row, drawings, rfis, onOpen, delay }: { row: Row; drawings: Drawing[]; rfis: typeof RFIS; onOpen: () => void; delay: number }) {
  const { d, job } = row;
  const hp = hoursPct(d);
  const revs = drawings.reduce((a, x) => a + revNum(x.rev) + 1, 0);
  const first = d.clashTrend[0] ?? 0;
  const last = d.clashTrend[d.clashTrend.length - 1] ?? 0;
  const drop = first > 0 ? (first - last) / first : 0;
  const open = rfis.filter((r) => r.status === 'Open').length;
  return (
    <Card delay={delay} onClick={onOpen} strong>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-ink-3">{job.id}</span>
            {job.designOnly ? <Pill tone="brand">Design only</Pill> : <Pill>{job.stage}</Pill>}
            {job.consultant && <Pill tone="accent">with {job.consultant}</Pill>}
          </div>
          <h3 className="mt-1.5 truncate text-[19px] font-semibold tracking-[-0.02em] text-ink">{job.name}</h3>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {job.id === 'CE-2337'
              ? 'Capcon is lead consultant for the siphonic roof design'
              : `${job.location} · ${num(job.roofArea)} m² roof · ${job.system}`}
          </p>
        </div>
        <Avatar name={d.designer} size={32} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        <Stat label="Drawings" value={num(drawings.length)} />
        <Stat label="Revisions issued" value={num(revs)} />
        <Stat label="BIM" value={d.bimStatus} />
        <Stat label="Open RFIs" value={<span className={open ? 'text-warn' : ''}>{open}</span>} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-sunk p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-ink-3">Clashes, 8 weeks</span>
            <span className="text-[11.5px] font-medium text-ok tnum">−{pct(drop)}</span>
          </div>
          <div className="mt-1 flex items-end justify-between gap-2">
            <span className="text-[20px] font-semibold text-ink tnum">{last}</span>
            <Sparkline data={d.clashTrend} width={120} height={32} />
          </div>
        </div>
        <div className="rounded-2xl bg-sunk p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-medium text-ink-3">Design hours</span>
            <span className={clsx('text-[11.5px] font-medium tnum', hp > 1 ? 'text-warn' : 'text-ink-3')}>{pct(hp)}</span>
          </div>
          <div className="mt-1 text-[14px] font-semibold text-ink tnum">
            {num(d.designHoursUsed)} <span className="font-normal text-ink-3">/ {num(d.designHoursBudget)} h</span>
          </div>
          <Progress value={hp} tone={hp > 1 ? 'warn' : 'brand'} className="mt-2" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="inline-flex items-center gap-1.5 text-ink-3">
          <Calculator size={13} /> Hydraulic calcs
        </span>
        <Pill tone={calcTone(d.hydraulicCalcs)}>{d.hydraulicCalcs}</Pill>
        <span className="ml-2 text-ink-3">Sign-off</span>
        <Pill tone={signTone(d.signOff)}>{d.signOff}</Pill>
        {job.healthReason && job.id === 'CE-2304' && <span className="w-full truncate pt-1 text-ink-3">{job.healthReason}</span>}
      </div>
    </Card>
  );
}

function Register({ row, drawings, rfis }: { row: Row; drawings: Drawing[]; rfis: typeof RFIS }) {
  const { d } = row;
  const hp = hoursPct(d);
  const sortedDr = [...drawings].sort((a, b) => a.number.localeCompare(b.number));
  const clash = d.clashTrend.map((v, i) => ({ week: weekLabel(i - d.clashTrend.length + 1), clashes: v }));
  const open = rfis.filter((r) => r.status === 'Open');
  const answered = rfis.filter((r) => r.status === 'Answered');
  const orderedRfis = [...open, ...answered];
  return (
    <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">Drawings ({drawings.length})</span>
        </div>
        <Table className="max-h-[440px] overflow-y-auto">
          <thead>
            <tr className="[&>th]:bg-surface-strong">
              <Th>Number</Th>
              <Th>Title</Th>
              <Th>Rev</Th>
              <Th>Status</Th>
              <Th align="right">Date</Th>
            </tr>
          </thead>
          <tbody>
            {sortedDr.map((x) => (
              <Tr key={x.id}>
                <Td className="whitespace-nowrap font-medium text-ink tnum">{x.number}</Td>
                <Td className="max-w-[260px] truncate">{x.title}</Td>
                <Td className="tnum">{x.rev}</Td>
                <Td>
                  <Pill tone={drawingTone(x.status)} className={x.status === 'Superseded' ? 'line-through opacity-70' : ''}>
                    {x.status}
                  </Pill>
                </Td>
                <Td align="right" className="whitespace-nowrap">
                  {fmtDate(x.date)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <StatusBox label="Hydraulic calcs" icon={<Calculator size={13} />}>
            <Pill tone={calcTone(d.hydraulicCalcs)}>{d.hydraulicCalcs}</Pill>
          </StatusBox>
          <StatusBox label="Design sign-off" icon={<PenTool size={13} />}>
            <Pill tone={signTone(d.signOff)}>{d.signOff}</Pill>
          </StatusBox>
          <StatusBox label="BIM model" icon={<Box size={13} />}>
            <Pill tone={d.bimStatus === 'Not required' ? 'neutral' : 'brand'}>{d.bimStatus}</Pill>
          </StatusBox>
        </div>

        <div className="rounded-2xl border hairline p-3">
          <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="font-medium text-ink">Clash count, last 8 weeks</span>
            <span className="text-ink-3 tnum">
              {d.clashTrend[0]} → {d.clashTrend[d.clashTrend.length - 1]}
            </span>
          </div>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clash} margin={{ left: -24, right: 6, top: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="clashFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={CHART.brand2} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART.brand2} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="week" {...axisProps} interval={1} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip content={<ChartTooltip labelFormat={(l) => `Week of ${l}`} />} />
                <Area type="monotone" dataKey="clashes" name="Clashes" stroke={CHART.brand2} strokeWidth={2} fill="url(#clashFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border hairline p-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-ink">Design hours</span>
            <span className={clsx('tnum', hp > 1 ? 'font-semibold text-warn' : 'text-ink-3')}>
              {num(d.designHoursUsed)} / {num(d.designHoursBudget)} h · {pct(hp)}
            </span>
          </div>
          <Progress value={hp} tone={hp > 1 ? 'warn' : 'brand'} className="mt-2" height={8} />
          {hp > 1 && <div className="mt-1.5 text-[11.5px] text-warn">{num(d.designHoursUsed - d.designHoursBudget)} h over budget</div>}
        </div>

        <div className="rounded-2xl border hairline p-3">
          <div className="mb-2 flex items-center justify-between text-[12px]">
            <span className="font-medium text-ink">RFIs</span>
            <span className="flex gap-1.5">
              <Pill tone={open.length ? 'warn' : 'neutral'}>{open.length} open</Pill>
              <Pill tone="ok">{answered.length} answered</Pill>
            </span>
          </div>
          {orderedRfis.length === 0 ? (
            <div className="py-2 text-[12.5px] text-ink-3">No RFIs raised on this job.</div>
          ) : (
            <ul className="scroll-thin max-h-[170px] space-y-1.5 overflow-y-auto">
              {orderedRfis.map((r) => (
                <li key={r.id} className="flex items-start gap-2 rounded-lg bg-sunk px-2.5 py-1.5">
                  <span className={clsx('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', r.status === 'Open' ? 'bg-warn' : 'bg-ok')} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] text-ink">{r.subject}</div>
                    <div className="text-[11px] text-ink-3">
                      {r.id} · to {r.to} ·{' '}
                      {r.status === 'Open' ? `open ${-daysUntil(r.raised)} days` : `answered in ${r.answered ? daysBetween(r.raised, r.answered) : 0} days`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBox({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-sunk p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-ink-3">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {children}
    </div>
  );
}
