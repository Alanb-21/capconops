import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Banknote, Clock, FileClock, Landmark, PiggyBank, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, CardHeader, Kpi, Money, Note, PageHeader, Pill, Segmented, Stat, Table, Td, Th, Tr, clsx, useMoney, type Tone } from '../components/ui';
import { CHART, ChartTooltip, axisProps } from '../components/charts';
import { useStore } from '../store/useStore';
import { agedDebt, appsOverDays, cashReceived, marginBySector, outstandingApps, retentionHeld, wipEur } from '../data/metrics';
import { VARIATIONS } from '../data/seed';
import type { Job, ValuationStatus, Variation } from '../data/types';
import { eur, pct, toEur } from '../lib/format';
import { daysBetween, daysUntil, fmtDate, fmtMonth } from '../lib/dates';
import { ValuationAgentCard } from '../components/finance/ValuationAgent';
import { OPENING_CASH, cashForecast, cutoffThisMonth, latestVal, marginRows, retentionRows } from '../components/finance/financeCalc';

type RegionFilter = 'all' | 'IE' | 'UK';

const statusTone: Record<ValuationStatus, Tone> = {
  'Not started': 'neutral',
  Draft: 'warn',
  Submitted: 'brand',
  Certified: 'accent',
  Paid: 'ok',
  'Missed cut-off': 'bad',
};

const mcName = (j: Job) => (j.mainContractor === 'Undisclosed' ? <span className="text-ink-3">Undisclosed</span> : j.mainContractor);

