import { ArrowLeft, CalendarClock, ClipboardList, FileQuestion, HardHat, MapPin, MessageSquareText, Receipt, Sparkles, Users } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Job } from '../data/types';
import { DESIGN, VARIATIONS } from '../data/seed';
import { agreedVarsFor, certifiedTotal, crewsOn, designed, earned, installed, jobPct, openRfis, paidTotal, TODAY_DAY, TOMORROW_DAY } from '../data/metrics';
import { useJob, useStore } from '../store/useStore';
import { ago, daysUntil, fmtDate } from '../lib/dates';
import { num, pct } from '../lib/format';
import { Button, Card, CardHeader, clsx, HealthPill, LinkButton, Money, Pill, Progress, Segmented, Stat } from '../components/ui';
import { crewForeman, crewShort, crewSize, CrewDot, deltaLabel, deltaTone, jobLastUpdate, mcLabel, programmeDelta, regionLabel, SourceBadge, toneText, ValuationPill } from '../components/projects/shared';
import { ProgrammeTimeline } from '../components/projects/job/Timeline';
import { ClashTrendChart, DesignedSplitChart, MetresBySystemChart, WeeklyInstalledChart } from '../components/projects/job/Charts';
import { CrewRoster, DiaryList, DocumentsList, HandoverChecklist, HsSection, jobDiary, RfiTable, ValuationsTable, VariationsLog } from '../components/projects/job/Sections';

type Tab = 'overview' | 'diary' | 'programme' | 'commercial' | 'docs' | 'hs';
const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'diary', label: 'Diary' },
  { value: 'programme', label: 'Programme' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'docs', label: 'Documents & handover' },
  { value: 'hs', label: 'H&S' },
];

export default function JobDetail() {
  const { id } = useParams();
  const job = useJob(id);
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.some((t) => t.value === tabParam) ? tabParam : 'overview';
  useEffect(() => {
    document.getElementById('main-scroll')?.scrollTo({ top: 0 });
  }, [id]);
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  if (!job) {
    return (
      <div className="mx-auto mt-16 max-w-md">
        <Card strong className="text-center !p-8">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <FileQuestion size={22} />
          </div>
          <h2 className="text-[18px] font-semibold text-ink">We couldn’t find job {id}</h2>
          <p className="mt-1.5 text-[13.5px] text-ink-2">It may have been closed out or the link is mistyped. Every live job is listed on Projects & Sites.</p>
          <LinkButton to="/projects" variant="primary" className="mt-5" icon={<ArrowLeft size={15} />}>
            Back to Projects & Sites
          </LinkButton>
        </Card>
      </div>
    );
  }
  return <JobView job={job} tab={tab} setTab={setTab} />;
}

