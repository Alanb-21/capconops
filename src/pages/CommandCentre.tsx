// Donnacha's Command Centre: every live site, crew, valuation and tender on one screen.
import {
  Banknote,
  BarChart3,
  ClipboardCheck,
  FileText,
  Gauge,
  Layers,
  MapPin,
  Ruler,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useMemo } from 'react';
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AgentsNow, AttentionFeed, ChartCard, GREETING_DATE, LegendDot, crewsOut } from '../components/home/HomeParts';
import { SiteMap } from '../components/map/SiteMap';
import { CHART, ChartTooltip, axisProps } from '../components/charts';
import { Kpi, LinkButton, PageHeader, Sparkline } from '../components/ui';
import {
  cashReceived,
  crewUtilisation,
  handoverOutstanding,
  maintVisitsDue,
  nearMisses30,
  openTenders,
  outstandingApps,
  pipelineValueEur,
  plannedThisWeek,
  regionSplit,
  revenueVsCost,
  weekToDate,
  weeklyMetres,
  winRate,
  winRateBySector,
  wipEur,
} from '../data/metrics';
import { useStore } from '../store/useStore';
import { eur, metres, num, pct } from '../lib/format';
import { fmtMonth, weekLabel } from '../lib/dates';

/** Plan to date: Monday's share of the week's plan (it is 08:30 Tuesday). */
const PLAN_SHARE_TO_DATE = 1 / 5;

