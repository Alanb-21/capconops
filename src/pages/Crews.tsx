import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CalendarClock, CheckCircle2, GripVertical, PackageX, Plus, ShieldAlert, ShieldCheck, Users, Wrench, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CREWS, techById } from '../data/seed';
import { DAYS, type Crew, type DayKey, type Job } from '../data/types';
import { crewsOn, expiringTickets, sitesWithNoCrew, TODAY_DAY } from '../data/metrics';
import { fmtDate } from '../lib/dates';
import { Button, Card, CardHeader, HealthDot, Kpi, PageHeader, Pill, Progress, SectionTitle, Segmented, clsx } from '../components/ui';
import { checkCompliance, crewTicketFlags, dayIso, jobLabel, materialsGaps } from '../components/crews/helpers';
import { TechTickets } from '../components/crews/TechTickets';

type Region = 'IE' | 'UK';
const FUTURE: DayKey[] = ['Wed', 'Thu', 'Fri'];

interface Banner {
  id: number;
  tone: 'ok' | 'warn' | 'bad';
  agent: 'Compliance Agent' | 'Scheduler Agent';
  title: string;
  lines: string[];
}

type DragData = { kind: 'cell'; crewId: string; day: DayKey; jobId: string } | { kind: 'site'; jobId: string };

let bannerId = 1;

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