export default function Finance() {
  const allJobs = useStore((s) => s.jobs);
  const vals = useStore((s) => s.valuations);
  const [region, setRegion] = useState<RegionFilter>('all');
  const jobs = useMemo(() => (region === 'all' ? allJobs : allJobs.filter((j) => j.region === region)), [allJobs, region]);

  const wip = wipEur(jobs, vals);
  const outstanding = outstandingApps(jobs, vals);
  const over60 = appsOverDays(jobs, vals, 60).filter((x) => !x.job.mainContractorPublic);
  const cash30 = cashReceived(jobs, vals, 30);
  const retention = retentionHeld(jobs, vals);
  const jobIds = new Set(jobs.map((j) => j.id));
  const openVars = VARIATIONS.filter((v) => jobIds.has(v.jobId) && (v.status === 'Pending pricing' || v.status === 'Submitted' || v.status === 'Instructed (verbal)'));
  const openVarsEur = openVars.reduce((a, v) => a + toEur(v.value, allJobs.find((j) => j.id === v.jobId)?.currency ?? 'EUR'), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Valerie Curran · Financial Accountant"
        title="Commercial & Finance"
        subtitle="Applications for payment, debt, retentions, variations and cash, all from installed metres and the variation register."
        actions={
          <Segmented<RegionFilter>
            value={region}
            onChange={setRegion}
            options={[
              { value: 'all', label: 'All regions' },
              { value: 'IE', label: 'Ireland' },
              { value: 'UK', label: 'UK' },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Work in progress" value={wip} format={(v) => eur(v)} sub="Earned, not yet certified" icon={<Landmark size={15} />} />
        <Kpi label="Applications outstanding" value={outstanding.value} format={(v) => eur(v)} sub={`${outstanding.count} applications unpaid`} icon={<FileClock size={15} />} delay={0.04} />
        <Kpi label="Over 60 days" value={over60.length} sub={over60.length ? `${eur(over60.reduce((a, x) => a + toEur(x.v.certified ?? x.v.applied, x.job.currency), 0))}` + ` with ${new Set(over60.map((x) => x.job.mainContractor)).size} contractors` : 'None'} deltaTone="bad" delta={over60.length ? 'chase' : undefined} icon={<AlertTriangle size={15} />} delay={0.08} />
        <Kpi label="Cash received, 30 days" value={cash30} format={(v) => eur(v)} sub="Matched to applications" icon={<Banknote size={15} />} delay={0.12} />
        <Kpi label="Retentions held" value={retention} format={(v) => eur(v)} sub="Released at PC and end of defects" icon={<PiggyBank size={15} />} delay={0.16} />
        <Kpi label="Variations not yet agreed" value={openVarsEur} format={(v) => eur(v)} sub={`${openVars.length} pending pricing or submitted`} icon={<Wallet size={15} />} delay={0.2} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <ValuationAgentCard />
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
          <AgedDebt jobs={jobs} />
          <Over60 rows={over60} />
        </div>
      </div>

      <div className="mt-5">
        <ApplicationsTable jobs={jobs} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <CashForecast jobs={jobs} />
        </div>
        <div className="xl:col-span-5">
          <Retentions jobs={jobs} />
        </div>
      </div>

      <div className="mt-5">
        <VariationsRegister jobs={jobs} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <MarginByJob jobs={jobs} />
        </div>
        <div className="xl:col-span-5">
          <MarginBySector jobs={jobs} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- aged debt
function AgedDebt({ jobs }: { jobs: Job[] }) {
  const vals = useStore((s) => s.valuations);
  const b = agedDebt(jobs, vals);
  const data = [
    { bucket: '0–30', value: Math.round(b.current), tone: CHART.brand },
    { bucket: '31–60', value: Math.round(b['31-60']), tone: CHART.brand2 },
    { bucket: '61–90', value: Math.round(b['61-90']), tone: CHART.warn },
    { bucket: '90+', value: Math.round(b['90+']), tone: CHART.bad },
  ];
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <Card className="h-full">
      <CardHeader title="Aged debt" subtitle={`Certified, unpaid: ${eur(total)} · days since application`} className="!mb-2" />
      <div className="h-[150px]">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="bucket" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={(v) => eur(Number(v))} width={60} tickCount={4} />
            <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={<ChartTooltip format={(v) => eur(v, false)} />} />
            <Bar dataKey="value" name="Certified unpaid" radius={[8, 8, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.bucket} fill={d.tone} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Over60({ rows }: { rows: ReturnType<typeof appsOverDays> }) {
  const navigate = useNavigate();
  const toast = useStore((s) => s.toast);
  const pushLog = useStore((s) => s.pushLog);
  const [chased, setChased] = useState<string[]>([]);
  return (
    <Card className="h-full">
      <CardHeader title="Over 60 days" subtitle="Unpaid applications to chase" icon={<Clock size={15} />} className="!mb-3" />
      <div className="space-y-1.5">
        {rows.map(({ v, job, age }) => (
          <div key={v.id} className="flex items-center gap-3 rounded-2xl bg-sunk px-3 py-2">
            <div className="min-w-0 flex-1">
              <button className="block max-w-full truncate text-left text-[13px] font-medium text-ink hover:text-brand" onClick={() => navigate(`/projects/${job.id}`)}>
                {job.name}
              </button>
              <div className="truncate text-[11.5px] text-ink-3">
                {job.mainContractor} · app {v.appNo} · <Money amount={v.certified ?? v.applied} currency={job.currency} className="text-ink-2" />
              </div>
            </div>
            <Pill tone={age > 70 ? 'bad' : 'warn'}>{age} days</Pill>
            <Button
              size="sm"
              variant="ghost"
              disabled={chased.includes(v.id)}
              onClick={() => {
                setChased((c) => [...c, v.id]);
                pushLog({ agent: 'inbox', text: `Drafted payment chaser to ${job.mainContractor} for application ${v.appNo} on ${job.name}, waiting for approval`, jobId: job.id });
                toast({ title: 'Chaser drafted', detail: `To ${job.mainContractor} for application ${v.appNo}. Waiting in your approvals.`, tone: 'info' });
              }}
            >
              {chased.includes(v.id) ? 'Drafted' : 'Chase'}
            </Button>
          </div>
        ))}
        {rows.length === 0 && <div className="py-6 text-center text-[13px] text-ink-3">Nothing over 60 days.</div>}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- applications table
function ApplicationsTable({ jobs }: { jobs: Job[] }) {
  const vals = useStore((s) => s.valuations);
  const navigate = useNavigate();
  const [show, setShow] = useState<'all' | 'action'>('all');
  const rows = useMemo(() => {
    return jobs
      .filter((j) => vals.some((v) => v.jobId === j.id) || j.valuationStatus === 'Draft')
      .map((j) => {
        const v = latestVal(vals, j.id);
        const cutoff = cutoffThisMonth(j);
        const d = daysUntil(cutoff);
        const needs = j.valuationStatus === 'Draft' || j.valuationStatus === 'Not started';
        return { j, v, cutoff, d, warn: needs && d >= 0 && d <= 3, needs };
      })
      .filter((r) => show === 'all' || r.needs)
      .sort((a, b) => Number(b.warn) - Number(a.warn) || a.cutoff.localeCompare(b.cutoff) || a.j.name.localeCompare(b.j.name));
  }, [jobs, vals, show]);

  return (
    <Card>
      <CardHeader
        title="Applications for payment by job"
        subtitle="Latest application, certification and payment. October cut-off from each main contractor’s payment schedule."
        action={
          <Segmented
            size="sm"
            value={show}
            onChange={setShow}
            options={[
              { value: 'all', label: `All jobs` },
              { value: 'action', label: 'Needs October app' },
            ]}
          />
        }
      />
      <Table className="max-h-[420px] overflow-y-auto">
        <thead>
          <tr>
            <Th>Job</Th>
            <Th>Latest app</Th>
            <Th align="right">Applied</Th>
            <Th align="right">Certified</Th>
            <Th align="right">Paid</Th>
            <Th align="right">Days to cert.</Th>
            <Th>Oct cut-off</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ j, v, cutoff, d, warn }) => (
            <Tr key={j.id} onClick={() => navigate(`/projects/${j.id}`)} highlight={j.id === 'CE-2309' && j.valuationStatus === 'Draft'}>
              <Td className="max-w-[300px]">
                <div className="truncate font-medium text-ink">{j.name}</div>
                <div className="truncate text-[11.5px] text-ink-3">
                  {j.id} · {mcName(j)}
                </div>
              </Td>
              <Td className="whitespace-nowrap">{v ? <span className="tnum">No. {v.appNo} · {fmtMonth(v.month)}</span> : '–'}</Td>
              <Td align="right">{v ? <Money amount={v.applied} currency={j.currency} /> : '–'}</Td>
              <Td align="right">{v?.certified != null ? <Money amount={v.certified} currency={j.currency} /> : <span className="text-ink-3">awaiting</span>}</Td>
              <Td align="right">{v?.paid != null ? <Money amount={v.paid} currency={j.currency} /> : <span className="text-ink-3">–</span>}</Td>
              <Td align="right">{v?.certifiedOn ? `${daysBetween(v.submitted, v.certifiedOn)} d` : v ? <span className="text-ink-3">{daysBetween(v.submitted, '2026-10-06')} d so far</span> : '–'}</Td>
              <Td className="whitespace-nowrap">
                <span className={clsx(warn ? 'font-semibold text-warn' : 'text-ink-2')}>{fmtDate(cutoff, { weekday: true })}</span>
                {warn && <span className="ml-1.5 text-[11px] text-warn">{d} days</span>}
              </Td>
              <Td>
                <Pill tone={statusTone[j.valuationStatus]} dot>
                  {j.valuationStatus}
                </Pill>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Note className="mt-3">{rows.length} jobs. Amounts in job currency; use Group € in the top bar to convert. Certified amounts flow in from the Inbox Agent matching payment notices.</Note>
    </Card>
  );
}

// ---------------------------------------------------------------- cash forecast
function CashForecast({ jobs }: { jobs: Job[] }) {
  const vals = useStore((s) => s.valuations);
  const data = useMemo(() => cashForecast(jobs, vals), [jobs, vals]);
  const inTotal = data.reduce((a, d) => a + d.receipts, 0);
  const outTotal = data.reduce((a, d) => a + d.outflows, 0);
  const low = data.reduce((m, d) => Math.min(m, d.balance), Infinity);
  const close = data[data.length - 1]?.balance ?? 0;
  return (
    <Card className="h-full">
      <CardHeader title="13-week cash forecast" subtitle="Receipts from certified and submitted applications by due date, then next applications at 30 to 35 days. Group €." />
      <div className="mb-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Opening position" value={eur(OPENING_CASH)} />
        <Stat label="Receipts, 13 weeks" value={eur(inTotal)} />
        <Stat label="Payments, 13 weeks" value={eur(Math.abs(outTotal))} />
        <Stat label="Lowest / closing" value={`${eur(Number.isFinite(low) ? low : 0)} / ${eur(close)}`} />
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }} stackOffset="sign">
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="week" {...axisProps} interval={1} />
            <YAxis {...axisProps} tickFormatter={(v) => eur(Number(v))} width={58} />
            <ReferenceLine y={0} stroke={CHART.grid} />
            <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={<ChartTooltip format={(v) => eur(v, false)} labelFormat={(l) => `Week of ${l}`} />} />
            <Bar dataKey="receipts" name="Receipts" stackId="cash" fill={CHART.brand2} radius={[6, 6, 0, 0]} />
            <Bar dataKey="outflows" name="Payments" stackId="cash" fill={CHART.brand3} radius={[6, 6, 0, 0]} />
            <Line dataKey="balance" name="Cash balance" type="monotone" stroke={CHART.brand} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Note className="mt-2">Payments: weekly payroll, supplier run on the last Friday of each month, fixed overheads. Opening position from the bank feed (example connection).</Note>
    </Card>
  );
}

// ---------------------------------------------------------------- retentions
function Retentions({ jobs }: { jobs: Job[] }) {
  const vals = useStore((s) => s.valuations);
  const rows = useMemo(() => retentionRows(jobs, vals), [jobs, vals]);
  const total = rows.reduce((a, r) => a + toEur(r.held, r.job.currency), 0);
  const next6 = rows.reduce((a, r) => {
    let v = 0;
    if (!r.firstReleased && daysUntil(r.pc) <= 183) v += r.half;
    if (daysUntil(r.defectsEnd) <= 183) v += r.half;
    return a + toEur(v, r.job.currency);
  }, 0);
  return (
    <Card className="h-full">
      <CardHeader title="Retentions held and release dates" subtitle="Half at practical completion, the rest after the 12-month defects period" />
      <div className="mb-3 grid grid-cols-2 gap-4">
        <Stat label="Held across jobs" value={eur(total)} sub={`${rows.length} jobs`} />
        <Stat label="Due back in 6 months" value={eur(next6)} sub="If PC dates hold" />
      </div>
      <Table className="max-h-[262px] overflow-y-auto">
        <thead>
          <tr>
            <Th>Job</Th>
            <Th align="right">Held</Th>
            <Th className="!px-2">Half at PC</Th>
            <Th className="!px-2">Balance</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Tr key={r.job.id}>
              <Td className="max-w-[150px]">
                <div className="truncate text-ink">{r.job.name}</div>
                <div className="text-[11px] text-ink-3">{(r.job.retentionPct * 100).toFixed(0)}% retention</div>
              </Td>
              <Td align="right">
                <Money amount={r.held} currency={r.job.currency} />
              </Td>
              <Td className="whitespace-nowrap">{r.firstReleased ? <Pill tone="ok">Released</Pill> : <span className="text-ink-2">{fmtMonth(r.pc.slice(0, 7))}</span>}</Td>
              <Td className="whitespace-nowrap text-ink-2">{fmtMonth(r.defectsEnd.slice(0, 7))}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

// ---------------------------------------------------------------- variations
type VarFilter = 'open' | Variation['status'];
const VAR_ORDER: Variation['status'][] = ['Instructed (verbal)', 'Pending pricing', 'Submitted', 'Agreed', 'Rejected'];
const varTone: Record<Variation['status'], Tone> = {
  'Instructed (verbal)': 'bad',
  'Pending pricing': 'warn',
  Submitted: 'brand',
  Agreed: 'ok',
  Rejected: 'neutral',
};

function VariationsRegister({ jobs }: { jobs: Job[] }) {
  const [filter, setFilter] = useState<VarFilter>('open');
  const toast = useStore((s) => s.toast);
  const pushLog = useStore((s) => s.pushLog);
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const byId = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const all = VARIATIONS.filter((v) => byId.has(v.jobId));
  const totals = VAR_ORDER.filter((s) => s !== 'Rejected').map((s) => {
    const l = all.filter((v) => v.status === s);
    return { s, n: l.length, eur: l.reduce((a, v) => a + toEur(v.value, byId.get(v.jobId)!.currency), 0) };
  });
  const rows = all
    .filter((v) => (filter === 'open' ? v.status !== 'Agreed' && v.status !== 'Rejected' : v.status === filter))
    .sort((a, b) => VAR_ORDER.indexOf(a.status) - VAR_ORDER.indexOf(b.status) || b.date.localeCompare(a.date));

  return (
    <Card>
      <CardHeader
        title="Variations register"
        subtitle="Every instruction from site to agreed account. Verbal instructions get confirmed in writing before they are priced."
        action={
          <Segmented<VarFilter>
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'open', label: 'Not yet agreed' },
              { value: 'Instructed (verbal)', label: 'Verbal' },
              { value: 'Pending pricing', label: 'Pending pricing' },
              { value: 'Submitted', label: 'Submitted' },
              { value: 'Agreed', label: 'Agreed' },
            ]}
          />
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {totals.map((t) => (
          <button key={t.s} onClick={() => setFilter(t.s)} className={clsx('rounded-2xl px-4 py-3 text-left transition', filter === t.s ? 'bg-brand-soft' : 'bg-sunk hover:brightness-95')}>
            <div className="flex items-center gap-2 text-[12px] text-ink-3">
              <Pill tone={varTone[t.s]} dot>
                {t.s}
              </Pill>
              <span>{t.n}</span>
            </div>
            <div className="mt-1.5 text-[19px] font-semibold tracking-[-0.02em] text-ink tnum">{eur(t.eur)}</div>
          </button>
        ))}
      </div>
      <Table className="max-h-[360px] overflow-y-auto">
        <thead>
          <tr>
            <Th>Ref</Th>
            <Th>Job</Th>
            <Th>Description</Th>
            <Th>Instructed by</Th>
            <Th>Date</Th>
            <Th align="right">Value</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => {
            const j = byId.get(v.jobId)!;
            const hot = v.id === 'VO-244' && v.jobId === 'CE-2315';
            return (
              <Tr key={`${v.id}-${v.jobId}`} highlight={hot} className={hot ? '!bg-bad-soft' : undefined}>
                <Td className="whitespace-nowrap font-medium text-ink">{v.id}</Td>
                <Td className="max-w-[200px]">
                  <button className="block max-w-full truncate text-left hover:text-brand" onClick={() => navigate(`/projects/${j.id}`)}>
                    {j.name}
                  </button>
                </Td>
                <Td className="max-w-[340px]">
                  <div className="truncate">{v.description}</div>
                  {hot && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[11.5px] text-bad">Not in writing, not priced. 6 days since site walk.</span>
                      <Button
                        size="sm"
                        variant={confirmed ? 'secondary' : 'primary'}
                        className="!h-6 !px-2.5 !text-[11px]"
                        disabled={confirmed}
                        onClick={() => {
                          setConfirmed(true);
                          pushLog({ agent: 'inbox', text: 'Drafted confirmation of verbal instruction VO-244 to Tolka Building, waiting for approval', jobId: 'CE-2315' });
                          toast({ title: 'Confirmation of verbal instruction drafted', detail: 'VO-244 to Tolka Building, est. €18,400. Waiting in your approvals.', tone: 'success' });
                        }}
                      >
                        {confirmed ? 'Confirmation drafted' : 'Confirm in writing'}
                      </Button>
                    </div>
                  )}
                </Td>
                <Td className="max-w-[170px] truncate">{v.instructedBy}</Td>
                <Td className="whitespace-nowrap">{fmtDate(v.date)}</Td>
                <Td align="right">
                  <Money amount={v.value} currency={j.currency} className="font-medium text-ink" />
                </Td>
                <Td>
                  <Pill tone={varTone[v.status]} dot>
                    {v.status}
                  </Pill>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}

// ---------------------------------------------------------------- margin
function MarginByJob({ jobs }: { jobs: Job[] }) {
  const navigate = useNavigate();
  const rows = useMemo(() => marginRows(jobs), [jobs]);
  const top = [...rows].sort((a, b) => b.margin - a.margin).slice(0, 8);
  const bottom = rows
    .filter((r) => !r.job.mainContractorPublic)
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 8);
  const List = ({ title, list, tone }: { title: string; list: typeof rows; tone: Tone }) => (
    <div className="min-w-0">
      <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">{title}</div>
      <Table>
        <thead>
          <tr>
            <Th>Job</Th>
            <Th align="right">Earned</Th>
            <Th align="right">Cost</Th>
            <Th align="right">Margin</Th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <Tr key={r.job.id} onClick={() => navigate(`/projects/${r.job.id}`)}>
              <Td className="max-w-[170px]">
                <div className="truncate text-ink">{r.job.name}</div>
              </Td>
              <Td align="right">
                <Money amount={r.earned} currency={r.job.currency} compact />
              </Td>
              <Td align="right">
                <Money amount={r.cost} currency={r.job.currency} compact />
              </Td>
              <Td align="right">
                <Pill tone={tone}>{pct(r.margin, 1)}</Pill>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
  return (
    <Card className="h-full">
      <CardHeader title="Margin by job" subtitle="Forecast margin at completion, with value earned and cost to date" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <List title="Strongest 8" list={top} tone="ok" />
        <List title="Weakest 8" list={bottom} tone="warn" />
      </div>
    </Card>
  );
}

function MarginBySector({ jobs }: { jobs: Job[] }) {
  const fmt = useMoney();
  const data = useMemo(() => marginBySector(jobs).map((s) => ({ ...s, marginPct: Math.round(s.margin * 1000) / 10 })).sort((a, b) => b.marginPct - a.marginPct), [jobs]);
  return (
    <Card className="h-full">
      <CardHeader title="Margin by sector" subtitle="Earned vs cost to date on live install jobs, group €" />
      <div className="h-[330px]">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={CHART.grid} />
            <XAxis type="number" {...axisProps} tickFormatter={(v) => `${v}%`} domain={[0, 'dataMax + 4']} />
            <YAxis type="category" dataKey="sector" {...axisProps} width={96} />
            <Tooltip
              cursor={{ fill: 'var(--c-surface-sunk)' }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!active || !p) return null;
                return (
                  <div className="glass-strong rounded-xl px-3 py-2 text-[12px] shadow-lg">
                    <div className="mb-1 font-medium text-ink">{p.sector}</div>
                    <div className="text-ink-2">Margin {p.marginPct}% · {p.jobs} jobs</div>
                    <div className="text-ink-3">Earned {fmt(p.earned, 'EUR', true)} · cost {fmt(p.cost, 'EUR', true)}</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="marginPct" name="Margin" radius={[0, 8, 8, 0]} fill={CHART.brand} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
