import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ArrowUpDown, LayoutGrid, List, Search, Sparkles, Users, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Health, Job, JobStage, Sector } from '../data/types';
import { SECTORS } from '../data/types';
import { VARIATIONS } from '../data/seed';
import { crewsOn, designed, installed, jobPct, TODAY_DAY } from '../data/metrics';
import { useStore } from '../store/useStore';
import { ago, daysUntil, fmtDate, parse } from '../lib/dates';
import { num, pct } from '../lib/format';
import { Card, clsx, HealthDot, HealthPill, healthLabel, PageHeader, Pill, Progress, Segmented } from '../components/ui';
import {
  crewForeman,
  crewShort,
  crewSize,
  CrewDot,
  deltaLabel,
  deltaTone,
  jobLastUpdate,
  mcLabel,
  programmeDelta,
  sourceIcon,
  SourceBadge,
  toneText,
  ValuationPill,
} from '../components/projects/shared';

type RegionFilter = 'all' | 'IE' | 'UK' | 'overseas';
type HealthFilter = 'all' | Health;
type SortKey = 'name' | 'pct' | 'health' | 'update' | 'programme' | 'milestone';
type View = 'table' | 'stand';

const STAGES: JobStage[] = ['Design', 'Prefabrication', 'Install', 'Testing & commissioning', 'Handover'];
const healthRank: Record<Health, number> = { blocked: 0, 'at-risk': 1, 'on-track': 2 };
const openVoCount = (id: string) => VARIATIONS.filter((v) => v.jobId === id && (v.status === 'Instructed (verbal)' || v.status === 'Pending pricing' || v.status === 'Submitted')).length;
const ts = (iso: string) => parse(iso).getTime();

