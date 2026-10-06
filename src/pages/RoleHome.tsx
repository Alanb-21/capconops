// Role-specific home screens (Eugene, Robert, Stephen, Aaron, Valerie, Julia).
// Same visual language as the Command Centre: greeting, focus line, KPIs,
// a couple of relevant panels, the agents' attention items and quick links.
import {
  Banknote,
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Coins,
  Factory,
  FileText,
  FileWarning,
  Gauge,
  Globe,
  Hourglass,
  Layers,
  Leaf,
  MessageSquareWarning,
  Package,
  PencilRuler,
  PiggyBank,
  Receipt,
  Recycle,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AttentionFeed, ChartCard, GREETING_DATE, LegendDot, QuickLinks } from '../components/home/HomeParts';
import { CHART, ChartTooltip, axisProps } from '../components/charts';
import { Button, Card, CardHeader, HealthDot, HealthPill, Kpi, LinkButton, PageHeader, Pill, Progress, clsx } from '../components/ui';
import { roleById } from '../data/people';
import {
  agreedVarsFor,
  appsOverDays,
  cashReceived,
  designed,
  earned,
  installed,
  jobPct,
  maintVisitsDue,
  marginBySector,
  nearMisses30,
  openRfis,
  openTenders,
  outstandingApps,
  pipelineValueEur,
  retentionHeld,
  revenueVsCost,
  agedDebt,
  winRate,
  winRateBySector,
  wipEur,
  estimatorLoad,
  tendersClosingThisWeek,
} from '../data/metrics';
import { CREWS, DESIGN, DRAWINGS, HS_ITEMS, MAINT_CONTRACTS, NCRS, RAMS, STOCK, TECHNICIANS } from '../data/seed';
import type { Job, RoleId } from '../data/types';
import { SPOOL_STAGES } from '../data/types';
import { daysUntil, fmtDate, fmtMonth } from '../lib/dates';
import { eur, metres, num, pct, toEur } from '../lib/format';
import { useStore } from '../store/useStore';

type HomeRole = Exclude<RoleId, 'donnacha' | 'technician'>;
const KPI_COLS: Record<number, string> = {
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-6',
};

