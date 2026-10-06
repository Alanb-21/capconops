import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, Clock, Eye, Inbox, Pencil, PenLine, ScrollText, ShieldCheck, Sparkles, UserCheck, X, Zap } from 'lucide-react';
import { Button, Card, CardHeader, CountUp, Empty, LinkButton, Money, PageHeader, Pill, Sparkline, clsx } from '../components/ui';
import { AgentIcon } from '../components/agents/agentIcons';
import { AGENTS, agentById } from '../data/agents';
import type { AgentDef, AgentId, Approval } from '../data/types';
import { useStore } from '../store/useStore';
import { fmtDate, fmtTime } from '../lib/dates';

const KIND_LABEL: Record<Approval['kind'], string> = {
  valuation: 'Application',
  email: 'Email reply',
  schedule: 'Crew move',
  quote: 'Quote',
  diary: 'Diary and % complete',
  boq: 'Bill of quantities',
  handover: 'Handover pack',
  compliance: 'Compliance',
};

/** Deterministic 7-day series per agent, ending at this week's level. */
function weekSeries(a: AgentDef): number[] {
  const seed = a.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return Array.from({ length: 8 }, (_, i) => {
    const wobble = ((seed * (i + 3)) % 7) / 10 - 0.3;
    return Math.max(0.5, a.hoursSavedWeek * (0.55 + i * 0.06 + wobble * 0.3));
  });
}

export default function Agents() {
  const location = useLocation();
  const approvals = useStore((s) => s.approvals);
  const counts = useStore((s) => s.agentCounts);
  const pending = approvals.filter((a) => a.status === 'Pending');
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!(window.location.hash.includes('approvals') || location.hash.includes('approvals'))) return;
    const t = setTimeout(() => {
      document.getElementById('approvals')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setFlash(true);
      setTimeout(() => setFlash(false), 1600);
    }, 380);
    return () => clearTimeout(t);
  }, [location.hash, location.key]);

  const actionsToday = AGENTS.reduce((s, a) => s + (counts[a.id] ?? 0), 0);
  const hoursWeek = AGENTS.reduce((s, a) => s + a.hoursSavedWeek, 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Agents"
        title="AI only goes near what you let it near."
        subtitle="Every agent has one job, works on your own data, and anything that changes data waits for a person to approve it."
        actions={
          <>
            <LinkButton to="/integrations" variant="ghost" size="sm" icon={<ArrowRight size={14} />}>
              How it connects
            </LinkButton>
            <LinkButton to="/efficiency" variant="secondary" size="sm">
              Hours given back
            </LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniKpi label="Agents running" value={AGENTS.length} sub="One job each" icon={<Sparkles size={15} />} />
        <MiniKpi label="Actions today" value={actionsToday} sub="Reading, filing, drafting" icon={<Zap size={15} />} />
        <MiniKpi label="Waiting for you" value={pending.length} sub="Nothing acts until approved" icon={<UserCheck size={15} />} tone={pending.length ? 'brand' : 'ok'} />
        <MiniKpi label="Hours saved this week" value={hoursWeek} format={(v) => v.toFixed(1)} sub="Across all eight agents" icon={<Clock size={15} />} />
      </div>

      <HowItWorks />

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div id="approvals" className="scroll-mt-6 xl:col-span-3">
          <ApprovalQueue flash={flash} />
        </div>
        <div className="relative min-h-[560px] xl:col-span-2">
          <div className="h-full xl:absolute xl:inset-0">
            <ActivityLog />
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3">The agents and what they can touch</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 min-[1700px]:grid-cols-4!">
        {AGENTS.map((a, i) => (
          <AgentCard key={a.id} agent={a} delay={0.03 * i} />
        ))}
      </div>
    </div>
  );
}