export default function Projects() {
  const jobs = useStore((s) => s.jobs);
  const allocation = useStore((s) => s.allocation);
  const recentlyUpdated = useStore((s) => s.recentlyUpdated);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'stand' ? 'stand' : 'table';
  const setView = (v: View) => setParams(v === 'stand' ? { view: 'stand' } : {}, { replace: true });

  const [q, setQ] = useState('');
  const [region, setRegion] = useState<RegionFilter>('all');
  const [sector, setSector] = useState<Sector | 'all'>('all');
  const [stage, setStage] = useState<JobStage | 'all'>('all');
  const [health, setHealth] = useState<HealthFilter>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'update', dir: -1 });

  const base = useMemo(() => {
    const s = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (region === 'IE' && j.region !== 'IE') return false;
      if (region === 'UK' && j.region !== 'UK') return false;
      if (region === 'overseas' && (j.region === 'IE' || j.region === 'UK')) return false;
      if (sector !== 'all' && j.sector !== sector) return false;
      if (stage !== 'all' && j.stage !== stage) return false;
      if (s && !`${j.name} ${j.id} ${j.location} ${j.mainContractor} ${j.client} ${j.consultant ?? ''}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [jobs, q, region, sector, stage]);

  const counts = useMemo(
    () => ({
      all: base.length,
      'on-track': base.filter((j) => j.health === 'on-track').length,
      'at-risk': base.filter((j) => j.health === 'at-risk').length,
      blocked: base.filter((j) => j.health === 'blocked').length,
    }),
    [base],
  );

  const rows = useMemo(() => {
    const list = health === 'all' ? [...base] : base.filter((j) => j.health === health);
    const cmp = (a: Job, b: Job): number => {
      switch (sort.key) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'pct':
          return jobPct(a) - jobPct(b);
        case 'health':
          return healthRank[a.health] - healthRank[b.health] || programmeDelta(a) - programmeDelta(b);
        case 'programme':
          return programmeDelta(a) - programmeDelta(b);
        case 'milestone':
          return a.nextMilestone.date.localeCompare(b.nextMilestone.date);
        case 'update':
        default:
          return ts(jobLastUpdate(a).at) - ts(jobLastUpdate(b).at);
      }
    };
    list.sort((a, b) => cmp(a, b) * sort.dir);
    // Jobs touched from the field app this session float to the top on the default sort
    if (sort.key === 'update' && sort.dir === -1 && recentlyUpdated.length) {
      list.sort((a, b) => Number(recentlyUpdated.includes(b.id)) - Number(recentlyUpdated.includes(a.id)));
    }
    return list;
  }, [base, health, sort, recentlyUpdated]);

  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'name' || key === 'milestone' ? 1 : -1 }));

  const updated24h = rows.filter((j) => recentlyUpdated.includes(j.id) || ts(jobLastUpdate(j).at) > ts('2026-10-05T08:30:00')).length;
  const filtersOn = q || region !== 'all' || sector !== 'all' || stage !== 'all' || health !== 'all';

  return (
    <div>
      <PageHeader
        eyebrow="Delivery"
        title="Projects & Sites"
        subtitle={`${jobs.length} jobs across Ireland, the UK and overseas. Every site's progress, crew and programme, updated from the foreman and technician apps.`}
        actions={
          <Segmented<View>
            value={view}
            onChange={setView}
            options={[
              { value: 'table', label: <span className="inline-flex items-center gap-1.5"><List size={14} />Table</span> },
              { value: 'stand', label: <span className="inline-flex items-center gap-1.5"><LayoutGrid size={14} />Where each job stands</span> },
            ]}
          />
        }
      />

      {/* filters */}
      <Card className="mb-4 !p-3" strong>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search job, ID, place, contractor"
              className="h-9 w-full rounded-full bg-sunk pl-9 pr-8 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-[var(--c-brand-soft)]"
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-3 hover:text-ink" aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>
          <Segmented<RegionFilter>
            size="sm"
            value={region}
            onChange={setRegion}
            options={[
              { value: 'all', label: 'All' },
              { value: 'IE', label: 'IE' },
              { value: 'UK', label: 'UK' },
              { value: 'overseas', label: 'Overseas' },
            ]}
          />
          <Select value={sector} onChange={(v) => setSector(v as Sector | 'all')} options={[['all', 'All sectors'], ...SECTORS.map((s) => [s, s] as [string, string])]} />
          <Select value={stage} onChange={(v) => setStage(v as JobStage | 'all')} options={[['all', 'All stages'], ...STAGES.map((s) => [s, s] as [string, string])]} />
          <Segmented<HealthFilter>
            size="sm"
            value={health}
            onChange={setHealth}
            options={[
              { value: 'all', label: 'Any health' },
              { value: 'on-track', label: 'On track' },
              { value: 'at-risk', label: 'At risk' },
              { value: 'blocked', label: 'Blocked' },
            ]}
          />
          {filtersOn && (
            <button
              onClick={() => {
                setQ('');
                setRegion('all');
                setSector('all');
                setStage('all');
                setHealth('all');
              }}
              className="text-[12.5px] font-medium text-brand hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </Card>

      {/* summary chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={health === 'all'} onClick={() => setHealth('all')}>
          <span className="tnum font-semibold text-ink">{counts.all}</span> jobs
        </Chip>
        {(['on-track', 'at-risk', 'blocked'] as Health[]).map((h) => (
          <Chip key={h} active={health === h} onClick={() => setHealth(health === h ? 'all' : h)}>
            <HealthDot health={h} />
            <span className="tnum font-semibold text-ink">{counts[h]}</span> {healthLabel(h).toLowerCase()}
          </Chip>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
          <Sparkles size={13} className="text-brand-2" />
          {updated24h} of {rows.length} updated in the last 24 hours, no phone calls needed
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {view === 'table' ? (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <JobsTable rows={rows} sort={sort} onSort={onSort} allocation={allocation} recentlyUpdated={recentlyUpdated} onOpen={(id) => navigate(`/projects/${id}`)} />
          </motion.div>
        ) : (
          <motion.div key="stand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <StandGrid rows={rows} allocation={allocation} recentlyUpdated={recentlyUpdated} onOpen={(id) => navigate(`/projects/${id}`)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- table
function JobsTable({
  rows,
  sort,
  onSort,
  allocation,
  recentlyUpdated,
  onOpen,
}: {
  rows: Job[];
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (k: SortKey) => void;
  allocation: ReturnType<typeof useStore.getState>['allocation'];
  recentlyUpdated: string[];
  onOpen: (id: string) => void;
}) {
  const H = ({ k, children, className, align }: { k?: SortKey; children: ReactNode; className?: string; align?: 'right' }) => (
    <th
      className={clsx(
        'sticky top-0 z-[2] whitespace-nowrap border-b hairline bg-[var(--c-surface-strong)] px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3 backdrop-blur-xl first:rounded-tl-[22px] last:rounded-tr-[22px]',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {k ? (
        <button onClick={() => onSort(k)} className={clsx('inline-flex items-center gap-1 uppercase hover:text-ink', sort.key === k && 'text-ink')}>
          {children}
          {sort.key === k ? sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : <ArrowUpDown size={11} className="opacity-40" />}
        </button>
      ) : (
        children
      )}
    </th>
  );
  return (
    <Card padded={false}>
      <table className="w-full table-fixed border-separate border-spacing-0 text-left text-[13px]">
        <colgroup>
          <col />
          <col className="w-[140px] max-[1520px]:hidden" />
          <col className="w-[150px]" />
          <col className="w-[118px]" />
          <col className="w-[124px]" />
          <col className="w-[138px] max-[1400px]:hidden" />
          <col className="w-[104px]" />
          <col className="w-[150px]" />
        </colgroup>
        <thead>
          <tr>
            <H k="name" className="pl-5">Job</H>
            <H className="max-[1520px]:hidden">Sector / MC</H>
            <H k="pct">Progress</H>
            <H>Crew today</H>
            <H k="health">Programme</H>
            <H k="milestone" className="max-[1400px]:hidden">Next milestone</H>
            <H>Valuation</H>
            <H k="update" className="pr-5">Last site update</H>
          </tr>
        </thead>
        <tbody>
          {rows.map((j) => {
            const fresh = recentlyUpdated.includes(j.id);
            const crews = crewsOn(allocation, j.id, TODAY_DAY);
            const delta = programmeDelta(j);
            const mc = mcLabel(j);
            const lu = jobLastUpdate(j);
            const vos = openVoCount(j.id);
            const td = 'border-b hairline px-3 py-3 align-middle';
            return (
              <tr
                key={j.id}
                onClick={() => onOpen(j.id)}
                className={clsx('group cursor-pointer transition-colors hover:bg-sunk', fresh && 'bg-brand-soft')}
              >
                <td className={clsx(td, 'pl-5')}>
                  <div className="flex min-w-0 items-center gap-2">
                    <HealthDot health={j.health} />
                    <span className="truncate font-medium text-ink group-hover:text-brand" title={j.name}>
                      {j.name}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate pl-4 text-[11.5px] text-ink-3">
                    <span className="tnum">{j.id}</span> · {j.location}
                  </div>
                </td>
                <td className={clsx(td, 'max-[1520px]:hidden')}>
                  <div className="truncate text-ink-2">{j.sector}</div>
                  <div className={clsx('truncate text-[11.5px]', mc.muted ? 'text-ink-3 italic' : 'text-ink-3')} title={mc.text}>
                    {mc.text}
                  </div>
                </td>
                <td className={td}>
                  <div className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="truncate text-ink-3">{j.stage === 'Testing & commissioning' ? 'T&C' : j.stage}</span>
                    <span className="tnum font-semibold text-ink">{pct(jobPct(j))}</span>
                  </div>
                  <Progress value={jobPct(j)} height={5} className="mt-1" tone={j.designOnly ? 'accent' : 'brand'} />
                  <div className="mt-1 truncate text-[11px] text-ink-3 tnum">
                    {j.designOnly ? 'Design only' : `${num(installed(j))} / ${num(designed(j))} m`}
                  </div>
                </td>
                <td className={td}>
                  {crews.length === 0 ? (
                    <span className="text-[12.5px] text-ink-3">None</span>
                  ) : (
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate text-[12.5px] font-medium text-ink">
                        <CrewDot id={crews[0]} />
                        {crews.map(crewShort).join(', ')}
                      </div>
                      <div className="truncate text-[11.5px] text-ink-3">
                        {crewForeman(crews[0]).split(' ')[0]} · {crews.reduce((a, c) => a + crewSize(c), 0)} on site
                      </div>
                    </div>
                  )}
                </td>
                <td className={td}>
                  <HealthPill health={j.health} />
                  <div className={clsx('mt-1 text-[11.5px] tnum', toneText[deltaTone(delta)])}>{deltaLabel(delta)}</div>
                </td>
                <td className={clsx(td, 'max-[1400px]:hidden')}>
                  <div className="truncate text-[12.5px] text-ink-2" title={j.nextMilestone.name}>
                    {j.nextMilestone.name}
                  </div>
                  <div className="text-[11.5px] text-ink-3 tnum">{fmtDate(j.nextMilestone.date, { weekday: true })}</div>
                </td>
                <td className={td}>
                  <ValuationPill status={j.valuationStatus} />
                  <div className={clsx('mt-1 text-[11.5px] tnum', vos ? 'text-ink-2' : 'text-ink-3')}>{vos ? `${vos} open VO${vos === 1 ? '' : 's'}` : 'No open VOs'}</div>
                </td>
                <td className={clsx(td, 'pr-5')}>
                  {fresh ? (
                    <Pill tone="brand" dot className="animate-pulse">
                      Updated just now
                    </Pill>
                  ) : (
                    <div className="truncate text-[12.5px] font-medium text-ink tnum">{ago(lu.at)}</div>
                  )}
                  <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[11.5px] text-ink-3" title={`${lu.source} · ${lu.by}`}>
                    <span className="shrink-0">{sourceIcon(lu.source, 11)}</span>
                    <span className="truncate">{lu.source}</span>
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-5 py-10 text-center text-[13px] text-ink-3">
                No jobs match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

// ---------------------------------------------------------------- "where each job stands" grid
function StandGrid({
  rows,
  allocation,
  recentlyUpdated,
  onOpen,
}: {
  rows: Job[];
  allocation: ReturnType<typeof useStore.getState>['allocation'];
  recentlyUpdated: string[];
  onOpen: (id: string) => void;
}) {
  return (
    <div>
      <Card className="mb-4 flex flex-wrap items-center gap-4 !py-4" strong>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink">Where does each job truly stand?</div>
          <div className="text-[13px] text-ink-2">
            The last word from every site, who said it and how, today's crew and the next milestone. Read in a minute instead of ringing round the foremen.
          </div>
        </div>
      </Card>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
        {rows.map((j, i) => {
          const fresh = recentlyUpdated.includes(j.id);
          const crews = crewsOn(allocation, j.id, TODAY_DAY);
          const lu = jobLastUpdate(j);
          const delta = programmeDelta(j);
          const due = daysUntil(j.nextMilestone.date);
          const needsCrew = !j.designOnly && j.stage === 'Install' && j.workReady && j.health !== 'blocked' && crews.length === 0;
          return (
            <Card
              key={j.id}
              delay={Math.min(i, 12) * 0.025}
              onClick={() => onOpen(j.id)}
              className={clsx('relative flex flex-col !p-4', fresh && 'ring-2 ring-[var(--c-brand)]')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <HealthDot health={j.health} />
                    <span className="truncate text-[14px] font-semibold text-ink" title={j.name}>
                      {j.name}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate pl-4 text-[11.5px] text-ink-3">
                    {j.id} · {j.stage} · {pct(jobPct(j))}
                  </div>
                </div>
                {fresh ? <Pill tone="brand" dot>Just now</Pill> : <HealthPill health={j.health} />}
              </div>

              <div className="mt-3 rounded-2xl bg-sunk px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={clsx('text-[13px] font-semibold tnum', fresh ? 'text-brand' : 'text-ink')}>{fresh ? 'Updated just now' : ago(lu.at)}</span>
                  <SourceBadge source={lu.source} />
                </div>
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-ink-2">{lu.note}</p>
                <div className="mt-1 truncate text-[11.5px] text-ink-3">{lu.by}</div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-ink-3">
                    <Users size={11} /> Crew today
                  </div>
                  {crews.length ? (
                    <div className="mt-0.5 flex items-center gap-1.5 truncate font-medium text-ink">
                      <CrewDot id={crews[0]} />
                      {crews.map(crewShort).join(', ')} · {crews.reduce((a, c) => a + crewSize(c), 0)}
                    </div>
                  ) : (
                    <div className={clsx('mt-0.5 font-medium', needsCrew ? 'text-warn' : 'text-ink-3')}>{needsCrew ? 'None, work ready' : j.designOnly ? 'Design only' : 'None'}</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-ink-3">Next milestone</div>
                  <div className="mt-0.5 truncate font-medium text-ink" title={j.nextMilestone.name}>
                    {j.nextMilestone.name}
                  </div>
                  <div className="text-[11px] text-ink-3 tnum">
                    {fmtDate(j.nextMilestone.date)} · {due === 0 ? 'today' : due > 0 ? `in ${due} days` : `${-due} days ago`}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t hairline pt-2.5 text-[11.5px]">
                <span className={clsx('tnum font-medium', toneText[deltaTone(delta)])}>{deltaLabel(delta)}</span>
                <ValuationPill status={j.valuationStatus} />
              </div>
            </Card>
          );
        })}
      </div>
      {rows.length === 0 && <div className="py-10 text-center text-[13px] text-ink-3">No jobs match these filters.</div>}
    </div>
  );
}

// ---------------------------------------------------------------- bits
function Chip({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] text-ink-2 transition',
        active ? 'glass-strong shadow-sm ring-1 ring-[var(--c-brand-soft)]' : 'bg-sunk hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-full bg-sunk px-3 pr-7 text-[12.5px] font-medium text-ink-2 outline-none focus:ring-2 focus:ring-[var(--c-brand-soft)]"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