// ---------------------------------------------------------------- frame
function HomeFrame({
  role,
  actions,
  kpis,
  main,
  links,
}: {
  role: HomeRole;
  actions?: ReactNode;
  kpis: ReactNode[];
  main: ReactNode;
  links: { to: string; label: string; icon: ReactNode; hint?: string }[];
}) {
  const r = roleById(role);
  const first = r.person.split(' ')[0];
  return (
    <div>
      <PageHeader
        eyebrow={`${GREETING_DATE} · ${r.title}`}
        title={`Good morning, ${first}`}
        subtitle={r.focus}
        actions={actions}
      />
      <div className={clsx('grid grid-cols-2 gap-4 md:grid-cols-3', KPI_COLS[kpis.length] ?? 'xl:grid-cols-6')}>
        {kpis.map((k, i) => (
          <div key={i} className="min-w-0">
            {k}
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-8">{main}</div>
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-4">
          <AttentionFeed role={role} delay={0.15} maxHeight={430} />
          <QuickLinks links={links} delay={0.2} />
        </div>
      </div>
      <p className="mt-4 text-[11.5px] text-ink-3">Demo data. Group totals in euro at the demo rate shown beside the Group € toggle.</p>
    </div>
  );
}

function Row({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={clsx('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-sunk', className)}>
      {children}
    </button>
  );
}

const rateTip = (fmt: (v: number) => string) => <ChartTooltip format={(v) => fmt(v)} />;

// ---------------------------------------------------------------- Eugene (MD)
function EugeneHome() {
  const nav = useNavigate();
  const jobs = useStore((s) => s.jobs);
  const vals = useStore((s) => s.valuations);
  const tenders = useStore((s) => s.tenders);
  const rvc = revenueVsCost(jobs, vals).map((r) => ({ ...r, label: fmtMonth(r.month) }));
  const rev = rvc.reduce((a, r) => a + r.revenue, 0);
  const cost = rvc.reduce((a, r) => a + r.cost, 0);
  const margin = rev > 0 ? (rev - cost) / rev : 0;
  const remaining = (j: Job) => toEur(Math.max(0, j.contractValue + agreedVarsFor(j.id) - earned(j)), j.currency);
  const orderBook = jobs.reduce((a, j) => a + remaining(j), 0);
  const pipeline = pipelineValueEur(tenders);
  const cash = cashReceived(jobs, vals, 30);
  const wip = wipEur(jobs, vals);
  const mbs = marginBySector(jobs).sort((a, b) => b.margin - a.margin);
  const avgMargin = mbs.length ? mbs.reduce((a, m) => a + m.margin, 0) / mbs.length : 0;

  const groups = [
    { key: 'IE', label: 'Ireland', test: (j: Job) => j.region === 'IE', color: CHART.brand },
    { key: 'UK', label: 'United Kingdom', test: (j: Job) => j.region === 'UK', color: CHART.brand2 },
    { key: 'AS', label: 'Asia & Europe design', test: (j: Job) => j.region !== 'IE' && j.region !== 'UK', color: CHART.brand3 },
  ].map((g) => {
    const js = jobs.filter(g.test);
    return { ...g, jobs: js.length, book: js.reduce((a, j) => a + remaining(j), 0) };
  });
  const bookTotal = groups.reduce((a, g) => a + g.book, 0) || 1;
  const ieTechs = TECHNICIANS.filter((t) => t.region === 'IE').length;
  const ukTechs = TECHNICIANS.filter((t) => t.region === 'UK').length;
  const risks = jobs
    .filter((j) => j.health !== 'on-track' && !j.mainContractorPublic)
    .sort((a, b) => (a.health === 'blocked' ? -1 : 0) - (b.health === 'blocked' ? -1 : 0) || toEur(b.contractValue, b.currency) - toEur(a.contractValue, a.currency))
    .slice(0, 5);

  return (
    <HomeFrame
      role="eugene"
      actions={
        <>
          <LinkButton to="/efficiency" icon={<Sparkles size={15} />}>
            What this gives back
          </LinkButton>
          <LinkButton to="/finance" variant="primary" icon={<Banknote size={15} />}>
            Open finance
          </LinkButton>
        </>
      }
      kpis={[
        <Kpi key="r" label="Revenue, 12 months" value={rev} format={(v) => eur(v)} to="/finance" icon={<TrendingUp size={15} />} sub="Incl. maintenance" />,
        <Kpi key="m" label="Gross margin" value={margin * 100} format={(v) => `${v.toFixed(1)}%`} to="/finance" icon={<Gauge size={15} />} sub={`${eur(rev - cost)} gross profit`} />,
        <Kpi key="o" label="Order book" value={orderBook} format={(v) => eur(v)} to="/projects" icon={<Briefcase size={15} />} sub={`Still to earn on ${jobs.length} jobs`} />,
        <Kpi key="p" label="Tender pipeline" value={pipeline} format={(v) => eur(v)} to="/tenders" icon={<Target size={15} />} sub={`${openTenders(tenders).length} open · ${pct(winRate(tenders))} win rate`} />,
        <Kpi key="c" label="Cash in, 30 days" value={cash} format={(v) => eur(v)} to="/finance" icon={<Coins size={15} />} sub="Matched to applications" />,
        <Kpi key="w" label="Work in progress" value={wip} format={(v) => eur(v)} to="/finance" icon={<Layers size={15} />} sub="Earned, not yet certified" />,
      ]}
      main={
        <>
          <ChartCard
            title="Revenue vs cost"
            subtitle={<span className="tnum">Last 12 months · group € · {pct(margin, 1)} gross margin</span>}
            icon={<TrendingUp size={15} />}
            action={
              <div className="flex gap-3">
                <LegendDot color={CHART.brand} label="Revenue" />
                <LegendDot color={CHART.muted} label="Cost" />
              </div>
            }
            height={250}
            delay={0.1}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rvc} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="eu-rev" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={CHART.brand} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={58} tickFormatter={(v: number) => eur(v)} />
                <Tooltip content={rateTip((v) => eur(v))} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={CHART.brand} strokeWidth={2} fill="url(#eu-rev)" />
                <Line type="monotone" dataKey="cost" name="Cost" stroke={CHART.muted} strokeWidth={1.75} strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Margin by sector" subtitle={<span className="tnum">Earned vs cost to date on live installs · average {pct(avgMargin, 1)}</span>} icon={<BarChart3 size={15} />} height={260} delay={0.14}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mbs} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap="26%">
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" {...axisProps} tickFormatter={(v: number) => pct(v)} />
                  <YAxis type="category" dataKey="sector" {...axisProps} width={96} />
                  <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={rateTip((v) => pct(v, 1))} />
                  <Bar dataKey="margin" name="Margin" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11, fill: 'var(--c-ink-3)', formatter: (v: unknown) => pct(Number(v), 1) }}>
                    {mbs.map((m) => (
                      <Cell key={m.sector} fill={m.margin >= avgMargin ? CHART.brand : CHART.brand3} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <Card delay={0.18}>
              <CardHeader title="Group at a glance" subtitle="Order book by region and people" icon={<Globe size={15} />} />
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunk">
                {groups.map((g) => (
                  <div key={g.key} style={{ width: `${(g.book / bookTotal) * 100}%`, background: g.color }} />
                ))}
              </div>
              <div className="mt-3 space-y-1">
                {groups.map((g) => (
                  <div key={g.key} className="flex items-center gap-2.5 py-1 text-[13px]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.color }} />
                    <span className="min-w-0 flex-1 truncate text-ink-2">{g.label}</span>
                    <span className="text-ink-3 tnum">{g.jobs} jobs</span>
                    <span className="w-[64px] text-right font-semibold text-ink tnum">{eur(g.book)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t hairline pt-3">
                <div>
                  <div className="text-[11.5px] text-ink-3">Field technicians</div>
                  <div className="text-[20px] font-semibold text-ink tnum">{TECHNICIANS.length}</div>
                </div>
                <div>
                  <div className="text-[11.5px] text-ink-3">Ireland</div>
                  <div className="text-[20px] font-semibold text-ink tnum">{ieTechs}</div>
                </div>
                <div>
                  <div className="text-[11.5px] text-ink-3">UK</div>
                  <div className="text-[20px] font-semibold text-ink tnum">{ukTechs}</div>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-ink-3">
                {CREWS.length} crews in the field, plus office teams in Maynooth, the UK, Singapore and Malaysia.
              </p>
            </Card>
          </div>
          <Card delay={0.2}>
            <CardHeader title="Top risks" subtitle="Blocked and at-risk jobs, largest first" icon={<TriangleAlert size={15} />} action={<LinkButton to="/projects" size="sm" variant="ghost">All projects</LinkButton>} />
            <div className="-mx-1 space-y-0.5">
              {risks.map((j) => (
                <Row key={j.id} onClick={() => nav(`/projects/${j.id}`)}>
                  <HealthDot health={j.health} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">
                      {j.name} <span className="font-normal text-ink-3">· {j.mainContractor}</span>
                    </span>
                    <span className="block truncate text-[12px] text-ink-3">{j.healthReason}</span>
                  </span>
                  <span className="hidden text-[12.5px] font-medium text-ink tnum sm:block">{eur(toEur(j.contractValue, j.currency))}</span>
                  <HealthPill health={j.health} />
                </Row>
              ))}
            </div>
          </Card>
        </>
      }
      links={[
        { to: '/command', label: 'Operations command centre', icon: <Gauge size={15} />, hint: 'Every live site on one screen' },
        { to: '/finance', label: 'Commercial & finance', icon: <Banknote size={15} />, hint: 'Applications, debt and cash' },
        { to: '/tenders', label: 'Tender pipeline', icon: <Target size={15} />, hint: 'What is coming next' },
        { to: '/efficiency', label: 'What this gives back', icon: <Sparkles size={15} />, hint: 'Hours saved by the agents' },
      ]}
    />
  );
}

// ---------------------------------------------------------------- Robert (Prefab & Maintenance)
function RobertHome() {
  const nav = useNavigate();
  const spools = useStore((s) => s.spools);
  const defects = useStore((s) => s.defects);
  const jobs = useStore((s) => s.jobs);
  const inProd = spools.filter((s) => ['Cut', 'Fused / welded', 'Pressure tested', 'QC passed', 'Packed'].includes(s.stage));
  const dispatched = spools.filter((s) => s.stage === 'Dispatched');
  const low = STOCK.filter((s) => s.onHand < s.reorderLevel);
  const maintValue = MAINT_CONTRACTS.reduce((a, c) => a + toEur(c.annualValue, c.currency), 0);
  const visits = maintVisitsDue(30);
  const found = defects.filter((d) => d.stage === 'Defect found');
  const quoted = defects.filter((d) => d.stage === 'Quote raised');
  const stageData = SPOOL_STAGES.map((st) => ({ stage: st, Spools: spools.filter((s) => s.stage === st).length }));
  const defectStages = ['Defect found', 'Quote raised', 'Approved', 'Scheduled', 'Complete'] as const;
  const dueSoon = inProd.filter((s) => daysUntil(s.due) <= 7).length;

  return (
    <HomeFrame
      role="robert"
      actions={
        <>
          <LinkButton to="/maintenance" icon={<Wrench size={15} />}>
            Maintenance
          </LinkButton>
          <LinkButton to="/prefab" variant="primary" icon={<Factory size={15} />}>
            Open prefab board
          </LinkButton>
        </>
      }
      kpis={[
        <Kpi key="a" label="Spools in production" value={inProd.length} to="/prefab" icon={<Factory size={15} />} sub={`${dueSoon} due on site in 7 days`} />,
        <Kpi key="b" label="Dispatched" value={dispatched.length} to="/prefab" icon={<Truck size={15} />} sub={`This week · ${spools.filter((s) => s.stage === 'On site').length} on site`} />,
        <Kpi key="c" label="Stock reorder alerts" value={low.length} to="/prefab" icon={<Boxes size={15} />} sub="Below reorder level" deltaTone="warn" />,
        <Kpi key="d" label="Maintenance book" value={maintValue} format={(v) => eur(v)} to="/maintenance" icon={<Building2 size={15} />} sub={`${MAINT_CONTRACTS.length} contracts a year`} />,
        <Kpi key="e" label="Visits due, 30 days" value={visits} to="/maintenance" icon={<CalendarDays size={15} />} sub="Planned and inspections" />,
        <Kpi key="f" label="Defects to quote" value={found.length} to="/maintenance" icon={<Receipt size={15} />} sub={`${quoted.length} quotes out · ${eur(quoted.reduce((a, d) => a + d.quoteValue, 0))}`} />,
      ]}
      main={
        <>
          <ChartCard title="Spools by stage" subtitle={<span className="tnum">{spools.length} spools across the Maynooth and UK shops</span>} icon={<Package size={15} />} height={230} delay={0.1}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top: 16, right: 4, bottom: 0, left: -18 }} barCategoryGap="24%">
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="stage" {...axisProps} interval={0} />
                <YAxis {...axisProps} width={40} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={rateTip((v) => num(v))} />
                <Bar dataKey="Spools" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 11, fill: 'var(--c-ink-3)' }}>
                  {stageData.map((d) => (
                    <Cell key={d.stage} fill={d.stage === 'Dispatched' || d.stage === 'On site' ? CHART.brand2 : CHART.brand} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card delay={0.14}>
              <CardHeader title="Stock reorder alerts" subtitle="Pipe below reorder level" icon={<Boxes size={15} />} />
              <div className="space-y-3">
                {low.map((s) => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="truncate font-medium text-ink">
                        {s.material} {s.diameter} mm
                      </span>
                      <span className="text-ink-3 tnum">
                        {metres(s.onHand)} / {metres(s.reorderLevel)}
                      </span>
                    </div>
                    <Progress value={s.reorderLevel > 0 ? s.onHand / s.reorderLevel : 0} tone={s.onHand / Math.max(1, s.reorderLevel) < 0.5 ? 'bad' : 'warn'} className="mt-1.5" />
                    <div className="mt-1 text-[11.5px] text-ink-3">Supplier: {s.supplier}</div>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="mt-4"
                icon={<Truck size={14} />}
                onClick={() =>
                  useStore.getState().toast({ title: 'Purchase orders drafted', detail: `${low.length} reorders drafted for review in Prefabrication.`, tone: 'success' })
                }
              >
                Draft reorders
              </Button>
            </Card>
            <Card delay={0.18}>
              <CardHeader title="Defects to quotes" subtitle="From maintenance inspections" icon={<Receipt size={15} />} />
              <div className="space-y-2">
                {defectStages.map((st) => {
                  const ds = defects.filter((d) => d.stage === st);
                  return (
                    <Row key={st} onClick={() => nav('/maintenance')}>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{st}</span>
                      <span className="w-[60px] text-right text-[12.5px] text-ink-3 tnum">{eur(ds.reduce((a, d) => a + d.quoteValue, 0))}</span>
                      <span className="w-8 text-right text-[15px] font-semibold text-ink tnum">{ds.length}</span>
                    </Row>
                  );
                })}
              </div>
              <p className="mt-3 text-[12px] text-ink-3">Maintenance Agent drafts a quote for each new defect with photos and the BS 8490 reference.</p>
            </Card>
          </div>
          <Card delay={0.2}>
            <CardHeader title="Sites waiting on spools" subtitle="Install jobs with spools due in the next 14 days" icon={<Truck size={15} />} />
            <div className="-mx-1">
              {jobs
                .map((j) => ({ j, n: inProd.filter((s) => s.jobId === j.id && daysUntil(s.due) <= 14).length }))
                .filter((x) => x.n > 0)
                .sort((a, b) => b.n - a.n)
                .slice(0, 5)
                .map(({ j, n }) => (
                  <Row key={j.id} onClick={() => nav(`/projects/${j.id}`)}>
                    <HealthDot health={j.health} />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{j.name}</span>
                    <span className="text-[12.5px] text-ink-3">{j.location}</span>
                    <Pill tone="brand">{n} spools</Pill>
                  </Row>
                ))}
            </div>
          </Card>
        </>
      }
      links={[
        { to: '/prefab', label: 'Prefabrication board', icon: <Factory size={15} />, hint: 'Spools, QC and dispatch' },
        { to: '/maintenance', label: 'Maintenance & service', icon: <Wrench size={15} />, hint: 'Contracts, visits and defects' },
        { to: '/crews', label: 'Crews & scheduling', icon: <Users size={15} />, hint: 'Who is where this week' },
        { to: '/projects/CE-2304', label: 'NLHPP Zone C re-test', icon: <TriangleAlert size={15} />, hint: '8 spools held at re-test' },
      ]}
    />
  );
}

// ---------------------------------------------------------------- Stephen (Design)
function StephenHome() {
  const nav = useNavigate();
  const jobs = useStore((s) => s.jobs);
  const designOnly = jobs.filter((j) => j.designOnly).sort((a, b) => (a.id === 'CE-2337' ? -1 : b.id === 'CE-2337' ? 1 : b.contractValue - a.contractValue));
  const forComment = DRAWINGS.filter((d) => d.status === 'For comment');
  const rfis = openRfis();
  const designStage = new Set(jobs.filter((j) => j.stage === 'Design' || j.designOnly).map((j) => j.id));
  const recs = DESIGN.filter((d) => designStage.has(d.jobId));
  const used = recs.reduce((a, d) => a + d.designHoursUsed, 0);
  const budget = recs.reduce((a, d) => a + d.designHoursBudget, 0);
  const clash = Array.from({ length: 8 }, (_, i) => ({
    week: i === 7 ? 'This wk' : `W-${7 - i}`,
    Clashes: recs.reduce((a, d) => a + (d.clashTrend[i] ?? 0), 0),
  }));
  const clashNow = clash[7]?.Clashes ?? 0;
  const clashStart = clash[0]?.Clashes ?? 0;
  const calcs = DESIGN.filter((d) => d.hydraulicCalcs === 'In progress').length;
  const hoursJobs = recs
    .map((d) => ({ d, job: jobs.find((j) => j.id === d.jobId)! }))
    .filter((x) => x.job && x.d.designHoursBudget > 0)
    .sort((a, b) => b.d.designHoursUsed / b.d.designHoursBudget - a.d.designHoursUsed / a.d.designHoursBudget)
    .slice(0, 5);

  return (
    <HomeFrame
      role="stephen"
      actions={
        <LinkButton to="/design" variant="primary" icon={<PencilRuler size={15} />}>
          Open design register
        </LinkButton>
      }
      kpis={[
        <Kpi key="a" label="Design-only jobs" value={designOnly.length} to="/design" icon={<Globe size={15} />} sub="SG · MY · EU" />,
        <Kpi key="b" label="For comment" value={forComment.length} to="/design" icon={<FileText size={15} />} sub="Drawings issued" />,
        <Kpi key="c" label="Open RFIs" value={rfis.length} to="/design" icon={<MessageSquareWarning size={15} />} sub="RFI-0412 open 9 days" />,
        <Kpi key="d" label="Design hours used" value={budget > 0 ? (used / budget) * 100 : 0} format={(v) => `${Math.round(v)}%`} to="/design" icon={<Hourglass size={15} />} sub={`${num(used)} / ${num(budget)} h`} />,
        <Kpi key="e" label="Open clashes" value={clashNow} to="/design" icon={<Layers size={15} />} delta={clashStart > 0 ? `${pct((clashNow - clashStart) / clashStart)}` : undefined} deltaTone="ok" sub="Down over 8 weeks" />,
        <Kpi key="f" label="Calcs in progress" value={calcs} to="/design" icon={<Gauge size={15} />} sub="Awaiting check" />,
      ]}
      main={
        <>
          <Card delay={0.1}>
            <CardHeader title="Design-only jobs" subtitle="Capcon as siphonic roof drainage designer" icon={<Globe size={15} />} />
            <div className="-mx-1 space-y-0.5">
              {designOnly.map((j) => (
                <Row key={j.id} onClick={() => nav(`/projects/${j.id}`)}>
                  <HealthDot health={j.health} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">
                      {j.name}
                      {j.consultant && <span className="font-normal text-ink-3"> · {j.consultant}</span>}
                    </span>
                    <span className="block truncate text-[12px] text-ink-3">{j.location}</span>
                  </span>
                  <span className="hidden w-[140px] items-center gap-2 sm:flex">
                    <Progress value={jobPct(j)} className="flex-1" />
                    <span className="w-9 text-right text-[12px] font-medium text-ink tnum">{pct(jobPct(j))}</span>
                  </span>
                  <Pill tone="neutral">{j.region}</Pill>
                </Row>
              ))}
            </div>
          </Card>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Clash trend" subtitle={<span className="tnum">Open BIM clashes on jobs in design, last 8 weeks</span>} icon={<Layers size={15} />} height={220} delay={0.14}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={clash} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="week" {...axisProps} />
                  <YAxis {...axisProps} width={40} allowDecimals={false} />
                  <Tooltip content={rateTip((v) => num(v))} />
                  <Line type="monotone" dataKey="Clashes" stroke={CHART.brand} strokeWidth={2.25} dot={{ r: 3, fill: CHART.brand }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <Card delay={0.18}>
              <CardHeader title="Hours vs budget" subtitle="Design jobs closest to budget" icon={<Clock size={15} />} />
              <div className="space-y-3">
                {hoursJobs.map(({ d, job }) => {
                  const r = d.designHoursBudget > 0 ? d.designHoursUsed / d.designHoursBudget : 0;
                  return (
                    <button key={d.jobId} onClick={() => nav(`/projects/${job.id}`)} className="block w-full text-left">
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="truncate text-ink">{job.shortName}</span>
                        <span className="shrink-0 text-ink-3 tnum">
                          {num(d.designHoursUsed)} / {num(d.designHoursBudget)} h
                        </span>
                      </div>
                      <Progress value={r} tone={r > 0.9 ? 'bad' : r > 0.75 ? 'warn' : 'brand'} className="mt-1.5" />
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      }
      links={[
        { to: '/design', label: 'Design & BIM register', icon: <PencilRuler size={15} />, hint: 'Drawings, calcs, sign-off' },
        { to: '/projects/CE-2337', label: 'Changi Airport Terminal 5', icon: <Globe size={15} />, hint: 'Siphonic roof design for KPF' },
        { to: '/projects/CE-2326', label: 'RFI-0412, Carrigtwohill', icon: <MessageSquareWarning size={15} />, hint: 'Unanswered 9 days' },
        { to: '/projects/CE-2304', label: 'NLHPP outlet RFIs', icon: <FileWarning size={15} />, hint: '3 open with the design team' },
      ]}
    />
  );
}

// ---------------------------------------------------------------- Aaron (Estimating)
const CAPACITY_H = 37.5;
const TAKEOFF_SAVING = 0.5; // measuring share of estimating time

function AaronHome() {
  const nav = useNavigate();
  const tenders = useStore((s) => s.tenders);
  const takeoffSent = useStore((s) => s.takeoffSent);
  const me = "Aaron O'Neill";
  const open = openTenders(tenders);
  const mine = open.filter((t) => t.estimator === me);
  const closing = tendersClosingThisWeek(tenders);
  const myClosing = closing.filter((t) => t.estimator === me);
  const window = mine.filter((t) => daysUntil(t.closeDate) >= 0 && daysUntil(t.closeDate) <= 7);
  const load = estimatorLoad(tenders, me).perWeek;
  const withAgent = load * (1 - TAKEOFF_SAVING);
  const loadNow = takeoffSent ? withAgent : load;
  const myDecided = tenders.filter((t) => t.estimator === me);
  const myWr = winRate(myDecided);
  const myPipeline = pipelineValueEur(mine);
  const turn = myDecided.filter((t) => t.turnaroundDays !== undefined);
  const avgTurn = turn.length ? turn.reduce((a, t) => a + (t.turnaroundDays ?? 0), 0) / turn.length : 0;
  const wrs = winRateBySector(tenders).sort((a, b) => b.rate - a.rate);
  const upcoming = open
    .filter((t) => daysUntil(t.closeDate) >= 0 && daysUntil(t.closeDate) <= 14)
    .sort((a, b) => a.closeDate.localeCompare(b.closeDate))
    .slice(0, 7);
  const over = loadNow > CAPACITY_H;

  return (
    <HomeFrame
      role="aaron"
      actions={
        <LinkButton to="/tenders" variant="primary" icon={<Sparkles size={15} />}>
          Run Takeoff Agent
        </LinkButton>
      }
      kpis={[
        <Kpi key="a" label="Open tenders" value={open.length} to="/tenders" icon={<Target size={15} />} sub={`${mine.length} assigned to you`} />,
        <Kpi key="b" label="Closing this week" value={closing.length} to="/tenders" icon={<CalendarDays size={15} />} sub={`${myClosing.length} of them yours`} deltaTone="warn" />,
        <Kpi
          key="c"
          label="Workload per week"
          value={loadNow}
          format={(v) => `${Math.round(v)} h`}
          to="/tenders"
          icon={<Hourglass size={15} />}
          delta={pct(loadNow / CAPACITY_H)}
          deltaTone={over ? 'bad' : 'ok'}
          sub={`Capacity ${CAPACITY_H} h a week`}
        />,
        <Kpi key="d" label="Your win rate" value={myWr * 100} format={(v) => `${Math.round(v)}%`} to="/tenders" icon={<TrendingUp size={15} />} sub={`Company ${pct(winRate(tenders))}`} />,
        <Kpi key="e" label="Your pipeline" value={myPipeline} format={(v) => eur(v)} to="/tenders" icon={<Briefcase size={15} />} sub="Open tenders, group €" />,
        <Kpi key="f" label="Average turnaround" value={avgTurn} format={(v) => `${v.toFixed(1)} days`} to="/tenders" icon={<Clock size={15} />} sub="Enquiry to submission" />,
      ]}
      main={
        <>
          <Card delay={0.1} strong>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand">
                    <Hourglass size={15} />
                  </span>
                  <h3 className="text-[15px] font-semibold text-ink">Your week against capacity</h3>
                  {over ? <Pill tone="bad">Over capacity</Pill> : <Pill tone="ok">Within capacity</Pill>}
                </div>
                <p className="mt-1.5 text-[13px] text-ink-2">
                  {window.length} of your tenders close in the next 7 days. Remaining estimating time is about{' '}
                  <span className="font-semibold text-ink tnum">{Math.round(load)} h</span> against{' '}
                  <span className="tnum">{CAPACITY_H} h</span>. The Takeoff Agent measures roof areas and outlets and drafts the BOQ, so you review instead of measure.
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-[12px] text-ink-3">
                      <span>Measuring by hand</span>
                      <span className="tnum">
                        {Math.round(load)} h · {pct(load / CAPACITY_H)}
                      </span>
                    </div>
                    <CapacityBar value={load} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[12px] text-ink-3">
                      <span>With Takeoff Agent drafts</span>
                      <span className="tnum">
                        {Math.round(withAgent)} h · {pct(withAgent / CAPACITY_H)}
                      </span>
                    </div>
                    <CapacityBar value={withAgent} />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 lg:w-[200px]">
                <Button variant="primary" icon={<Sparkles size={15} />} onClick={() => nav('/tenders')}>
                  {takeoffSent ? 'Review drafted BOQs' : 'Draft BOQs with agent'}
                </Button>
                <p className="text-center text-[11.5px] text-ink-3">Nothing is submitted without your sign-off.</p>
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card delay={0.14}>
              <CardHeader title="Closing in the next 14 days" subtitle="All estimators" icon={<CalendarDays size={15} />} />
              <div className="-mx-1">
                {upcoming.map((t) => {
                  const d = daysUntil(t.closeDate);
                  return (
                    <Row key={t.id} onClick={() => nav('/tenders')}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{t.name}</span>
                        <span className="block truncate text-[11.5px] text-ink-3">
                          {t.mainContractor} · {t.estimator === me ? 'You' : t.estimator.split(' ')[0]} · {t.stage}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[12.5px] font-medium text-ink tnum">{eur(toEur(t.value, t.currency))}</span>
                        <span className={clsx('block text-[11.5px] tnum', d <= 3 ? 'text-bad' : d <= 5 ? 'text-warn' : 'text-ink-3')}>
                          {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : fmtDate(t.closeDate, { weekday: true })}
                        </span>
                      </span>
                    </Row>
                  );
                })}
              </div>
            </Card>
            <ChartCard title="Win rate by sector" subtitle={<span className="tnum">Won vs lost · company {pct(winRate(tenders))}</span>} icon={<BarChart3 size={15} />} height={300} delay={0.18}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wrs} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap="26%">
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 1]} ticks={[0, 0.5, 1]} {...axisProps} tickFormatter={(v: number) => pct(v)} />
                  <YAxis type="category" dataKey="sector" {...axisProps} width={96} />
                  <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={rateTip((v) => pct(v))} />
                  <Bar dataKey="rate" name="Win rate" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11, fill: 'var(--c-ink-3)', formatter: (v: unknown) => pct(Number(v)) }}>
                    {wrs.map((d) => (
                      <Cell key={d.sector} fill={d.rate >= winRate(tenders) ? CHART.brand : CHART.brand3} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      }
      links={[
        { to: '/tenders', label: 'Tender board', icon: <Target size={15} />, hint: 'Pipeline by stage' },
        { to: '/tenders', label: 'Takeoff Agent', icon: <Sparkles size={15} />, hint: 'Draft BOQs from tender packs' },
        { to: '/finance', label: 'Grange Castle variation', icon: <Receipt size={15} />, hint: 'VO-244 needs pricing' },
        { to: '/design', label: 'Design register', icon: <PencilRuler size={15} />, hint: 'Value engineering support' },
      ]}
    />
  );
}

function CapacityBar({ value }: { value: number }) {
  const max = Math.max(CAPACITY_H * 2, value);
  const w = Math.min(1, value / max);
  const cap = CAPACITY_H / max;
  const tone = value > CAPACITY_H ? 'var(--c-bad)' : 'var(--c-ok)';
  return (
    <div className="relative h-2.5 w-full rounded-full bg-sunk">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w * 100}%`, background: tone }} />
      <div className="absolute -top-1 bottom-[-4px] w-[2px] rounded bg-ink-3" style={{ left: `${cap * 100}%` }} title={`Capacity ${CAPACITY_H} h`} />
    </div>
  );
}

// ---------------------------------------------------------------- Valerie (Finance)
function ValerieHome() {
  const nav = useNavigate();
  const jobs = useStore((s) => s.jobs);
  const vals = useStore((s) => s.valuations);
  const apps = outstandingApps(jobs, vals);
  const over60All = appsOverDays(jobs, vals, 60);
  const over60Value = over60All.reduce((a, x) => a + toEur(x.v.certified ?? x.v.applied, x.job.currency), 0);
  const ret = retentionHeld(jobs, vals);
  const cash = cashReceived(jobs, vals, 30);
  const wip = wipEur(jobs, vals);
  const aged = agedDebt(jobs, vals);
  const agedData = Object.entries(aged).map(([bucket, value]) => ({ bucket: bucket === 'current' ? '0–30 days' : bucket === '90+' ? '90+ days' : `${bucket} days`, value }));
  const thurrock = jobs.find((j) => j.id === 'CE-2309');
  const thurrockStatus = thurrock?.valuationStatus ?? 'Draft';
  const cutoffs = jobs.filter((j) => (j.valuationStatus === 'Draft' || j.valuationStatus === 'Not started') && j.mcCutoffDay >= 6 && j.mcCutoffDay <= 12 && !j.designOnly);
  // named debtors only for fictional contractors
  const oldest = appsOverDays(jobs, vals, 30)
    .filter((x) => !x.job.mainContractorPublic)
    .slice(0, 5);

  return (
    <HomeFrame
      role="valerie"
      actions={
        <LinkButton to="/finance" variant="primary" icon={<FileText size={15} />}>
          Review Thurrock application
        </LinkButton>
      }
      kpis={[
        <Kpi key="a" label="Applications unpaid" value={apps.value} format={(v) => eur(v)} to="/finance" icon={<FileText size={15} />} sub={`${num(apps.count)} awaiting payment`} />,
        <Kpi key="b" label="Over 60 days" value={over60Value} format={(v) => eur(v)} to="/finance" icon={<Hourglass size={15} />} sub={`${over60All.length} applications`} />,
        <Kpi key="c" label="Retentions held" value={ret} format={(v) => eur(v)} to="/finance" icon={<PiggyBank size={15} />} sub="Live and handover jobs" />,
        <Kpi key="d" label="Cash in, 30 days" value={cash} format={(v) => eur(v)} to="/finance" icon={<Coins size={15} />} sub="Matched to applications" />,
        <Kpi key="e" label="Work in progress" value={wip} format={(v) => eur(v)} to="/finance" icon={<Layers size={15} />} sub="Earned, not yet certified" />,
        <Kpi key="f" label="Cut-offs this week" value={cutoffs.length} to="/finance" icon={<CalendarDays size={15} />} sub="Not yet submitted" />,
      ]}
      main={
        <>
          <Card delay={0.1} strong>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand">
                    <Sparkles size={15} />
                  </span>
                  <h3 className="text-[15px] font-semibold text-ink">Thurrock October application is drafted</h3>
                  <Pill tone={thurrockStatus === 'Submitted' ? 'ok' : 'warn'}>{thurrockStatus}</Pill>
                </div>
                <p className="mt-1.5 text-[13px] text-ink-2">
                  Valuation Agent built it from{' '}
                  <span className="font-semibold text-ink tnum">{thurrock ? metres(installed(thurrock)) : '0 m'}</span> installed of{' '}
                  <span className="tnum">{thurrock ? metres(designed(thurrock)) : '0 m'}</span> and agreed variations. Northwold&apos;s cut-off is Thursday 8 October.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <MiniStat label="Complete" value={thurrock ? pct(jobPct(thurrock)) : '0%'} />
                  <MiniStat label="Earned to date" value={thurrock ? eur(toEur(earned(thurrock), thurrock.currency)) : '€0'} />
                  <MiniStat label="Cut-off" value={`${daysUntil('2026-10-08')} days`} />
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 lg:w-[200px]">
                <Button variant="primary" icon={<FileText size={15} />} onClick={() => nav('/finance')}>
                  {thurrockStatus === 'Submitted' ? 'View submission' : 'Review and approve'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => nav('/projects/CE-2309')}>
                  Open job
                </Button>
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Aged debt" subtitle="Certified, unpaid · group €" icon={<BarChart3 size={15} />} height={220} delay={0.14}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agedData} margin={{ top: 16, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" {...axisProps} />
                  <YAxis {...axisProps} width={58} tickFormatter={(v: number) => eur(v)} />
                  <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={rateTip((v) => eur(v, false))} />
                  <Bar dataKey="value" name="Unpaid" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 11, fill: 'var(--c-ink-3)', formatter: (v: unknown) => eur(Number(v)) }}>
                    {agedData.map((d, i) => (
                      <Cell key={d.bucket} fill={i === 0 ? CHART.brand : i === 1 ? CHART.brand2 : i === 2 ? CHART.warn : CHART.bad} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <Card delay={0.18}>
              <CardHeader title="Oldest unpaid applications" subtitle="Days since submission" icon={<Hourglass size={15} />} />
              <div className="-mx-1">
                {oldest.map(({ v, job, age }) => (
                  <Row key={v.id} onClick={() => nav(`/projects/${job.id}`)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{job.name}</span>
                      <span className="block truncate text-[11.5px] text-ink-3">
                        {job.mainContractor} · application {v.appNo}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[12.5px] font-medium text-ink tnum">{eur(toEur(v.certified ?? v.applied, job.currency))}</span>
                      <span className={clsx('block text-[11.5px] tnum', age > 60 ? 'text-bad' : 'text-warn')}>{age} days</span>
                    </span>
                  </Row>
                ))}
              </div>
            </Card>
          </div>
        </>
      }
      links={[
        { to: '/finance', label: 'Applications for payment', icon: <FileText size={15} />, hint: 'Drafts, cut-offs and certificates' },
        { to: '/projects/CE-2298', label: 'Slough data hall', icon: <Hourglass size={15} />, hint: 'Application 74 days unpaid' },
        { to: '/finance', label: 'Grange Castle VO-244', icon: <Receipt size={15} />, hint: 'Verbal instruction to price' },
        { to: '/integrations', label: 'Accounts integration', icon: <Banknote size={15} />, hint: 'How payments are matched' },
      ]}
    />
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-sunk px-3 py-2">
      <div className="truncate text-[11px] text-ink-3">{label}</div>
      <div className="truncate text-[15px] font-semibold text-ink tnum">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------- Julia (Sustainability / HSQE)
/** demo factor: offcut waste and site deliveries avoided per metre prefabricated */
const CO2_KG_PER_M = 0.42;

function JuliaHome() {
  const nav = useNavigate();
  const jobs = useStore((s) => s.jobs);
  const nm = nearMisses30();
  const ramsOk = RAMS.filter((r) => r.status === 'Approved').length;
  const ramsAction = RAMS.filter((r) => r.status !== 'Approved');
  const ncrOpen = NCRS.filter((n) => n.status === 'Open');
  const totalInstalled = jobs.reduce((a, j) => a + installed(j), 0);
  const carbonT = (totalInstalled * CO2_KG_PER_M) / 1000;
  const recent = HS_ITEMS.filter((h) => daysUntil(h.date) >= -30);
  const hsTypes = ['Toolbox talk', 'Audit', 'Near miss', 'Incident'] as const;
  const hsData = hsTypes.map((t) => ({ type: t, Count: recent.filter((h) => h.type === t).length }));
  const toolbox = HS_ITEMS.filter((h) => h.type === 'Toolbox talk').length;
  const audits = HS_ITEMS.filter((h) => h.type === 'Audit').length;
  const ncrClosed = NCRS.filter((n) => n.status === 'Closed').length;
  const evidence = [
    { std: 'ISO 45001', what: 'Toolbox talks, audits, RAMS', have: toolbox + audits + ramsOk, need: toolbox + audits + RAMS.length },
    { std: 'ISO 9001', what: 'NCRs closed, drawing control', have: ncrClosed + 40, need: NCRS.length + 40 },
    { std: 'ISO 14001', what: 'Waste and carbon records', have: 22, need: 24 },
    { std: 'EcoVadis', what: 'Policies and supplier evidence', have: 17, need: 21 },
  ];
  const evHave = evidence.reduce((a, e) => a + e.have, 0);
  const evNeed = evidence.reduce((a, e) => a + e.need, 0);

  return (
    <HomeFrame
      role="julia"
      actions={
        <LinkButton to="/hsqe" variant="primary" icon={<Leaf size={15} />}>
          Open HSQE & sustainability
        </LinkButton>
      }
      kpis={[
        <Kpi key="a" label="Near misses, 30 days" value={nm} to="/hsqe" icon={<ShieldAlert size={15} />} sub="Logged from site" />,
        <Kpi key="b" label="RAMS approved" value={RAMS.length ? (ramsOk / RAMS.length) * 100 : 0} format={(v) => `${Math.round(v)}%`} to="/hsqe" icon={<ClipboardCheck size={15} />} sub={`${ramsAction.length} need action`} />,
        <Kpi key="c" label="Open NCRs" value={ncrOpen.length} to="/hsqe" icon={<FileWarning size={15} />} sub={`${NCRS.length} raised this year`} />,
        <Kpi key="d" label="Carbon saved via prefab" value={carbonT} format={(v) => `${v.toFixed(1)} t`} to="/hsqe" icon={<Recycle size={15} />} sub="CO₂e, estimate" />,
        <Kpi key="e" label="ISO & EcoVadis evidence" value={evNeed > 0 ? (evHave / evNeed) * 100 : 0} format={(v) => `${Math.round(v)}%`} to="/hsqe" icon={<Leaf size={15} />} sub={`${num(evHave)} of ${num(evNeed)} items collected`} />,
      ]}
      main={
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Safety activity, 30 days" subtitle="From foreman and technician apps" icon={<ShieldAlert size={15} />} height={220} delay={0.1}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hsData} margin={{ top: 16, right: 4, bottom: 0, left: -18 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="type" {...axisProps} />
                  <YAxis {...axisProps} width={40} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={rateTip((v) => num(v))} />
                  <Bar dataKey="Count" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 11, fill: 'var(--c-ink-3)' }}>
                    {hsData.map((d) => (
                      <Cell key={d.type} fill={d.type === 'Incident' ? CHART.bad : d.type === 'Near miss' ? CHART.warn : CHART.brand} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <Card delay={0.14}>
              <CardHeader title="Certification evidence" subtitle="Collected by the Compliance Agent as work happens" icon={<Leaf size={15} />} />
              <div className="space-y-3">
                {evidence.map((e) => (
                  <div key={e.std}>
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-ink">{e.std}</span> <span className="text-ink-3">· {e.what}</span>
                      </span>
                      <span className="shrink-0 text-ink-3 tnum">
                        {e.have}/{e.need}
                      </span>
                    </div>
                    <Progress value={e.need > 0 ? e.have / e.need : 0} tone={e.have / Math.max(1, e.need) >= 0.9 ? 'ok' : 'warn'} className="mt-1.5" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card delay={0.18}>
            <CardHeader title="RAMS needing action" subtitle="Revision required, submitted or missing" icon={<ClipboardCheck size={15} />} action={<LinkButton to="/hsqe" size="sm" variant="ghost">All RAMS</LinkButton>} />
            <div className="-mx-1">
              {ramsAction.slice(0, 6).map((r) => {
                const j = jobs.find((x) => x.id === r.jobId);
                if (!j) return null;
                return (
                  <Row key={r.jobId} onClick={() => nav(`/projects/${j.id}`)}>
                    <HealthDot health={j.health} />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                      {j.name} <span className="text-ink-3">· {j.location}</span>
                    </span>
                    <span className="text-[12px] text-ink-3 tnum">Rev {r.rev}</span>
                    <Pill tone={r.status === 'Revision required' || r.status === 'Missing' ? 'bad' : 'warn'}>{r.status}</Pill>
                  </Row>
                );
              })}
            </div>
          </Card>
          <Card delay={0.2}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ok-soft text-ok">
                <Recycle size={18} />
              </span>
              <p className="min-w-0 flex-1 text-[13px] text-ink-2">
                <span className="font-semibold text-ink tnum">{metres(totalInstalled)}</span> installed from prefabricated spools on live jobs. At {CO2_KG_PER_M} kg CO₂e per metre (offcuts and van runs avoided), that is about{' '}
                <span className="font-semibold text-ink tnum">{carbonT.toFixed(1)} t</span> saved, ready for the EcoVadis environment theme.
              </p>
              <Button size="sm" icon={<Leaf size={14} />} onClick={() => useStore.getState().toast({ title: 'Carbon summary added to evidence pack', detail: 'ISO 14001 and EcoVadis environment theme updated.', tone: 'success' })}>
                Add to evidence pack
              </Button>
            </div>
          </Card>
        </>
      }
      links={[
        { to: '/hsqe', label: 'HSQE & sustainability', icon: <Leaf size={15} />, hint: 'Near misses, RAMS, NCRs' },
        { to: '/crews', label: 'Tickets and training', icon: <Users size={15} />, hint: 'IPAF renewals for Ringaskiddy' },
        { to: '/projects/CE-2340', label: 'Milton Keynes RAMS', icon: <TriangleAlert size={15} />, hint: 'Revised sequence needs RAMS' },
        { to: '/handover', label: 'Handover packs', icon: <ClipboardCheck size={15} />, hint: 'Certificates and O&M' },
      ]}
    />
  );
}

// ---------------------------------------------------------------- router
const HOME_ROLES: HomeRole[] = ['eugene', 'robert', 'stephen', 'aaron', 'valerie', 'julia'];

export default function RoleHome() {
  const stored = useStore((s) => s.role);
  const { role: param } = useParams();
  // the URL wins so the right home renders on the first frame
  const role = HOME_ROLES.find((r) => r === param) ?? stored;
  switch (role) {
    case 'eugene':
      return <EugeneHome />;
    case 'robert':
      return <RobertHome />;
    case 'stephen':
      return <StephenHome />;
    case 'aaron':
      return <AaronHome />;
    case 'valerie':
      return <ValerieHome />;
    case 'julia':
      return <JuliaHome />;
    default:
      return <EugeneHome />;
  }
}