function MiniKpi({ label, value, sub, icon, format, tone }: { label: string; value: number; sub: string; icon: ReactNode; format?: (v: number) => string; tone?: 'brand' | 'ok' }) {
  return (
    <Card className="!p-4">
      <div className="flex items-center justify-between text-ink-3">
        <span className="text-[12px] font-medium">{label}</span>
        <span className={clsx(tone === 'brand' && 'text-brand', tone === 'ok' && 'text-ok')}>{icon}</span>
      </div>
      <CountUp value={value} format={format} className="mt-2 block text-[28px] font-semibold leading-none text-ink" />
      <div className="mt-1.5 truncate text-[12px] text-ink-3">{sub}</div>
    </Card>
  );
}

// ------------------------------------------------------------------ how it works
const STEPS = [
  { icon: Eye, title: 'Reads', text: 'Only the inboxes, drawings and records you allow' },
  { icon: PenLine, title: 'Proposes', text: 'Drafts the email, diary, quote or crew move' },
  { icon: UserCheck, title: 'You approve', text: 'Approve, edit or reject. Nothing moves before this' },
  { icon: Zap, title: 'It acts', text: 'Sends, files or updates, exactly as approved' },
  { icon: ScrollText, title: 'Logged', text: 'Who approved what, when. A full audit trail' },
];