export default function CommandCentre() {
  const jobs = useStore((s) => s.jobs);
  const allocation = useStore((s) => s.allocation);
  const valuations = useStore((s) => s.valuations);
  const tenders = useStore((s) => s.tenders);
  const approvals = useStore((s) => s.approvals);

  const split = regionSplit(jobs);
  const crews = crewsOut(allocation);
  const pending = approvals.filter((a) => a.status === 'Pending').length;
  const wtd = weekToDate(jobs);
  const planWeek = plannedThisWeek(jobs);
  const planToDate = Math.round(planWeek * PLAN_SHARE_TO_DATE);
  const weekly = weeklyMetres(jobs);
  const lastWeek = weekly[weekly.length - 1] ?? 0;
  const util = crewUtilisation(allocation);
  const wip = wipEur(jobs, valuations);
  const apps = outstandingApps(jobs, valuations);
  const cash = cashReceived(jobs, valuations, 30);
  const pipeline = pipelineValueEur(tenders);
  const open = openTenders(tenders).length;
  const wr = winRate(tenders);
  const handover = handoverOutstanding(jobs).length;
  const nm = nearMisses30();
  const visits = maintVisitsDue(30);
  const wtdRatio = planToDate > 0 ? wtd / planToDate : 0;

  const metresData = useMemo(() => {
    const ie = weeklyMetres(jobs, 'IE');
    const uk = weeklyMetres(jobs, 'UK');
    const rows = ie.map((v, i) => ({ week: weekLabel(i - 12), IE: v, UK: uk[i] ?? 0, current: false }));
    rows.push({
      week: 'Now',
      IE: weekToDate(jobs.filter((j) => j.region === 'IE')),
      UK: weekToDate(jobs.filter((j) => j.region === 'UK')),
      current: true,
    });
    return rows;
  }, [jobs]);

  const rvc = useMemo(
    () => revenueVsCost(jobs, valuations).map((r) => ({ ...r, label: fmtMonth(r.month), margin: r.revenue > 0 ? (r.revenue - r.cost) / r.revenue : 0 })),
    [jobs, valuations],
  );
  const rev12 = rvc.reduce((a, r) => a + r.revenue, 0);
  const cost12 = rvc.reduce((a, r) => a + r.cost, 0);
  const margin12 = rev12 > 0 ? (rev12 - cost12) / rev12 : 0;

  const wrs = useMemo(() => winRateBySector(tenders).sort((a, b) => b.rate - a.rate), [tenders]);

  return (
    <div>
      <PageHeader
        eyebrow={GREETING_DATE}
        title="Good morning, Donnacha"
        subtitle={
          <span className="tnum">
            {num(jobs.length)} live jobs · {crews.out} crews out · {pending} approval{pending === 1 ? '' : 's'} waiting
          </span>
        }
        actions={
          <>
            <LinkButton to="/crews" icon={<Users size={15} />}>
              Plan crews
            </LinkButton>
            <LinkButton to="/agents" variant="primary" icon={<ClipboardCheck size={15} />}>
              Review {pending} approval{pending === 1 ? '' : 's'}
            </LinkButton>
          </>
        }
      />

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Kpi
          label="Live sites"
          value={jobs.length}
          to="/projects"
          icon={<MapPin size={15} />}
          sub={
            <span className="tnum">
              {split.IE} IE · {split.UK} UK · {split.overseas} overseas
            </span>
          }
          delay={0}
        />
        <Kpi
          label="Metres installed this week"
          value={wtd}
          format={(v) => metres(v)}
          to="/projects"
          icon={<Ruler size={15} />}
          delta={pct(wtdRatio)}
          deltaTone={wtdRatio >= 0.95 ? 'ok' : wtdRatio >= 0.8 ? 'warn' : 'bad'}
          sub={
            <span className="tnum">
              Plan {metres(planToDate)} · last wk {metres(lastWeek)}
            </span>
          }
          delay={0.03}
        />
        <Kpi
          label="Crew utilisation"
          value={util * 100}
          format={(v) => `${Math.round(v)}%`}
          to="/crews"
          icon={<Gauge size={15} />}
          sub={
            <span className="tnum">
              {crews.out} of {crews.total} crews out today
            </span>
          }
          delay={0.06}
        />
        <Kpi label="Work in progress" value={wip} format={(v) => eur(v)} to="/finance" icon={<Layers size={15} />} sub="Earned, not yet certified" delay={0.09} />
        <Kpi
          label="Applications outstanding"
          value={apps.value}
          format={(v) => eur(v)}
          to="/finance"
          icon={<FileText size={15} />}
          sub={<span className="tnum">{num(apps.count)} awaiting payment</span>}
          delay={0.12}
        />
        <Kpi label="Cash received, 30 days" value={cash} format={(v) => eur(v)} to="/finance" icon={<Banknote size={15} />} sub="Matched to applications" delay={0.15} />
        <Kpi
          label="Tender pipeline"
          value={pipeline}
          format={(v) => eur(v)}
          to="/tenders"
          icon={<Target size={15} />}
          sub={
            <span className="tnum">
              {open} open · {pct(wr)} win rate
            </span>
          }
          delay={0.18}
        />
        <Kpi label="Certs & handover packs" value={handover} to="/handover" icon={<ClipboardCheck size={15} />} sub="Testing and handover jobs" delay={0.21} />
        <Kpi label="Near misses, 30 days" value={nm} to="/hsqe" icon={<ShieldAlert size={15} />} sub="Logged from site" delay={0.24} />
        <Kpi label="Maintenance visits due" value={visits} to="/maintenance" icon={<Wrench size={15} />} sub="Planned in the next 30 days" delay={0.27} />
      </div>

      {/* Map + attention */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <SiteMap jobs={jobs} className="xl:col-span-8" delay={0.12} />
        <AttentionFeed role="donnacha" className="xl:col-span-4" height={420} delay={0.18} />
      </div>

      <AgentsNow className="mt-5" delay={0.2} />

      {/* Trends */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard
          title="Metres installed per week"
          subtitle={<span className="tnum">12 weeks and this week to date</span>}
          icon={<BarChart3 size={15} />}
          action={
            <div className="flex gap-3">
              <LegendDot color={CHART.brand} label="IE" />
              <LegendDot color={CHART.brand2} label="UK" />
            </div>
          }
          delay={0.22}
          footer={
            <div className="mt-3 flex items-center justify-between border-t hairline pt-3 text-[12px] text-ink-3">
              <span>12-week trend</span>
              <Sparkline data={weekly} width={140} height={24} />
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metresData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="week" {...axisProps} interval={2} />
              <YAxis {...axisProps} width={48} tickFormatter={(v: number) => num(v)} />
              <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={<ChartTooltip format={(v) => metres(v)} />} />
              <Bar dataKey="IE" stackId="m" fill={CHART.brand} isAnimationActive>
                {metresData.map((d) => (
                  <Cell key={d.week} fillOpacity={d.current ? 0.45 : 1} />
                ))}
              </Bar>
              <Bar dataKey="UK" stackId="m" fill={CHART.brand2} radius={[4, 4, 0, 0]}>
                {metresData.map((d) => (
                  <Cell key={d.week} fillOpacity={d.current ? 0.45 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Revenue vs cost"
          subtitle={
            <span className="tnum">
              12 months · group € · {pct(margin12, 1)} margin
            </span>
          }
          icon={<TrendingUp size={15} />}
          action={
            <div className="flex gap-3">
              <LegendDot color={CHART.brand} label="Revenue" />
              <LegendDot color={CHART.muted} label="Cost" />
            </div>
          }
          delay={0.25}
          height={276}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rvc} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="cc-rev" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={CHART.brand} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" {...axisProps} interval={2} />
              <YAxis {...axisProps} width={58} tickFormatter={(v: number) => eur(v)} />
              <Tooltip content={<ChartTooltip format={(v) => eur(v)} />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke={CHART.brand} strokeWidth={2} fill="url(#cc-rev)" />
              <Line type="monotone" dataKey="cost" name="Cost" stroke={CHART.muted} strokeWidth={1.75} strokeDasharray="4 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Tender win rate by sector"
          subtitle={<span className="tnum">Won vs lost, last 12 months · overall {pct(wr)}</span>}
          icon={<Target size={15} />}
          delay={0.28}
          height={276}
          className="lg:col-span-2 xl:col-span-1"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={wrs} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap="28%">
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 1]} {...axisProps} tickFormatter={(v: number) => pct(v)} ticks={[0, 0.25, 0.5, 0.75, 1]} />
              <YAxis type="category" dataKey="sector" {...axisProps} width={96} />
              <Tooltip
                cursor={{ fill: 'var(--c-surface-sunk)' }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as (typeof wrs)[number] | undefined;
                  if (!active || !p) return null;
                  return (
                    <div className="glass-strong rounded-xl px-3 py-2 text-[12px] shadow-lg">
                      <div className="font-medium text-ink">{p.sector}</div>
                      <div className="text-ink-2 tnum">
                        {pct(p.rate)} · {p.won} won, {p.lost} lost
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="rate" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11, fill: 'var(--c-ink-3)', formatter: (v: unknown) => pct(Number(v)) }}>
                {wrs.map((d) => (
                  <Cell key={d.sector} fill={d.rate >= wr ? CHART.brand : CHART.brand3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-ink-3">
        <Wallet size={12} /> Demo data. Group totals converted at the demo rate shown beside the Group € toggle.
      </p>
    </div>
  );
}
