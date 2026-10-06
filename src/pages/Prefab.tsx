import { useMemo, useState } from 'react';
import { ArrowRight, Boxes, CalendarDays, ChevronDown, ChevronUp, Factory, Leaf, PackageCheck, Recycle, ShoppingCart, TriangleAlert, Truck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SPOOLS, STOCK } from '../data/seed';
import { SPOOL_STAGES, type Job, type Spool, type SpoolStage } from '../data/types';
import { DAYS } from '../data/types';
import { TODAY_ISO, WEEK_START, addDays, fmtDate, iso, isoAdd } from '../lib/dates';
import { num } from '../lib/format';
import { Button, Card, CardHeader, HealthDot, Kpi, PageHeader, Pill, Progress, SectionTitle, Stat, Drawer, Table, Td, Th, Tr, clsx } from '../components/ui';
import { SpoolLabel, weldCount } from '../components/prefab/SpoolLabel';

const VISIBLE = 6;
const HELD = new Set(SPOOLS.filter((s) => s.jobId === 'CE-2304').slice(0, 8).map((s) => s.id));
const RETEST_DAY = isoAdd(2); // Thu 8 Oct

// Waste and sustainability (YTD figures from the workshop cut log)
const PREFAB_WASTE = 0.021;
const SITE_WASTE_LOW = 0.08;
const SITE_WASTE_HIGH = 0.1;
const HDPE_YTD_KG = 38_600;
const KG_PER_SKIP = 380;
const CO2_PER_KG_HDPE = 1.9;