function HowItWorks() {
  return (
    <Card className="mt-5 !py-4" delay={0.05}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">How an agent works</span>
        <span className="text-[12px] text-ink-3">Same five steps for every agent</span>
      </div>
      <div className="flex items-stretch gap-2">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex min-w-0 flex-1 items-center gap-2">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className={clsx('flex min-w-0 flex-1 items-start gap-3 rounded-2xl px-3 py-3', i === 2 ? 'bg-brand-soft' : 'bg-sunk')}
            >
              <span className={clsx('grid h-8 w-8 shrink-0 place-items-center rounded-xl', i === 2 ? 'bg-brand text-white dark:text-[#06101e]' : 'bg-surface-strong text-brand')}>
                <s.icon size={16} />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink">{s.title}</div>
                <div className="line-clamp-3 text-[11.5px] leading-snug text-ink-3">{s.text}</div>
              </div>
            </motion.div>
            {i < STEPS.length - 1 && <ArrowRight size={14} className="shrink-0 text-ink-3" />}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ approvals
function ApprovalQueue({ flash }: { flash: boolean }) {
  const approvals = useStore((s) => s.approvals);
  const pending = approvals.filter((a) => a.status === 'Pending');
  const decided = approvals.filter((a) => a.status !== 'Pending');
  const [showDecided, setShowDecided] = useState(false);

  return (
    <Card className={clsx('h-full transition-shadow duration-500', flash && 'ring-2 ring-brand')} delay={0.08}>
      <CardHeader
        icon={<Inbox size={15} />}
        title="Waiting for approval"
        subtitle="Agents have drafted these. Nothing is sent, changed or booked until someone says yes."
        action={<Pill tone={pending.length ? 'brand' : 'ok'}>{pending.length} pending</Pill>}
      />
      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {pending.map((a) => (
            <ApprovalItem key={a.id} a={a} />
          ))}
        </AnimatePresence>
        {pending.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Empty>All clear. New drafts will appear here as agents propose them.</Empty>
          </motion.div>
        )}
      </div>

      {decided.length > 0 && (
        <div className="mt-4 border-t hairline pt-3">
          <button onClick={() => setShowDecided((o) => !o)} className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-[12.5px] font-medium text-ink-2 hover:text-ink">
            <span>Recently decided ({decided.length})</span>
            <ChevronDown size={15} className={clsx('transition-transform', showDecided && 'rotate-180')} />
          </button>
          <AnimatePresence initial={false}>
            {showDecided && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-2 flex flex-col gap-1.5">
                  {decided.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-xl bg-sunk px-3 py-2">
                      <span className="text-ink-3">
                        <AgentIcon id={a.agent} size={14} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">{a.title}</span>
                      <Pill tone={a.status === 'Approved' ? 'ok' : 'neutral'} dot>
                        {a.status}
                      </Pill>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}

function ApprovalItem({ a }: { a: Approval }) {
  const decide = useStore((s) => s.decideApproval);
  const toast = useStore((s) => s.toast);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(a.detail);
  const agent = agentById(a.agent);
  const jobLink = a.jobId ? `/projects/${a.jobId}` : a.route;

  const approve = (edited: boolean) => {
    decide(a.id, 'Approved', edited ? { detail: draft } : undefined);
    toast({ title: edited ? 'Approved with your edits' : 'Approved', detail: `${agent.name} will now act. Logged to the audit trail.`, tone: 'success' });
  };
  const reject = () => {
    decide(a.id, 'Rejected');
    toast({ title: 'Rejected', detail: `${agent.name} will not act on this.`, tone: 'info' });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 60, height: 0, marginTop: -12, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
      className="overflow-hidden rounded-2xl border hairline bg-surface-strong"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 text-[11.5px] text-ink-3">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-soft text-brand">
            <AgentIcon id={a.agent} size={13} />
          </span>
          <span className="font-medium text-ink-2">{agent.name}</span>
          <span>·</span>
          <span>{KIND_LABEL[a.kind]}</span>
          <span className="ml-auto tnum">{a.created.slice(0, 10) === '2026-10-06' ? `Today ${fmtTime(a.created)}` : `${fmtDate(a.created)} ${fmtTime(a.created)}`}</span>
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0 text-[14px] font-semibold leading-snug text-ink">{a.title}</div>
          {a.value !== undefined && <Money amount={a.value} currency={a.currency ?? 'EUR'} className="shrink-0 text-[14px] font-semibold text-ink" />}
        </div>
        <AnimatePresence initial={false} mode="wait">
          {editing ? (
            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                autoFocus
                className="w-full resize-none rounded-xl border hairline bg-sunk px-3 py-2 text-[13px] leading-relaxed text-ink outline-none focus:ring-2 focus:ring-brand/40"
              />
              <div className="mt-2 flex items-center gap-2">
                <Button size="sm" variant="primary" icon={<Check size={14} />} onClick={() => approve(true)} disabled={!draft.trim()}>
                  Approve with edits
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDraft(a.detail);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <span className="ml-auto text-[11.5px] text-ink-3">Your edit is kept in the audit log</span>
              </div>
            </motion.div>
          ) : (
            <motion.p key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-1 text-[13px] leading-relaxed text-ink-2">
              {a.detail}
            </motion.p>
          )}
        </AnimatePresence>
        {!editing && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ok" icon={<Check size={14} />} onClick={() => approve(false)}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button size="sm" variant="danger" icon={<X size={14} />} onClick={reject}>
              Reject
            </Button>
            {jobLink && (
              <Link to={jobLink} className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline">
                Open job <ArrowRight size={13} />
              </Link>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------ live log
function ActivityLog() {
  const log = useStore((s) => s.agentLog);
  const jobs = useStore((s) => s.jobs);
  const [filter, setFilter] = useState<AgentId | 'all'>('all');
  const jobName = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j.shortName])), [jobs]);
  const rows = (filter === 'all' ? log : log.filter((e) => e.agent === filter)).slice(0, 40);

  return (
    <Card className="flex h-full max-h-[760px] flex-col xl:max-h-none" delay={0.12}>
      <CardHeader
        icon={<ScrollText size={15} />}
        title="Live activity"
        subtitle="Everything every agent does, as it happens"
        action={
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ok">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
            </span>
            Live
          </span>
        }
      />
      <div className="-mt-1 mb-3 flex flex-wrap gap-1.5">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </FilterChip>
        {AGENTS.map((a) => (
          <FilterChip key={a.id} active={filter === a.id} onClick={() => setFilter(a.id)}>
            {a.name.replace(' Agent', '')}
          </FilterChip>
        ))}
      </div>
      <div className="scroll-thin -mx-2 min-h-[320px] flex-1 overflow-y-auto px-2">
        <AnimatePresence initial={false}>
          {rows.map((e) => (
            <motion.div
              key={e.id}
              layout="position"
              initial={{ opacity: 0, y: -10, backgroundColor: 'var(--c-brand-soft)' }}
              animate={{ opacity: 1, y: 0, backgroundColor: 'rgba(0,0,0,0)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, backgroundColor: { duration: 2.2 } }}
              className="flex items-start gap-3 rounded-xl border-b hairline px-2 py-2.5"
            >
              <span className="w-10 shrink-0 pt-0.5 text-[11.5px] font-medium text-ink-3 tnum">{fmtTime(e.at)}</span>
              <div className="min-w-0 flex-1">
                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10.5px] font-medium text-brand">
                  <AgentIcon id={e.agent} size={11} />
                  {agentById(e.agent).name}
                </span>
                <p className="text-[12.5px] leading-snug text-ink-2">{e.text}</p>
                {e.jobId && jobName[e.jobId] && (
                  <Link to={`/projects/${e.jobId}`} className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-brand hover:underline">
                    {e.jobId} · {jobName[e.jobId]}
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {rows.length === 0 && <Empty>No activity from this agent yet this morning.</Empty>}
      </div>
    </Card>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-full px-2.5 py-1 text-[11.5px] font-medium transition',
        active ? 'bg-brand text-white dark:text-[#06101e]' : 'bg-sunk text-ink-3 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ agent cards
function AgentCard({ agent, delay }: { agent: AgentDef; delay: number }) {
  const perms = useStore((s) => s.agentPerms);
  const count = useStore((s) => s.agentCounts[agent.id] ?? 0);
  const series = useMemo(() => weekSeries(agent), [agent]);

  return (
    <Card className="flex flex-col" delay={delay}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
          <AgentIcon id={agent.id} size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-[15px] font-semibold text-ink">{agent.name}</h3>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px] font-medium text-ok">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              Running
            </span>
          </div>
          <p className="mt-1 line-clamp-3 text-[12.5px] leading-snug text-ink-3">{agent.job}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-2xl bg-sunk px-3 py-2.5">
        <div>
          <div className="text-[11px] text-ink-3">Today</div>
          <div className="text-[18px] font-semibold text-ink tnum">{count}</div>
        </div>
        <div>
          <div className="text-[11px] text-ink-3">Hours saved / wk</div>
          <div className="text-[18px] font-semibold text-ink tnum">{agent.hoursSavedWeek}</div>
        </div>
        <Sparkline data={series} width={70} height={26} />
      </div>

      <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Can touch</div>
      <div className="mt-1.5 flex flex-col">
        {agent.touches.map((t) => {
          const key = `${agent.id}.${t.key}`;
          return <PermRow key={key} permKey={key} label={t.label} on={!!perms[key]} risky={!t.on} />;
        })}
      </div>
    </Card>
  );
}

function PermRow({ permKey, label, on, risky }: { permKey: string; label: string; on: boolean; risky: boolean }) {
  const toggle = useStore((s) => s.togglePerm);
  return (
    <div className="border-b hairline py-2 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <span className={clsx('min-w-0 text-[12.5px] leading-snug', on ? 'text-ink-2' : 'text-ink-3')}>
          {risky && <ShieldCheck size={12} className="mr-1 inline -translate-y-px text-ink-3" />}
          {label}
        </span>
        <Toggle on={on} onClick={() => toggle(permKey)} label={label} />
      </div>
      <AnimatePresence initial={false}>
        {risky && on && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden text-[11.5px] text-warn"
          >
            <span className="mt-1.5 block rounded-lg bg-warn-soft px-2 py-1">Off by default. Most firms keep this off.</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={clsx('relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200', on ? 'bg-ok' : 'bg-ink-3/30')}
    >
      <motion.span
        className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
        animate={{ left: on ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 600, damping: 34 }}
      />
    </button>
  );
}