export default function Crews() {
  const jobs = useStore((s) => s.jobs);
  const alloc = useStore((s) => s.allocation);
  const spools = useStore((s) => s.spools);
  const approvals = useStore((s) => s.approvals);
  const moveCrew = useStore((s) => s.moveCrew);
  const pushLog = useStore((s) => s.pushLog);
  const toast = useStore((s) => s.toast);
  const decideApproval = useStore((s) => s.decideApproval);

  const [region, setRegion] = useState<Region>('IE');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [picker, setPicker] = useState<{ crewId: string; day: DayKey; rect: DOMRect } | null>(null);
  const [dragging, setDragging] = useState<DragData | null>(null);

  const jobMap = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const crews = CREWS.filter((c) => c.region === region && c.id !== 'MT-01');
  const maint = CREWS.find((c) => c.id === 'MT-01');
  const ap2 = approvals.find((a) => a.id === 'AP-2');

  const needing = useMemo(() => {
    const m = new Map<string, { job: Job; days: DayKey[] }>();
    for (const d of FUTURE) {
      for (const j of sitesWithNoCrew(jobs, alloc, d)) {
        if (j.region !== region) continue;
        const e = m.get(j.id) ?? { job: j, days: [] };
        e.days.push(d);
        m.set(j.id, e);
      }
    }
    return [...m.values()].sort((a, b) => (a.job.health === 'at-risk' ? -1 : 0) - (b.job.health === 'at-risk' ? -1 : 0) || b.days.length - a.days.length);
  }, [jobs, alloc, region]);

  const matGaps = useMemo(() => materialsGaps(jobs.filter((j) => j.region === region), alloc, spools, CREWS), [jobs, alloc, spools, region]);

  const regionCrewIds = crews.map((c) => c.id);
  const bookedSlots = regionCrewIds.reduce((a, id) => a + DAYS.filter((d) => alloc[id]?.[d]).length, 0);
  const utilisation = regionCrewIds.length ? bookedSlots / (regionCrewIds.length * DAYS.length) : 0;
  const onSiteToday = regionCrewIds.filter((id) => alloc[id]?.[TODAY_DAY]).length;
  const expiring = expiringTickets(30, undefined).filter((e) => e.tech.region === region);

  function addBanner(b: Omit<Banner, 'id'>) {
    const id = bannerId++;
    setBanners((list) => [{ ...b, id }, ...list].slice(0, 3));
    window.setTimeout(() => setBanners((list) => list.filter((x) => x.id !== id)), 12000);
  }

  function cloneeCovered(a = useStore.getState().allocation) {
    return FUTURE.every((d) => crewsOn(a, 'CE-2333', d).length > 0);
  }

  /** Run the Compliance Agent for a crew booking, then surface the result. */
  function runCompliance(crew: Crew, job: Job, days: DayKey[]) {
    const results = days.map((d) => checkCompliance(crew, job, d));
    const issues = [...new Set(results.flatMap((r) => r.issues))];
    const level = results.some((r) => r.level === 'bad') ? 'bad' : results.some((r) => r.level === 'warn') ? 'warn' : 'ok';
    const { primary } = jobLabel(job);
    const dayText = days.length > 1 ? `${days[0]}–${days[days.length - 1]}` : days[0];
    if (level === 'ok') {
      addBanner({
        tone: 'ok',
        agent: 'Compliance Agent',
        title: `${crew.name.split(' · ')[0]} cleared for ${primary} ${dayText}`,
        lines: [`${results[0]?.checked ?? 0} tickets checked for ${crew.memberIds.length} people. All valid for the booking${['Pharmaceutical', 'Data Centre'].includes(job.sector) ? ', including IPAF for the client permit-to-work' : ''}.`],
      });
      pushLog({ agent: 'compliance', text: `Checked tickets for ${crew.name} on ${job.shortName} (${dayText}): all valid`, jobId: job.id });
    } else {
      addBanner({
        tone: level,
        agent: 'Compliance Agent',
        title: `${crew.name.split(' · ')[0]} on ${primary} ${dayText}: ${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}`,
        lines: issues.slice(0, 3),
      });
      pushLog({ agent: 'compliance', text: `Flagged ${crew.name} on ${job.shortName}: ${issues[0]}`, jobId: job.id });
    }
  }

  function afterChange(wasCovered: boolean) {
    if (!wasCovered && cloneeCovered()) {
      toast({ title: 'Clonee covered Wed–Fri', detail: 'Hyperscale data centre, Clonee now has a crew every day this week.', tone: 'success' });
      pushLog({ agent: 'scheduler', text: 'Clonee data centre covered Wed to Fri, gap closed', jobId: 'CE-2333' });
    }
  }

  function assign(crewId: string, day: DayKey, jobId: string | null) {
    const crew = CREWS.find((c) => c.id === crewId);
    if (!crew) return;
    const was = cloneeCovered();
    moveCrew(crewId, day, jobId);
    const job = jobId ? jobMap.get(jobId) : undefined;
    if (job) {
      const { primary } = jobLabel(job);
      toast({ title: `${crew.name.split(' · ')[0]} booked on ${primary}`, detail: `${day} ${fmtDate(dayIso(day))}`, tone: 'info' });
      runCompliance(crew, job, [day]);
    } else {
      toast({ title: `${crew.name.split(' · ')[0]} unassigned ${day}`, tone: 'info' });
    }
    afterChange(was);
  }

  function approveAp2() {
    const was = cloneeCovered();
    decideApproval('AP-2', 'Approved');
    const crew = CREWS.find((c) => c.id === 'IE-08');
    const job = jobMap.get('CE-2333');
    if (crew && job) runCompliance(crew, job, FUTURE);
    afterChange(was);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  function onDragStart(e: DragStartEvent) {
    setPicker(null);
    setDragging((e.active.data.current as DragData) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    const data = e.active.data.current as DragData | undefined;
    setDragging(null);
    if (!data || !e.over) return;
    const [, crewId, day] = String(e.over.id).split('|') as [string, string, DayKey];
    if (data.kind === 'site') {
      assign(crewId, day, data.jobId);
      return;
    }
    if (data.crewId === crewId && data.day === day) return;
    const targetPrev = alloc[crewId]?.[day] ?? null;
    if (data.day === day && data.crewId !== crewId) {
      // same day, different crew: swap the two bookings
      const was = cloneeCovered();
      moveCrew(data.crewId, day, targetPrev);
      moveCrew(crewId, day, data.jobId);
      const crew = CREWS.find((c) => c.id === crewId)!;
      const job = jobMap.get(data.jobId);
      toast({ title: 'Bookings swapped', detail: `${data.crewId} ↔ ${crewId} on ${day}`, tone: 'info' });
      if (job) runCompliance(crew, job, [day]);
      afterChange(was);
      return;
    }
    assign(crewId, day, data.jobId);
  }

  const overlayJob = dragging ? jobMap.get(dragging.jobId) : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Crews & Scheduling"
        subtitle="Week commencing Mon 5 Oct. Drag a booking or a site onto the board, or click any day to pick a site. The Compliance Agent checks tickets on every change."
        actions={
          <Segmented
            value={region}
            onChange={(v) => {
              setRegion(v);
              setPicker(null);
            }}
            options={[
              { value: 'IE', label: 'Ireland' },
              { value: 'UK', label: 'UK' },
            ]}
          />
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Crews on site today" value={onSiteToday} sub={`of ${crews.length} ${region} crews · Tue 6 Oct`} icon={<Users size={15} />} />
        <Kpi label="Crew utilisation this week" value={utilisation * 100} format={(v) => `${Math.round(v)}%`} sub={`${bookedSlots} of ${crews.length * 5} crew-days booked`} delay={0.04} />
        <Kpi
          label="Sites needing a crew"
          value={needing.length}
          sub={needing.length ? needing.map((n) => jobLabel(n.job).primary).join(', ') : 'Every work-ready site covered'}
          deltaTone={needing.length ? 'warn' : 'ok'}
          delta={needing.length ? 'Wed–Fri' : 'all covered'}
          delay={0.08}
        />
        <Kpi label="Tickets expiring ≤ 30 days" value={expiring.length} sub={`${region} technicians`} deltaTone={expiring.length ? 'warn' : 'ok'} icon={<ShieldAlert size={15} />} delay={0.12} />
      </div>

      {/* Scheduler Agent suggestion */}
      {region === 'IE' && ap2 && (
        <Card className="mb-4 !p-4" strong>
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
              <CalendarClock size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-brand">Scheduler Agent suggests</span>
                {ap2.status !== 'Pending' && <Pill tone={ap2.status === 'Approved' ? 'ok' : 'neutral'}>{ap2.status}</Pill>}
              </div>
              <div className="mt-0.5 text-[15px] font-semibold text-ink">{ap2.title}</div>
              <div className="mt-0.5 text-[12.5px] text-ink-2">{ap2.detail}</div>
            </div>
            {ap2.status === 'Pending' ? (
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" size="sm" onClick={() => decideApproval('AP-2', 'Rejected')}>
                  Decline
                </Button>
                <Button variant="primary" size="sm" icon={<CheckCircle2 size={14} />} onClick={approveAp2}>
                  Approve move
                </Button>
              </div>
            ) : (
              <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-ok">
                {ap2.status === 'Approved' ? (
                  <>
                    <CheckCircle2 size={16} /> IE Crew 8 booked Wed–Fri
                  </>
                ) : (
                  <span className="text-ink-3">Suggestion declined</span>
                )}
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Agent banners */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {banners.map((b) => (
            <motion.div
              key={b.id}
              layout
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                data-testid="compliance-banner"
                className={clsx(
                  'mb-2 flex items-start gap-3 rounded-2xl px-4 py-3',
                  b.tone === 'ok' && 'bg-ok-soft',
                  b.tone === 'warn' && 'bg-warn-soft',
                  b.tone === 'bad' && 'bg-bad-soft',
                )}
              >
                <span className={clsx('mt-0.5', b.tone === 'ok' ? 'text-ok' : b.tone === 'warn' ? 'text-warn' : 'text-bad')}>
                  {b.tone === 'ok' ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink">
                    {b.agent}: {b.title}
                  </div>
                  {b.lines.map((l) => (
                    <div key={l} className="mt-0.5 text-[12.5px] text-ink-2">
                      {l}
                    </div>
                  ))}
                </div>
                <button onClick={() => setBanners((l) => l.filter((x) => x.id !== b.id))} className="text-ink-3 hover:text-ink" aria-label="Dismiss">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          {/* Board */}
          <Card padded={false} className="min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
              <div>
                <h3 className="text-[15px] font-semibold text-ink">Weekly allocation</h3>
                <p className="text-[12.5px] text-ink-3">{region === 'IE' ? 'Ireland' : 'UK'} install crews · Mon 5 to Fri 9 Oct</p>
              </div>
              <span className="hidden items-center gap-1.5 text-[12px] text-ink-3 md:flex">
                <GripVertical size={13} /> drag to move · click to pick
              </span>
            </div>
            <div className="scroll-thin overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[200px_repeat(5,minmax(0,1fr))] border-b hairline px-3 pb-2">
                  <div className="px-2 text-[11.5px] font-medium uppercase tracking-[0.04em] text-ink-3">Crew</div>
                  {DAYS.map((d, i) => (
                    <div key={d} className={clsx('px-2 text-center text-[11.5px] font-medium uppercase tracking-[0.04em]', d === TODAY_DAY ? 'text-brand' : 'text-ink-3', d === 'Mon' && 'opacity-60')}>
                      {d} {5 + i}
                      {d === TODAY_DAY && <span className="ml-1 rounded-full bg-brand px-1.5 py-px text-[10px] text-white dark:text-[#06101e]">Today</span>}
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2">
                  {crews.map((c) => (
                    <CrewRow
                      key={c.id}
                      crew={c}
                      row={alloc[c.id]}
                      jobMap={jobMap}
                      onPick={(day, rect) => setPicker({ crewId: c.id, day, rect })}
                      activePick={picker && picker.crewId === c.id ? picker.day : null}
                    />
                  ))}
                </div>
                {maint && (
                  <div className="mx-3 mb-3 grid grid-cols-[200px_repeat(5,minmax(0,1fr))] items-center rounded-2xl bg-sunk py-2">
                    <div className="flex items-center gap-2 px-3">
                      <Wrench size={14} className="text-ink-3" />
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-medium text-ink">{maint.name}</div>
                        <div className="truncate text-[11px] text-ink-3">Read only · planned maintenance</div>
                      </div>
                    </div>
                    {DAYS.map((d, i) => (
                      <div key={d} className={clsx('truncate px-2 text-center text-[11.5px] text-ink-3', d === 'Mon' && 'opacity-60')}>
                        {['NCH Block A', 'NCH Block C survey', 'Diageo outlets', 'Office, Sandyford', 'Callout cover'][i]}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Right column: gaps */}
          <div className="flex min-w-0 flex-col gap-4">
            <Card>
              <CardHeader title="Sites needing a crew" subtitle="Work ready, no crew · drag onto a day" icon={<Plus size={15} />} />
              {needing.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-ok-soft px-3 py-3 text-[13px] font-medium text-ok">
                  <CheckCircle2 size={16} /> Every work-ready site is covered Wed–Fri
                </div>
              ) : (
                <div className="space-y-2" data-testid="sites-needing">
                  {needing.map((n) => (
                    <SiteChip key={n.job.id} job={n.job} days={n.days} />
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <CardHeader title="Materials not dispatched" subtitle="Crew booked, but spools needed by Mon 12 Oct are still in the workshop" icon={<PackageX size={15} />} />
              {matGaps.length === 0 ? (
                <p className="text-[13px] text-ink-3">All booked crews have their spools dispatched or on site.</p>
              ) : (
                <div className="space-y-2">
                  {matGaps.map((g) => {
                    const stages = [...new Set(g.spools.map((s) => s.stage))];
                    return (
                      <div key={g.job.id} className="rounded-xl bg-sunk px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <HealthDot health={g.job.health} />
                          <span className="truncate text-[13px] font-medium text-ink">{jobLabel(g.job).primary}</span>
                          <span className="ml-auto shrink-0 text-[11.5px] text-ink-3">{g.crewIds.join(', ')}</span>
                        </div>
                        <div className="mt-1 text-[12px] text-ink-2">
                          {g.spools.length} {g.spools.length === 1 ? 'spool' : 'spools'} at {stages.join(' / ')}, needed {fmtDate(g.spools.reduce((a, s) => (s.due < a ? s.due : a), g.spools[0].due), { weekday: true })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>

        {createPortal(
          <DragOverlay dropAnimation={null}>
            {overlayJob ? <JobChip job={overlayJob} lifted /> : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      {picker &&
        createPortal(
          <Picker
            rect={picker.rect}
            crew={CREWS.find((c) => c.id === picker.crewId)!}
            day={picker.day}
            current={alloc[picker.crewId]?.[picker.day] ?? null}
            jobs={jobs.filter((j) => j.region === region && j.stage === 'Install' && !j.designOnly)}
            needingIds={new Set(needing.filter((n) => n.days.includes(picker.day)).map((n) => n.job.id))}
            onClose={() => setPicker(null)}
            onPick={(jobId) => {
              assign(picker.crewId, picker.day, jobId);
              setPicker(null);
            }}
          />,
          document.body,
        )}

      <SectionTitle>Technicians and tickets</SectionTitle>
      <TechTickets />
    </div>
  );
}

// ---------------------------------------------------------------- pieces

function JobChip({ job, lifted }: { job: Job; lifted?: boolean }) {
  const { primary, secondary } = jobLabel(job);
  return (
    <div
      className={clsx(
        'flex w-full min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left',
        lifted ? 'glass-strong w-[170px] rotate-[-2deg] shadow-xl ring-2 ring-[var(--c-brand)]' : 'bg-surface-strong',
      )}
    >
      <HealthDot health={job.health} />
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-medium leading-tight text-ink">{primary}</div>
        <div className="truncate text-[11px] leading-tight text-ink-3">{secondary}</div>
      </div>
    </div>
  );
}

function CrewRow({
  crew,
  row,
  jobMap,
  onPick,
  activePick,
}: {
  crew: Crew;
  row: Record<DayKey, string | null> | undefined;
  jobMap: Map<string, Job>;
  onPick: (day: DayKey, rect: DOMRect) => void;
  activePick: DayKey | null;
}) {
  const foreman = techById(crew.foremanId);
  const booked = DAYS.filter((d) => row?.[d]).length;
  const flags = crewTicketFlags(crew);
  return (
    <div className="grid grid-cols-[200px_repeat(5,minmax(0,1fr))] items-stretch border-b hairline py-1.5 last:border-b-0" data-testid={`row-${crew.id}`}>
      <div className="flex min-w-0 items-center gap-2.5 px-2">
        <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: crew.colour }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-ink">{crew.name}</span>
            {flags.length > 0 && (
              <span title={flags.map((f) => `${f.name}: ${f.type} expires ${fmtDate(f.expires)}`).join('\n')} className="shrink-0 text-warn">
                <ShieldAlert size={13} />
              </span>
            )}
          </div>
          <div className="truncate text-[11.5px] text-ink-3">
            {foreman?.name ?? 'Foreman'} · {crew.memberIds.length} people
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Progress value={booked / 5} height={4} className="max-w-[80px]" tone={booked === 5 ? 'ok' : booked >= 3 ? 'brand' : 'warn'} />
            <span className="tnum text-[10.5px] text-ink-3">{booked * 20}%</span>
          </div>
        </div>
      </div>
      {DAYS.map((d) => (
        <Cell key={d} crewId={crew.id} day={d} job={row?.[d] ? jobMap.get(row[d]!) : undefined} onPick={onPick} active={activePick === d} />
      ))}
    </div>
  );
}

function Cell({ crewId, day, job, onPick, active }: { crewId: string; day: DayKey; job?: Job; onPick: (day: DayKey, rect: DOMRect) => void; active: boolean }) {
  const past = day === 'Mon';
  const { setNodeRef, isOver } = useDroppable({ id: `drop|${crewId}|${day}`, disabled: past });
  const drag = useDraggable({ id: `cell|${crewId}|${day}`, data: job ? ({ kind: 'cell', crewId, day, jobId: job.id } as DragData) : undefined, disabled: !job || past });
  return (
    <div ref={setNodeRef} className={clsx('px-1', day === TODAY_DAY && 'bg-brand-soft/60', past && 'opacity-55')}>
      <button
        type="button"
        data-testid={`cell-${crewId}-${day}`}
        ref={drag.setNodeRef}
        {...(job && !past ? drag.listeners : {})}
        {...(job && !past ? drag.attributes : {})}
        disabled={past}
        onClick={(e) => {
          if (past) return;
          onPick(day, e.currentTarget.getBoundingClientRect());
        }}
        className={clsx(
          'flex h-[52px] w-full items-center rounded-xl transition',
          !past && 'cursor-pointer',
          past && 'cursor-default',
          isOver && 'ring-2 ring-[var(--c-brand)]',
          active && 'ring-2 ring-[var(--c-brand-2)]',
          drag.isDragging && 'opacity-30',
          !job && 'justify-center border border-dashed hairline text-[11.5px] text-ink-3 hover:bg-sunk hover:text-ink-2',
          job && 'hover:-translate-y-px',
        )}
      >
        {job ? <JobChip job={job} /> : isOver ? 'Drop here' : 'Unassigned'}
      </button>
    </div>
  );
}

function SiteChip({ job, days }: { job: Job; days: DayKey[] }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `site|${job.id}`, data: { kind: 'site', jobId: job.id } as DragData });
  const { primary, secondary } = jobLabel(job);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-testid={`site-${job.id}`}
      className={clsx('flex cursor-grab items-center gap-2.5 rounded-xl bg-sunk px-3 py-2.5 transition hover:bg-surface-strong active:cursor-grabbing', isDragging && 'opacity-40')}
    >
      <GripVertical size={14} className="shrink-0 text-ink-3" />
      <HealthDot health={job.health} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{primary}</div>
        <div className="truncate text-[11.5px] text-ink-3">
          {secondary} · {job.id}
        </div>
      </div>
      <div className="flex shrink-0 gap-0.5">
        {FUTURE.map((d) => (
          <span key={d} className={clsx('rounded-md px-1 py-px text-[10px] font-semibold', days.includes(d) ? 'bg-warn-soft text-warn' : 'text-ink-3 opacity-50')}>
            {d[0]}
            {d === 'Thu' ? 'h' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function Picker({
  rect,
  crew,
  day,
  current,
  jobs,
  needingIds,
  onClose,
  onPick,
}: {
  rect: DOMRect;
  crew: Crew;
  day: DayKey;
  current: string | null;
  jobs: Job[];
  needingIds: Set<string>;
  onClose: () => void;
  onPick: (jobId: string | null) => void;
}) {
  const sorted = [...jobs].sort((a, b) => Number(needingIds.has(b.id)) - Number(needingIds.has(a.id)) || Number(b.workReady) - Number(a.workReady) || a.location.localeCompare(b.location));
  const W = 300;
  const H = 360;
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - W / 2), window.innerWidth - W - 12);
  const below = rect.bottom + 6 + H < window.innerHeight;
  const top = below ? rect.bottom + 6 : Math.max(12, rect.top - H - 6);
  return (
    <div className="fixed inset-0 z-[70]" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: below ? -6 : 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong fixed flex flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{ left, top, width: W, maxHeight: H }}
        data-testid="site-picker"
      >
        <div className="border-b hairline px-4 py-3">
          <div className="text-[13px] font-semibold text-ink">{crew.name}</div>
          <div className="text-[11.5px] text-ink-3">{fmtDate(dayIso(day), { weekday: true })} · choose a site</div>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto p-1.5">
          {sorted.map((j) => {
            const { primary, secondary } = jobLabel(j);
            const needs = needingIds.has(j.id);
            const blocked = j.health === 'blocked';
            return (
              <button
                key={j.id}
                data-testid={`pick-${j.id}`}
                disabled={blocked}
                onClick={() => onPick(j.id)}
                className={clsx(
                  'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-sunk disabled:cursor-not-allowed disabled:opacity-45',
                  current === j.id && 'bg-brand-soft',
                )}
              >
                <HealthDot health={j.health} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-ink">{primary}</div>
                  <div className="truncate text-[11px] text-ink-3">{secondary}</div>
                </div>
                {needs && <Pill tone="warn">Needs crew</Pill>}
                {blocked && <Pill tone="bad">Blocked</Pill>}
                {current === j.id && <Pill tone="brand">Booked</Pill>}
              </button>
            );
          })}
        </div>
        {current && (
          <div className="border-t hairline p-1.5">
            <button onClick={() => onPick(null)} className="w-full rounded-xl px-2.5 py-2 text-left text-[12.5px] font-medium text-bad hover:bg-bad-soft">
              Clear booking
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