function JobView({ job, tab, setTab }: { job: Job; tab: Tab; setTab: (t: Tab) => void }) {
  const diary = useStore((s) => s.diary);
  const allocation = useStore((s) => s.allocation);
  const recentlyUpdated = useStore((s) => s.recentlyUpdated);
  const setAssistantOpen = useStore((s) => s.setAssistantOpen);
  const entries = jobDiary(diary, job.id);
  const fresh = recentlyUpdated.includes(job.id);
  const mc = mcLabel(job);

  return (
    <div>
      <Link to="/projects" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-brand">
        <ArrowLeft size={14} /> Projects & Sites
      </Link>

      {/* ---------------------------------------------------------- header */}
      <Card strong className="mb-4 !p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-ink-3">
              <span className="tnum text-brand">{job.id}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} />
                {job.location.includes(regionLabel(job.region)) ? job.location : `${job.location}, ${regionLabel(job.region)}`}
              </span>
              <span>·</span>
              <span>{job.sector}</span>
              {job.showcase && <Pill tone="brand">Capcon project</Pill>}
              {fresh && <Pill tone="brand" dot className="animate-pulse">Updated just now from Technician app</Pill>}
            </div>
            <h1 className="mt-1.5 truncate text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink">{job.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
              <Meta label="Client">{job.client}</Meta>
              <Meta label={job.designOnly ? 'Engagement' : 'Main contractor'}>
                <span className={clsx(mc.muted && 'text-ink-3')}>{job.designOnly ? 'Design only' : mc.text}</span>
              </Meta>
              {job.consultant && <Meta label="Consultant">{job.consultant}</Meta>}
              <Meta label="System">
                {job.system} · {job.material}
              </Meta>
              <Meta label="Stage">{job.stage}</Meta>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <HealthPill health={job.health} />
              <span className="text-[13px] text-ink-2">{job.healthReason ?? defaultReason(job)}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {job.id === 'CE-2291' && (
              <LinkButton to="/field" icon={<HardHat size={15} />}>
                Barry’s app view
              </LinkButton>
            )}
            <Button variant="primary" icon={<Sparkles size={15} />} onClick={() => setAssistantOpen(true)}>
              Ask about this job
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t hairline pt-5 md:grid-cols-3 xl:grid-cols-6">
          <Stat label={job.designOnly ? 'Design fee' : 'Contract value'} value={<Money amount={job.contractValue} currency={job.currency} />} sub={agreedVarsFor(job.id) ? <>+ <Money amount={agreedVarsFor(job.id)} currency={job.currency} /> agreed VOs</> : 'No agreed variations'} />
          <div className="min-w-0">
            <div className="truncate text-[11.5px] font-medium text-ink-3">{job.designOnly ? 'Design complete' : '% complete'}</div>
            <div className="mt-0.5 text-[17px] font-semibold tracking-[-0.02em] text-ink tnum" data-testid="job-pct">
              {pct(jobPct(job))}
            </div>
            <Progress value={jobPct(job)} height={5} className="mt-1.5" tone={job.designOnly ? 'accent' : 'brand'} />
          </div>
          {job.designOnly ? (
            <Stat label="Designed" value={`${num(designed(job))} m`} sub="Siphonic and gravity" />
          ) : (
            <div className="min-w-0">
              <div className="truncate text-[11.5px] font-medium text-ink-3">Installed / designed</div>
              <div className="mt-0.5 truncate text-[17px] font-semibold tracking-[-0.02em] text-ink tnum">
                <span data-testid="installed-m" className={clsx(fresh && 'text-brand')}>
                  {num(installed(job))}
                </span>
                <span className="text-ink-3"> / {num(designed(job))} m</span>
              </div>
              <div className="truncate text-[11.5px] text-ink-3 tnum">{num(job.weekToDate)} m this week</div>
            </div>
          )}
          <Stat label="Roof area" value={`${num(job.roofArea)} m²`} sub={job.sector} />
          <Stat label="Siphonic · gravity designed" value={`${num(job.siphonicDesigned)} · ${num(job.gravityDesigned)} m`} sub={`${pct(job.siphonicDesigned / Math.max(1, designed(job)))} siphonic`} />
          <Stat label="Forecast margin" value={<span className={job.forecastMarginPct < 0.12 ? 'text-warn' : ''}>{pct(job.forecastMarginPct, 1)}</span>} sub={<>Cost to date <Money amount={job.costToDate} currency={job.currency} compact /></>} />
        </div>
      </Card>

      {/* ---------------------------------------------------------- tabs */}
      <div className="scroll-thin mb-4 overflow-x-auto">
        <Segmented<Tab> value={tab} onChange={setTab} options={TABS} />
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <StandsStrip job={job} />
          <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            <Card>
              <CardHeader title="Programme" subtitle="Our forecast against the main contractor programme" icon={<CalendarClock size={15} />} action={<TabLink onClick={() => setTab('programme')}>Full programme</TabLink>} />
              <ProgrammeTimeline job={job} compact />
            </Card>
            <Card>
              <CardHeader
                title={job.designOnly ? 'Designed metres by system' : 'Metres by system'}
                subtitle={job.designOnly ? `${num(designed(job))} m designed across ${num(job.roofArea)} m² of roof` : 'Installed against designed, siphonic and gravity'}
                icon={<ClipboardList size={15} />}
              />
              {job.designOnly ? <DesignedSplitChart job={job} /> : <MetresBySystemChart job={job} />}
            </Card>
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            <Card>
              <CardHeader
                title="Site diary"
                subtitle={job.designOnly ? 'Design-only commission' : 'Latest entries from the foreman app, technician app and agents'}
                icon={<MessageSquareText size={15} />}
                action={entries.length > 3 ? <TabLink onClick={() => setTab('diary')}>All {entries.length} entries</TabLink> : undefined}
              />
              {job.designOnly ? <DesignNote job={job} /> : <DiaryList entries={entries} limit={3} />}
            </Card>
            <Card>
              {job.designOnly ? (
                <>
                  <CardHeader title="Open clashes" subtitle="Clash count in the coordinated model, last 8 weeks" />
                  <ClashTrendChart job={job} />
                </>
              ) : (
                <>
                  <CardHeader title="Weekly metres installed" subtitle={`Last 12 weeks · planned ${num(job.plannedThisWeek)} m this week`} />
                  <WeeklyInstalledChart job={job} />
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'diary' && (
        <Card>
          <CardHeader title="Daily site diary" subtitle={`${entries.length} entries, newest first. Written by foremen, technicians and the Site Progress Agent.`} icon={<MessageSquareText size={15} />} />
          {job.designOnly ? <DesignNote job={job} /> : <DiaryList entries={entries} />}
        </Card>
      )}

      {tab === 'programme' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Programme" subtitle="Our forecast against the main contractor programme" icon={<CalendarClock size={15} />} />
            <ProgrammeTimeline job={job} />
          </Card>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Crew roster this week" subtitle="From Crews & Scheduling · ticket status per person" icon={<Users size={15} />} />
              <CrewRoster job={job} allocation={allocation} />
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader title={job.designOnly ? 'Open clashes' : 'Weekly metres installed'} subtitle={job.designOnly ? 'Last 8 weeks' : 'Last 12 weeks and this week to date'} />
                {job.designOnly ? <ClashTrendChart job={job} /> : <WeeklyInstalledChart job={job} />}
              </Card>
              <Card>
                <CardHeader title="RFIs" subtitle={`${openRfis(job.id).length} open`} icon={<FileQuestion size={15} />} />
                <RfiTable job={job} />
              </Card>
            </div>
          </div>
        </div>
      )}

      {tab === 'commercial' && <Commercial job={job} />}

      {tab === 'docs' && (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <Card>
            <CardHeader title="Documents" subtitle="Site documents and the live drawing register" />
            <DocumentsList job={job} />
          </Card>
          <Card>
            <CardHeader title="Testing, commissioning & handover" subtitle="The Handover Agent builds the pack as evidence arrives from site" />
            <HandoverChecklist job={job} />
          </Card>
        </div>
      )}

      {tab === 'hs' && (
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader title="Health & safety" subtitle="RAMS, permits, toolbox talks, near misses and audits" />
            <HsSection job={job} />
          </Card>
          <Card>
            <CardHeader title="Crew tickets" subtitle="Green valid · amber within 30 days · red expired" icon={<Users size={15} />} />
            <CrewRoster job={job} allocation={allocation} />
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- "where it truly stands"
function StandsStrip({ job }: { job: Job }) {
  const allocation = useStore((s) => s.allocation);
  const recentlyUpdated = useStore((s) => s.recentlyUpdated);
  const fresh = recentlyUpdated.includes(job.id);
  const lu = jobLastUpdate(job);
  const today = crewsOn(allocation, job.id, TODAY_DAY);
  const tomorrow = crewsOn(allocation, job.id, TOMORROW_DAY);
  const rfis = openRfis(job.id).length;
  const vos = VARIATIONS.filter((v) => v.jobId === job.id && v.status !== 'Agreed' && v.status !== 'Rejected');
  const due = daysUntil(job.nextMilestone.date);
  const delta = programmeDelta(job);
  const crewLine = (ids: string[]) =>
    ids.length ? (
      <span className="flex min-w-0 items-center gap-1.5">
        <CrewDot id={ids[0]} />
        <span className="truncate">
          {ids.map(crewShort).join(', ')} · {ids.reduce((a, c) => a + crewSize(c), 0)} people
        </span>
      </span>
    ) : job.designOnly ? (
      <span className="text-ink-3">Design only</span>
    ) : (
      <span className={job.stage === 'Install' ? 'text-warn' : 'text-ink-3'}>No crew booked</span>
    );

  return (
    <Card strong className={clsx('!p-0 overflow-hidden', fresh && 'ring-2 ring-[var(--c-brand)]')}>
      <div className="flex items-center gap-2 border-b hairline px-5 py-3">
        <Sparkles size={15} className="text-brand-2" />
        <span className="text-[14px] font-semibold text-ink">Where it truly stands</span>
        <span className="text-[12.5px] text-ink-3">{job.designOnly ? 'Live from the design register.' : 'Live from site. No need to ring the foreman.'}</span>
      </div>
      <div className="grid xl:grid-cols-[1.5fr_1fr_1fr]">
        <div className="border-b hairline px-5 py-4 xl:border-b-0 xl:border-r">
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx('text-[22px] font-semibold tracking-[-0.02em] tnum', fresh ? 'text-brand' : 'text-ink')}>{fresh ? 'Just now' : ago(lu.at)}</span>
            <SourceBadge source={lu.source} />
            <span className="text-[12.5px] text-ink-3">by {lu.by}</span>
          </div>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">“{lu.note}”</p>
          {!job.designOnly && job.stage === 'Install' && (
            <div className="mt-3 max-w-[420px]">
              <div className="flex justify-between text-[11.5px] text-ink-3">
                <span>This week</span>
                <span className="tnum">
                  <span className="font-semibold text-ink">{num(job.weekToDate)} m</span> of {num(job.plannedThisWeek)} m planned
                </span>
              </div>
              <Progress value={job.plannedThisWeek ? job.weekToDate / job.plannedThisWeek : 0} height={5} className="mt-1" tone="accent" />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 border-b hairline px-5 py-4 xl:grid-cols-1 xl:border-b-0 xl:border-r">
          <Mini label="On site today">{crewLine(today)}</Mini>
          <Mini label="Tomorrow">{crewLine(tomorrow)}</Mini>
          {today.length > 0 && <Mini label="Foreman">{crewForeman(today[0])}</Mini>}
        </div>
        <div className="grid grid-cols-2 gap-4 px-5 py-4">
          <Mini label="Next milestone">
            <div className="truncate" title={job.nextMilestone.name}>
              {job.nextMilestone.name}
            </div>
            <div className="text-[11.5px] font-normal text-ink-3 tnum">
              {fmtDate(job.nextMilestone.date, { weekday: true })} · {due === 0 ? 'today' : due > 0 ? `in ${due} days` : `${-due} days ago`}
            </div>
          </Mini>
          <Mini label="Programme">
            <span className={toneText[deltaTone(delta)]}>{deltaLabel(delta)}</span>
          </Mini>
          <Mini label="Valuation">
            <ValuationPill status={job.valuationStatus} />
          </Mini>
          <Mini label="Open RFIs · VOs">
            <span className="tnum">
              <span className={rfis ? 'text-warn' : ''}>{rfis} RFI{rfis === 1 ? '' : 's'}</span> · {vos.length} VO{vos.length === 1 ? '' : 's'}
            </span>
          </Mini>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- commercial
function Commercial({ job }: { job: Job }) {
  const vals = useStore((s) => s.valuations);
  const agreed = agreedVarsFor(job.id);
  const cert = certifiedTotal(vals, job.id);
  const paid = paidTotal(vals, job.id);
  const earnedV = earned(job) + agreed;
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4 xl:grid-cols-7">
          <Stat label="Contract value" value={<Money amount={job.contractValue} currency={job.currency} />} />
          <Stat label="Agreed variations" value={<Money amount={agreed} currency={job.currency} />} />
          <Stat label="Earned to date" value={<Money amount={earnedV} currency={job.currency} />} sub="Incl. agreed VOs" />
          <Stat label="Certified" value={<Money amount={cert} currency={job.currency} />} />
          <Stat label="Paid" value={<Money amount={paid} currency={job.currency} />} />
          <Stat label="Work in progress" value={<Money amount={Math.max(0, earnedV - cert)} currency={job.currency} />} sub="Earned, not yet certified" />
          <Stat label="Forecast margin" value={pct(job.forecastMarginPct, 1)} sub={`Retention ${pct(job.retentionPct)}`} />
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Applications for payment" subtitle="Monthly applications, certified and paid" icon={<Receipt size={15} />} action={<ValuationPill status={job.valuationStatus} />} />
          <ValuationsTable job={job} />
        </Card>
        <Card>
          <CardHeader title="Variations log" subtitle="Every instruction, including verbal ones still to be confirmed in writing" />
          <VariationsLog job={job} />
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- bits
function DesignNote({ job }: { job: Job }) {
  const rec = DESIGN.find((d) => d.jobId === job.id);
  const lu = jobLastUpdate(job);
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-sunk p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">{lu.by}</span>
          <SourceBadge source={lu.source} />
          <span className="ml-auto text-[11.5px] text-ink-3">{ago(lu.at)}</span>
        </div>
        <p className="mt-1 text-[13px] text-ink-2">{lu.note}</p>
      </div>
      {rec && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Hydraulic calcs" value={rec.hydraulicCalcs} />
          <Stat label="BIM" value={rec.bimStatus} />
          <Stat label="Design hours" value={`${num(rec.designHoursUsed)} / ${num(rec.designHoursBudget)}`} />
        </div>
      )}
      <p className="text-[12.5px] text-ink-3">
        Design-only commission: there is no site diary. Drawings, calcs and coordination are tracked in{' '}
        <Link to="/design" className="font-medium text-brand hover:underline">
          Design & BIM
        </Link>
        .
      </p>
    </div>
  );
}

function defaultReason(j: Job) {
  if (j.designOnly) return `Design ${pct(j.designProgress)} complete, tracking to the client programme.`;
  if (j.health === 'on-track') return 'Tracking to programme with no open blockers.';
  return 'See site diary for detail.';
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="min-w-0">
      <span className="text-ink-3">{label} </span>
      <span className="font-medium text-ink">{children}</span>
    </span>
  );
}

function Mini({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-medium text-ink-3">{label}</div>
      <div className="mt-0.5 min-w-0 text-[13px] font-medium text-ink">{children}</div>
    </div>
  );
}

function TabLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="text-[12.5px] font-medium text-brand hover:underline">
      {children}
    </button>
  );
}