function addWorkdays(from: string, n: number): string {
  let d = from;
  let left = n;
  while (left > 0) {
    d = isoAdd(1, d);
    const wd = new Date(d + 'T00:00:00').getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}
function prevWorkday(d: string): string {
  let x = isoAdd(-1, d);
  while ([0, 6].includes(new Date(x + 'T00:00:00').getDay())) x = isoAdd(-1, x);
  return x;
}

/** Planned dispatch = working day before the site need date. */
const dispatchDate = (s: Spool) => prevWorkday(s.due);
/** Expected dispatch-ready date given the remaining workshop stages (1 working day each). */
function readyDate(s: Spool): string {
  const idx = SPOOL_STAGES.indexOf(s.stage);
  const dispatchIdx = SPOOL_STAGES.indexOf('Dispatched');
  if (idx >= dispatchIdx) return TODAY_ISO;
  const steps = dispatchIdx - idx;
  if (HELD.has(s.id) && s.stage === 'Pressure tested') return addWorkdays(RETEST_DAY, steps - 1);
  return addWorkdays(TODAY_ISO, steps);
}

/** A spool is late when it will not be ready for its dispatch date and a crew is booked on the job. Showcase jobs are expedited. */
function isLate(s: Spool, j: Job | undefined, crewBooked: boolean): boolean {
  if (s.stage === 'Dispatched' || s.stage === 'On site') return false;
  if (j?.showcase && j.id !== 'CE-2304') return false;
  return crewBooked && readyDate(s) > dispatchDate(s);
}

function jobName(j?: Job) {
  if (!j) return '';
  return j.showcase ? j.shortName : `${j.shortName}, ${j.location.split(',')[0]}`;
}

export default function Prefab() {
  const spools = useStore((s) => s.spools);
  const jobs = useStore((s) => s.jobs);
  const alloc = useStore((s) => s.allocation);
  const moveSpool = useStore((s) => s.moveSpool);
  const toast = useStore((s) => s.toast);
  const pushLog = useStore((s) => s.pushLog);

  const [jobFilter, setJobFilter] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [ordered, setOrdered] = useState<Record<string, number>>({});

  const jobMap = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const jobOptions = useMemo(() => {
    const ids = [...new Set(spools.map((s) => s.jobId))];
    const pinned = ['CE-2291', 'CE-2304'];
    const rest = ids.filter((id) => !pinned.includes(id)).sort((a, b) => jobName(jobMap.get(a)).localeCompare(jobName(jobMap.get(b))));
    return [...pinned.filter((id) => ids.includes(id)), ...rest];
  }, [spools, jobMap]);

  const bookedJobs = useMemo(() => new Set(Object.values(alloc).flatMap((r) => DAYS.map((d) => r[d]).filter((x): x is string => !!x))), [alloc]);
  const shown = jobFilter === 'all' ? spools : spools.filter((s) => s.jobId === jobFilter);
  const byStage = useMemo(() => {
    const m = new Map<SpoolStage, Spool[]>(SPOOL_STAGES.map((st) => [st, []]));
    for (const s of shown) m.get(s.stage)!.push(s);
    for (const list of m.values()) list.sort((a, b) => Number(HELD.has(b.id)) - Number(HELD.has(a.id)) || a.due.localeCompare(b.due));
    return m;
  }, [shown]);

  const inWorkshop = spools.filter((s) => s.stage !== 'Dispatched' && s.stage !== 'On site');
  const heldNow = spools.filter((s) => HELD.has(s.id) && s.stage === 'Pressure tested');
  const next7 = spools.filter((s) => s.stage !== 'On site' && s.stage !== 'Dispatched' && dispatchDate(s) >= TODAY_ISO && dispatchDate(s) <= isoAdd(7));
  const metresInWorkshop = inWorkshop.reduce((a, s) => a + s.length, 0);

  const openSpool = open ? spools.find((s) => s.id === open) : undefined;
  const nextStage = openSpool ? SPOOL_STAGES[SPOOL_STAGES.indexOf(openSpool.stage) + 1] : undefined;

  function advance(s: Spool) {
    const ns = SPOOL_STAGES[SPOOL_STAGES.indexOf(s.stage) + 1];
    if (!ns) return;
    moveSpool(s.id, ns);
    toast({ title: `${s.id} moved to ${ns}`, detail: jobName(jobMap.get(s.jobId)), tone: 'success' });
    if (ns === 'Dispatched') pushLog({ agent: 'progress', text: `${s.id} dispatched from Maynooth to ${jobName(jobMap.get(s.jobId))}, delivery note sent to foreman`, jobId: s.jobId });
  }

  // ------------------------------------------------ dispatch calendar (Mon 5 to Fri 16 Oct)
  const calendar = useMemo(() => {
    const days: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = iso(addDays(WEEK_START, i));
      const wd = new Date(d + 'T00:00:00').getDay();
      if (wd !== 0 && wd !== 6) days.push(d);
    }
    return days.map((d) => {
      const list = spools.filter((s) => s.stage !== 'On site' && dispatchDate(s) === d);
      const byJob = new Map<string, Spool[]>();
      for (const s of list) byJob.set(s.jobId, [...(byJob.get(s.jobId) ?? []), s]);
      const loads = [...byJob.entries()].map(([jobId, ss]) => {
        const crewBooked = bookedJobs.has(jobId);
        const late = ss.filter((s) => isLate(s, jobMap.get(jobId), crewBooked));
        return { jobId, spools: ss, late, clash: late.length > 0 };
      });
      loads.sort((a, b) => Number(b.clash) - Number(a.clash) || b.spools.length - a.spools.length);
      return { date: d, loads, spools: list.length, metres: list.reduce((a, s) => a + s.length, 0) };
    });
  }, [spools, bookedJobs, jobMap]);
  const clashes = calendar.flatMap((c) => c.loads.filter((l) => l.clash).map((l) => ({ ...l, date: c.date })));

  // ------------------------------------------------ stock
  const stock = STOCK.map((st) => {
    const onOrder = st.onOrder + (ordered[st.id] ?? 0);
    const ratio = st.reorderLevel > 0 ? st.onHand / st.reorderLevel : 1;
    const status: 'ok' | 'warn' | 'bad' = ratio >= 1 ? 'ok' : ratio >= 0.6 ? 'warn' : 'bad';
    return { ...st, onOrder, ratio, status };
  });
  const lowStock = stock.filter((s) => s.status !== 'ok');

  function reorder(st: (typeof stock)[number]) {
    const qty = Math.max(50, Math.ceil((st.reorderLevel * 2 - st.onHand) / 10) * 10);
    setOrdered((o) => ({ ...o, [st.id]: (o[st.id] ?? 0) + qty }));
    toast({ title: `Reorder raised: ${qty} m ${st.material} Ø${st.diameter}`, detail: `Purchase order email drafted to ${st.supplier}, waiting for approval`, tone: 'success' });
    pushLog({ agent: 'inbox', text: `Drafted purchase order to ${st.supplier}: ${qty} m ${st.material} Ø${st.diameter} mm (stock ${st.onHand} m, reorder level ${st.reorderLevel} m)` });
  }

  const savedKg = Math.round(HDPE_YTD_KG * ((SITE_WASTE_LOW + SITE_WASTE_HIGH) / 2 - PREFAB_WASTE));
  const skips = Math.round(savedKg / KG_PER_SKIP);
  const co2 = (savedKg * CO2_PER_KG_HDPE) / 1000;

  return (
    <div>
      <PageHeader
        eyebrow="Delivery"
        title="Prefabrication"
        subtitle="Maynooth off-site facility. Spools are cut, fused, pressure tested and labelled in the workshop, then dispatched to match site install dates."
        actions={
          <label className="flex items-center gap-2 text-[12.5px] text-ink-3">
            Job
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="glass-strong h-9 max-w-[280px] rounded-full px-3.5 text-[13px] text-ink outline-none"
              data-testid="job-filter"
            >
              <option value="all">All jobs ({spools.length} spools)</option>
              {jobOptions.map((id) => (
                <option key={id} value={id}>
                  {jobName(jobMap.get(id))} ({spools.filter((s) => s.jobId === id).length})
                </option>
              ))}
            </select>
          </label>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Spools in the workshop" value={inWorkshop.length} sub={`${num(metresInWorkshop)} m of pipework`} icon={<Factory size={15} />} />
        <Kpi label="Dispatching next 7 days" value={next7.length} sub={`${new Set(next7.map((s) => s.jobId)).size} sites`} icon={<Truck size={15} />} delay={0.04} />
        <Kpi label="Held at pressure test" value={heldNow.length} sub="NLHPP Zone C · re-test Thu 8 Oct" deltaTone={heldNow.length ? 'warn' : 'ok'} delta={heldNow.length ? 'held' : 'cleared'} icon={<TriangleAlert size={15} />} delay={0.08} />
        <Kpi label="Offcut waste, prefab" value={PREFAB_WASTE * 100} format={(v) => `${v.toFixed(1)}%`} sub="vs 8–10% cutting on site" deltaTone="ok" icon={<Recycle size={15} />} delay={0.12} />
      </div>

      {heldNow.length > 0 && (
        <Card className="mb-4 !p-4" strong>
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-warn-soft text-warn">
              <TriangleAlert size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-ink">NLHPP Zone C: {heldNow.length} spools held at pressure test</div>
              <div className="mt-0.5 text-[12.5px] text-ink-2">
                Re-test booked Thu 8 Oct after a failed hold on two joints. UK Crew 5 is on site all week, so Zone C install slips to Mon 12 Oct unless the re-test passes first time.
              </div>
            </div>
            <Button size="sm" onClick={() => setJobFilter('CE-2304')} icon={<ArrowRight size={14} />}>
              Show NLHPP spools
            </Button>
          </div>
        </Card>
      )}

      {/* Kanban */}
      <Card padded={false} className="min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Workshop board</h3>
            <p className="text-[12.5px] text-ink-3">
              {jobFilter === 'all' ? 'All jobs' : jobName(jobMap.get(jobFilter))} · {shown.length} spools · click a spool for its label
            </p>
          </div>
          {jobFilter !== 'all' && (
            <Button size="sm" variant="ghost" onClick={() => setJobFilter('all')}>
              Show all jobs
            </Button>
          )}
        </div>
        <div className="scroll-thin overflow-x-auto px-4 pb-4">
          <div className="grid min-w-[1080px] grid-cols-7 gap-2.5">
            {SPOOL_STAGES.map((stage) => {
              const list = byStage.get(stage) ?? [];
              const isOpen = expanded[stage];
              const visible = isOpen ? list : list.slice(0, VISIBLE);
              return (
                <div key={stage} className="flex min-w-0 flex-col rounded-2xl bg-sunk p-2" data-testid={`col-${stage}`}>
                  <div className="flex items-center justify-between px-1.5 pb-2 pt-1">
                    <span className="truncate text-[12px] font-semibold text-ink">{stage}</span>
                    <span className="tnum rounded-full bg-surface-strong px-2 py-px text-[11px] font-semibold text-ink-2">{list.length}</span>
                  </div>
                  <div className={clsx('flex flex-col gap-1.5', isOpen && 'scroll-thin max-h-[520px] overflow-y-auto pr-0.5')}>
                    {visible.map((s) => (
                      <SpoolCard key={s.id} spool={s} job={jobMap.get(s.jobId)} late={isLate(s, jobMap.get(s.jobId), bookedJobs.has(s.jobId))} onClick={() => setOpen(s.id)} />
                    ))}
                    {list.length === 0 && <div className="px-2 py-6 text-center text-[11.5px] text-ink-3">No spools</div>}
                  </div>
                  {list.length > VISIBLE && (
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [stage]: !e[stage] }))}
                      className="mt-1.5 flex items-center justify-center gap-1 rounded-xl py-1.5 text-[11.5px] font-medium text-brand hover:bg-surface-strong"
                    >
                      {isOpen ? (
                        <>
                          Show fewer <ChevronUp size={13} />
                        </>
                      ) : (
                        <>
                          +{list.length - VISIBLE} more <ChevronDown size={13} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Dispatch calendar */}
      <SectionTitle>Dispatch calendar</SectionTitle>
      <Card>
        <CardHeader
          title="Loads matched to site install dates"
          subtitle="Each spool leaves Maynooth the working day before the site needs it. Red means it will not be ready in time and a crew is booked."
          icon={<CalendarDays size={15} />}
          action={clashes.length ? <Pill tone="bad" dot>{clashes.length} {clashes.length === 1 ? 'clash' : 'clashes'}</Pill> : <Pill tone="ok" dot>No clashes</Pill>}
        />
        <div className="scroll-thin overflow-x-auto">
          <div className="grid min-w-[900px] grid-cols-5 gap-2">
            {calendar.map((c) => {
              const past = c.date < TODAY_ISO;
              const today = c.date === TODAY_ISO;
              return (
                <div
                  key={c.date}
                  className={clsx('min-h-[132px] rounded-2xl p-2.5', today ? 'bg-brand-soft ring-1 ring-[var(--c-brand)]/30' : 'bg-sunk', past && 'opacity-55')}
                >
                  <div className="flex items-baseline justify-between">
                    <span className={clsx('text-[12px] font-semibold', today ? 'text-brand' : 'text-ink')}>{fmtDate(c.date, { weekday: true })}</span>
                    <span className="tnum text-[11px] text-ink-3">
                      {c.loads.length ? `${c.loads.length} ${c.loads.length === 1 ? 'load' : 'loads'}` : ''}
                    </span>
                  </div>
                  {c.spools > 0 && (
                    <div className="tnum text-[11px] text-ink-3">
                      {c.spools} spools · {num(c.metres)} m
                    </div>
                  )}
                  <div className="mt-2 space-y-1">
                    {c.loads.slice(0, 3).map((l) => {
                      const j = jobMap.get(l.jobId);
                      const allGone = l.spools.every((s) => s.stage === 'Dispatched');
                      return (
                        <button
                          key={l.jobId}
                          onClick={() => setJobFilter(l.jobId)}
                          title={l.clash ? `${l.late.length} spools will not be ready until ${fmtDate(readyDate(l.late[0]))}; crew booked on site` : `${l.spools.length} spools for ${jobName(j)}`}
                          className={clsx(
                            'flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[11.5px] transition hover:brightness-95',
                            l.clash ? 'bg-bad-soft text-bad' : allGone ? 'bg-ok-soft text-ok' : 'bg-surface-strong text-ink-2',
                          )}
                        >
                          {l.clash ? <TriangleAlert size={11} className="shrink-0" /> : allGone ? <PackageCheck size={11} className="shrink-0" /> : <Truck size={11} className="shrink-0 text-ink-3" />}
                          <span className="min-w-0 flex-1 truncate font-medium">{j?.showcase ? j.shortName : j?.location.split(',')[0]}</span>
                          <span className="tnum shrink-0">{l.spools.length}</span>
                        </button>
                      );
                    })}
                    {c.loads.length > 3 && <div className="px-2 text-[11px] text-ink-3">+{c.loads.length - 3} more loads</div>}
                    {c.loads.length === 0 && <div className="px-1 pt-3 text-[11.5px] text-ink-3">No dispatches</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {clashes.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {clashes.slice(0, 3).map((c) => (
              <div key={`${c.date}-${c.jobId}`} className="flex items-center gap-2 text-[12.5px] text-ink-2">
                <TriangleAlert size={13} className="shrink-0 text-bad" />
                <span className="min-w-0 truncate">
                  <span className="font-medium text-ink">{jobName(jobMap.get(c.jobId))}</span>: {c.late.length} {c.late.length === 1 ? 'spool' : 'spools'} due to leave {fmtDate(c.date, { weekday: true })} but ready{' '}
                  {fmtDate(readyDate(c.late[0]), { weekday: true })}. Crew booked on site.
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Stock + waste */}
      <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card padded={false} className="min-w-0 p-5">
          <CardHeader
            title="Material stock"
            subtitle={`By material and diameter · ${lowStock.length} lines below reorder level`}
            icon={<Boxes size={15} />}
            action={lowStock.length ? <Pill tone="warn" dot>{lowStock.length} to reorder</Pill> : undefined}
          />
          <div className="scroll-thin max-h-[420px] overflow-y-auto">
            <Table className="!overflow-visible">
              <thead>
                <tr>
                  <Th className="bg-surface-strong">Material</Th>
                  <Th className="bg-surface-strong" align="right">Ø mm</Th>
                  <Th className="bg-surface-strong">On hand vs reorder level</Th>
                  <Th className="bg-surface-strong" align="right">On order</Th>
                  <Th className="bg-surface-strong" align="right" />
                </tr>
              </thead>
              <tbody>
                {[...stock]
                  .sort((a, b) => Number(a.status === 'ok') - Number(b.status === 'ok') || a.ratio - b.ratio)
                  .map((st) => (
                    <Tr key={st.id}>
                      <Td className="whitespace-nowrap">
                        <div className="font-medium text-ink">{st.material}</div>
                        <div className="text-[11px] text-ink-3">{st.supplier}</div>
                      </Td>
                      <Td align="right">{st.diameter}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(1, st.ratio / 2)} height={5} tone={st.status === 'ok' ? 'ok' : st.status} className="w-[64px]" />
                          <span className={clsx('tnum whitespace-nowrap text-[12px]', st.status === 'ok' ? 'text-ink-2' : st.status === 'warn' ? 'text-warn' : 'text-bad')}>
                            {num(st.onHand)} / {num(st.reorderLevel)} m
                          </span>
                        </div>
                      </Td>
                      <Td align="right">{st.onOrder ? `${num(st.onOrder)} m` : '–'}</Td>
                      <Td align="right">
                        {st.status !== 'ok' &&
                          (ordered[st.id] ? (
                            <Pill tone="ok">Ordered</Pill>
                          ) : (
                            <Button size="sm" variant={st.status === 'bad' ? 'primary' : 'secondary'} icon={<ShoppingCart size={13} />} onClick={() => reorder(st)}>
                              Reorder
                            </Button>
                          ))}
                      </Td>
                    </Tr>
                  ))}
              </tbody>
            </Table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Waste: prefab vs cutting on site" subtitle="HDPE offcuts as a share of pipe used, year to date" icon={<Leaf size={15} />} />
          <div className="space-y-4">
            <WasteBar label="Maynooth prefab" value={PREFAB_WASTE} max={0.12} tone="ok" text="2.1%" />
            <WasteBar label="Typical site install" value={(SITE_WASTE_LOW + SITE_WASTE_HIGH) / 2} max={0.12} tone="warn" text="8–10%" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-sunk p-4">
            <Stat label="HDPE saved" value={`${num(savedKg)} kg`} sub={`on ${num(HDPE_YTD_KG / 1000, 1)} t fabricated`} />
            <Stat label="Skips avoided" value={skips} sub="site skip lifts" />
            <Stat label="Embodied carbon" value={`${co2.toFixed(1)} t`} sub="CO₂e avoided" />
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-2">
            Cutting in the workshop uses offcuts on the next spool and recycles the rest as HDPE regrind. These figures feed the sustainability report and EcoVadis evidence on the HSQE page.
          </p>
        </Card>
      </div>

      <Drawer
        open={!!openSpool}
        onClose={() => setOpen(null)}
        title={openSpool ? `Spool ${openSpool.id}` : ''}
        subtitle={openSpool ? jobName(jobMap.get(openSpool.jobId)) : undefined}
        width={480}
      >
        {openSpool && (
          <div className="space-y-5">
            <SpoolLabel spool={openSpool} job={jobMap.get(openSpool.jobId)} />
            <div>
              <div className="mb-2 text-[12px] font-medium text-ink-3">Workshop stage</div>
              <div className="flex gap-1">
                {SPOOL_STAGES.map((st, i) => {
                  const cur = SPOOL_STAGES.indexOf(openSpool.stage);
                  return <div key={st} title={st} className={clsx('h-1.5 flex-1 rounded-full', i <= cur ? 'bg-brand' : 'bg-sunk')} />;
                })}
              </div>
              <div className="mt-2 flex items-center justify-between text-[13px]">
                <span className="font-semibold text-ink">{openSpool.stage}</span>
                {nextStage && <span className="text-ink-3">Next: {nextStage}</span>}
              </div>
            </div>
            {HELD.has(openSpool.id) && openSpool.stage === 'Pressure tested' && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-warn-soft px-3.5 py-3 text-[12.5px] text-ink-2">
                <TriangleAlert size={15} className="mt-0.5 shrink-0 text-warn" />
                <span>Held for re-test with the rest of NLHPP Zone C. Re-test booked Thu 8 Oct.</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-sunk p-4">
              <Stat label="Diameter" value={`${openSpool.diameter} mm`} />
              <Stat label="Length" value={`${openSpool.length.toFixed(1)} m`} />
              <Stat label="Weight" value={`${openSpool.weightKg.toFixed(1)} kg`} />
              <Stat label="Material" value={openSpool.material} />
              <Stat label="Welds" value={weldCount(openSpool)} />
              <Stat label="Site need" value={fmtDate(openSpool.due, { weekday: true })} />
            </div>
            {openSpool.stage !== 'On site' && openSpool.stage !== 'Dispatched' && (
              <div className="flex items-center justify-between rounded-2xl border hairline px-4 py-3 text-[12.5px]">
                <span className="text-ink-3">Planned dispatch</span>
                <span className={clsx('font-medium', readyDate(openSpool) > dispatchDate(openSpool) ? 'text-bad' : 'text-ink')}>
                  {fmtDate(dispatchDate(openSpool), { weekday: true })}
                  {readyDate(openSpool) > dispatchDate(openSpool) && ` · ready ${fmtDate(readyDate(openSpool), { weekday: true })}`}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              {nextStage ? (
                <Button variant="primary" className="flex-1" icon={<ArrowRight size={15} />} onClick={() => advance(openSpool)}>
                  Move to {nextStage}
                </Button>
              ) : (
                <div className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ok-soft py-2 text-[13px] font-medium text-ok">
                  <PackageCheck size={15} /> Delivered to site
                </div>
              )}
              <Button
                onClick={() => toast({ title: `Label ${openSpool.id} sent to the workshop printer`, detail: 'Zebra ZT411, bay 2', tone: 'info' })}
              >
                Print label
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function SpoolCard({ spool, job, late, onClick }: { spool: Spool; job?: Job; late: boolean; onClick: () => void }) {
  const held = HELD.has(spool.id) && spool.stage === 'Pressure tested';
  return (
    <button
      onClick={onClick}
      data-testid={`spool-${spool.id}`}
      className={clsx('glass-strong w-full rounded-xl px-2.5 py-2 text-left transition hover:-translate-y-px', held && 'ring-1 ring-[var(--c-warn)]/60')}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="whitespace-nowrap font-mono text-[11.5px] font-semibold text-ink">{spool.id}</span>
        {held ? <Pill tone="warn" className="!px-1.5 !text-[10px]">Re-test</Pill> : late ? <Pill tone="bad" className="!px-1.5 !text-[10px]">Late</Pill> : null}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5">
        {job && <HealthDot health={job.health} className="!h-1.5 !w-1.5" />}
        <span className="truncate text-[11.5px] text-ink-2">{job ? (job.showcase ? job.shortName : job.location.split(',')[0]) : spool.jobId}</span>
      </div>
      <div className="tnum mt-1 truncate text-[11px] text-ink-3">
        {spool.material === 'Stainless steel' ? 'Stainless' : spool.material} · Ø{spool.diameter} · {spool.length.toFixed(1)} m
      </div>
      <div className="tnum mt-0.5 text-[11px] text-ink-3">Due {fmtDate(spool.due)}</div>
    </button>
  );
}

function WasteBar({ label, value, max, tone, text }: { label: string; value: number; max: number; tone: 'ok' | 'warn'; text: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] text-ink-2">{label}</span>
        <span className={clsx('tnum text-[20px] font-semibold tracking-[-0.02em]', tone === 'ok' ? 'text-ok' : 'text-warn')}>{text}</span>
      </div>
      <Progress value={value / max} tone={tone} height={10} />
    </div>
  );
}
