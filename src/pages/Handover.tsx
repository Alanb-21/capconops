import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BellRing, Check, CheckCircle2, CircleDashed, FileStack, FolderCheck, Loader2, Repeat, Send, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { HANDOVER_ITEMS, handoverStatus } from '../data/seed';
import { jobPct } from '../data/metrics';
import type { Job } from '../data/types';
import { fmtDate, isoAdd } from '../lib/dates';
import { Button, Card, CardHeader, HealthDot, Kpi, PageHeader, Pill, clsx } from '../components/ui';

const OWNERS: Record<string, string> = {
  tests: 'Site foreman',
  commissioning: 'Commissioning engineer',
  weldlogs: 'Maynooth prefab QA',
  asbuilt: 'Stephen Morris, Design',
  bcar: 'Assigned certifier',
  om: 'Handover Pack Agent',
  warranty: 'Manufacturer',
  calcs: 'Stephen Morris, Design',
  photos: 'Site foreman',
  maint: 'Robert Finn, Maintenance',
};

const PAGES: Record<string, number> = { tests: 14, commissioning: 9, weldlogs: 22, asbuilt: 18, bcar: 3, om: 36, warranty: 4, calcs: 26, photos: 41, maint: 7 };

const STEPS = [
  'Gathering pressure and water test certificates',
  'Reading commissioning records from the site diary',
  'Collecting electrofusion weld logs from Maynooth prefab',
  'Pulling as-built drawings from the drawing register',
  'Writing O&M sections: system description, operation, maintenance',
  'Checking BCAR ancillary certificate and warranty registration',
  'Building the table of contents and cross-references',
];

function stageOf(j: Job) {
  if (j.stage === 'Install') return 'Install, finishing';
  return j.stage;
}

function town(j: Job) {
  return j.location.split(',')[0];
}

function Ring({ value, size = 44, stroke = 5 }: { value: number; size?: number; stroke?: number }) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = v >= 0.9 ? 'var(--c-ok)' : v >= 0.6 ? 'var(--c-brand)' : 'var(--c-warn)';
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-hairline)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - v) }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

export default function Handover() {
  const jobs = useStore((s) => s.jobs);
  const approvals = useStore((s) => s.approvals);
  const toast = useStore((s) => s.toast);
  const pushLog = useStore((s) => s.pushLog);
  const addApproval = useStore((s) => s.addApproval);
  const nav = useNavigate();

  const list = useMemo(
    () =>
      jobs
        .filter((j) => !j.designOnly && (j.stage === 'Testing & commissioning' || j.stage === 'Handover' || (j.stage === 'Install' && jobPct(j) > 0.85)))
        .map((j) => {
          const st = handoverStatus(j);
          const done = HANDOVER_ITEMS.filter((h) => st[h.key]).length;
          return { job: j, st, done, ready: done / HANDOVER_ITEMS.length };
        })
        .sort((a, b) => (a.job.stage === b.job.stage ? b.ready - a.ready : a.job.stage === 'Handover' ? -1 : 1)),
    [jobs],
  );

  const [selId, setSelId] = useState<string>(() => list[0]?.job.id ?? '');
  const sel = list.find((x) => x.job.id === selId) ?? list[0];
  const [chased, setChased] = useState<Record<string, boolean>>({});
  const [compile, setCompile] = useState<{ jobId: string; step: number; done: boolean } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  if (!sel) {
    return (
      <div>
        <PageHeader eyebrow="Delivery" title="Testing, Commissioning & Handover" />
      </div>
    );
  }

  const j = sel.job;
  const missing = HANDOVER_ITEMS.filter((h) => !sel.st[h.key]);
  const approvalId = `AP-HO-${j.id}`;
  const queued = approvals.find((a) => a.id === approvalId);
  const compiling = compile && compile.jobId === j.id ? compile : null;

  const atHandover = list.filter((x) => x.job.stage === 'Handover');
  const inTc = list.filter((x) => x.job.stage === 'Testing & commissioning');
  const avgReady = list.length ? list.reduce((a, x) => a + x.ready, 0) / list.length : 0;
  const outstanding = list.reduce((a, x) => a + (HANDOVER_ITEMS.length - x.done), 0);

  function select(id: string) {
    setSelId(id);
    if (timer.current) window.clearInterval(timer.current);
    setCompile(null);
  }

  function chase(key: string, label: string) {
    setChased((c) => ({ ...c, [`${j.id}.${key}`]: true }));
    const owner = OWNERS[key];
    toast({ title: `Chaser sent: ${label}`, detail: `${owner} · ${j.shortName}, ${town(j)}`, tone: 'success' });
    pushLog({ agent: 'handover', text: `Chased ${owner} for ${label.toLowerCase()} on ${j.shortName}`, jobId: j.id });
  }

  function chaseAll() {
    const todo = missing.filter((m) => !chased[`${j.id}.${m.key}`]);
    if (!todo.length) return;
    setChased((c) => ({ ...c, ...Object.fromEntries(todo.map((m) => [`${j.id}.${m.key}`, true])) }));
    toast({ title: `${todo.length} ${todo.length === 1 ? "chaser" : "chasers"} sent`, detail: `${j.shortName}, ${town(j)}`, tone: 'success' });
    pushLog({ agent: 'handover', text: `Sent ${todo.length} chasers for missing handover items on ${j.shortName}`, jobId: j.id });
  }

  function runCompile() {
    if (timer.current) window.clearInterval(timer.current);
    const id = j.id;
    setCompile({ jobId: id, step: 0, done: false });
    let step = 0;
    timer.current = window.setInterval(() => {
      step++;
      if (step >= STEPS.length) {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        setCompile({ jobId: id, step, done: true });
        pushLog({ agent: 'handover', text: `Compiled draft O&M pack for ${j.shortName}: ${missing.length} ${missing.length === 1 ? 'item' : 'items'} missing`, jobId: id });
      } else setCompile({ jobId: id, step, done: false });
    }, 580);
  }

  function sendForApproval() {
    addApproval({
      id: approvalId,
      agent: 'handover',
      kind: 'handover',
      title: `Issue O&M pack for ${j.shortName}, ${town(j)}`,
      detail: missing.length
        ? `Draft pack compiled (${HANDOVER_ITEMS.filter((h) => sel.st[h.key]).reduce((a, h) => a + PAGES[h.key], 0)} pages). ${missing.length} items still missing: ${missing.map((m) => m.label).join(', ')}. Chasers sent.`
        : 'Pack complete. Ready to issue to the main contractor and client.',
      jobId: j.id,
      route: '/handover',
      created: `${isoAdd(0)}T08:30:00`,
      status: 'Pending',
    });
    pushLog({ agent: 'handover', text: `O&M pack for ${j.shortName} sent to the approval queue`, jobId: j.id });
    toast({ title: 'Sent to approval queue', detail: `Issue O&M pack for ${j.shortName}`, tone: 'success' });
  }

  const totalPages = HANDOVER_ITEMS.filter((h) => sel.st[h.key]).reduce((a, h) => a + PAGES[h.key], 0) + 4;

  return (
    <div>
      <PageHeader
        eyebrow="Delivery"
        title="Testing, Commissioning & Handover"
        subtitle="Every job in testing or handover with its pack readiness. The Handover Pack Agent compiles test certificates, weld logs, as-builts and the O&M manual, and tells you what is missing."
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="In testing & commissioning" value={inTc.length} sub="pressure and flow tests under way" icon={<CircleDashed size={15} />} />
        <Kpi label="At handover" value={atHandover.length} sub="packs being issued" icon={<FolderCheck size={15} />} delay={0.04} />
        <Kpi label="Average pack readiness" value={avgReady * 100} format={(v) => `${Math.round(v)}%`} sub={`across ${list.length} jobs`} delay={0.08} />
        <Kpi label="Items outstanding" value={outstanding} sub="certificates, records and manuals" deltaTone="warn" delta="to chase" delay={0.12} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Job list */}
        <Card padded={false} className="min-w-0 p-3">
          <div className="px-2 pb-2 pt-1 text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">{list.length} jobs</div>
          <div className="scroll-thin max-h-[760px] space-y-1 overflow-y-auto">
            {list.map((x) => (
              <button
                key={x.job.id}
                onClick={() => select(x.job.id)}
                data-testid={`ho-${x.job.id}`}
                className={clsx('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition', x.job.id === j.id ? 'bg-brand-soft' : 'hover:bg-sunk')}
              >
                <div className="relative grid place-items-center">
                  <Ring value={x.ready} />
                  <span className="tnum absolute text-[11px] font-semibold text-ink">{Math.round(x.ready * 100)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-ink">{x.job.shortName}</div>
                  <div className="truncate text-[11.5px] text-ink-3">
                    {town(x.job)} · {x.job.id}
                  </div>
                </div>
                <Pill tone={x.job.stage === 'Handover' ? 'ok' : 'brand'} className="!text-[10.5px]">
                  {x.job.stage === 'Handover' ? 'Handover' : x.job.stage === 'Install' ? 'Install' : 'T&C'}
                </Pill>
              </button>
            ))}
          </div>
        </Card>

        {/* Detail */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative grid place-items-center">
                <Ring value={sel.ready} size={92} stroke={8} />
                <div className="absolute text-center">
                  <div className="tnum text-[22px] font-semibold leading-none text-ink">{Math.round(sel.ready * 100)}%</div>
                  <div className="text-[10px] text-ink-3">ready</div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <HealthDot health={j.health} />
                  <h2 className="truncate text-[20px] font-semibold tracking-[-0.02em] text-ink">{j.name}</h2>
                </div>
                <div className="mt-1 text-[13px] text-ink-2">
                  {j.id} · {stageOf(j)} ·{' '}
                  {j.mainContractor === 'Undisclosed' ? <span className="text-ink-3">Undisclosed</span> : j.mainContractor} · {j.system}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill tone="neutral">{sel.done} of {HANDOVER_ITEMS.length} items in</Pill>
                  <Pill tone="neutral">Programme end {fmtDate(j.mcProgrammeEnd, { year: true })}</Pill>
                  {missing.length > 0 && <Pill tone="warn">{missing.length} missing</Pill>}
                </div>
              </div>
              {j.stage === 'Handover' && (
                <Button
                  variant="primary"
                  icon={<Repeat size={15} />}
                  onClick={() => {
                    toast({ title: 'Maintenance contract started', detail: `${j.shortName}, ${town(j)}: asset register prefilled from the as-builts`, tone: 'success' });
                    pushLog({ agent: 'maintenance', text: `Drafted planned maintenance proposal for ${j.shortName} from handover asset register`, jobId: j.id });
                    nav('/maintenance');
                  }}
                >
                  Set up maintenance contract
                </Button>
              )}
            </div>
            {j.stage === 'Handover' && (
              <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-brand-soft px-4 py-3 text-[12.5px] text-ink-2">
                <Repeat size={15} className="shrink-0 text-brand" />
                <span>
                  <span className="font-medium text-ink">Install becomes recurring revenue.</span> The as-builts, outlet schedule and maintenance schedule in this pack seed a planned
                  maintenance contract, like the National Children’s Hospital after its 7-year install.
                </span>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            {/* Checklist */}
            <Card>
              <CardHeader
                title="Handover checklist"
                subtitle="Status, owner and chasing"
                icon={<FileStack size={15} />}
                action={
                  missing.length > 0 ? (
                    <Button size="sm" icon={<BellRing size={13} />} onClick={chaseAll} disabled={missing.every((m) => chased[`${j.id}.${m.key}`])}>
                      Chase all
                    </Button>
                  ) : undefined
                }
              />
              <div className="divide-y divide-[var(--c-hairline)]">
                {HANDOVER_ITEMS.map((h) => {
                  const ok = sel.st[h.key];
                  const wasChased = chased[`${j.id}.${h.key}`];
                  return (
                    <div key={h.key} className="flex items-center gap-3 py-2.5">
                      <span className={clsx('grid h-6 w-6 shrink-0 place-items-center rounded-full', ok ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn')}>
                        {ok ? <Check size={13} strokeWidth={2.5} /> : <CircleDashed size={13} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-ink">{h.label}</div>
                        <div className="truncate text-[11.5px] text-ink-3">
                          {h.key === 'warranty' ? j.system.split(' ')[0] : OWNERS[h.key]} · {ok ? 'Received' : wasChased ? 'Chased today' : 'Missing'}
                        </div>
                      </div>
                      {!ok &&
                        (wasChased ? (
                          <Pill tone="brand">Chased</Pill>
                        ) : (
                          <Button size="sm" variant="ghost" icon={<BellRing size={13} />} onClick={() => chase(h.key, h.label)}>
                            Chase
                          </Button>
                        ))}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Agent */}
            <Card strong>
              <CardHeader
                title="Handover Pack Agent"
                subtitle="Compiles the O&M pack from records already in Capcon OS"
                icon={<FolderCheck size={15} />}
                action={
                  !compiling ? (
                    <Button variant="primary" size="sm" icon={<FileStack size={13} />} onClick={runCompile} className="" title="Compile pack">
                      Compile pack
                    </Button>
                  ) : compiling.done ? (
                    <Button size="sm" variant="ghost" onClick={runCompile}>
                      Recompile
                    </Button>
                  ) : undefined
                }
              />
              {!compiling && (
                <div className="rounded-2xl border border-dashed hairline px-4 py-6 text-center text-[13px] text-ink-3">
                  The agent reads test certificates, weld logs, as-builts and diary records for {j.shortName} and drafts the O&M pack in about four seconds. Nothing is sent without approval.
                </div>
              )}
              <AnimatePresence mode="wait">
                {compiling && !compiling.done && (
                  <motion.div key="steps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                    {STEPS.map((s, i) => (
                      <div key={s} className={clsx('flex items-center gap-2.5 text-[13px] transition-opacity', i > compiling.step && 'opacity-35')}>
                        {i < compiling.step ? (
                          <CheckCircle2 size={15} className="shrink-0 text-ok" />
                        ) : i === compiling.step ? (
                          <Loader2 size={15} className="shrink-0 animate-spin text-brand" />
                        ) : (
                          <CircleDashed size={15} className="shrink-0 text-ink-3" />
                        )}
                        <span className={i === compiling.step ? 'font-medium text-ink' : 'text-ink-2'}>{s}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
                {compiling && compiling.done && (
                  <motion.div key="preview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} data-testid="pack-preview">
                    <div className="rounded-2xl bg-sunk p-4">
                      <div className="flex items-baseline justify-between">
                        <div className="text-[13px] font-semibold text-ink">O&M pack · {j.shortName}</div>
                        <div className="tnum text-[11.5px] text-ink-3">Draft rev A · {totalPages} pages</div>
                      </div>
                      <ol className="mt-3 space-y-1.5">
                        <li className="flex items-center gap-2 text-[12.5px] text-ink-2">
                          <span className="tnum w-5 text-ink-3">1</span>
                          <span className="flex-1">Cover, contents and contacts</span>
                          <span className="tnum text-ink-3">4 pp</span>
                          <Check size={14} className="text-ok" />
                        </li>
                        {HANDOVER_ITEMS.map((h, i) => {
                          const ok = sel.st[h.key];
                          return (
                            <li key={h.key} className="flex items-center gap-2 text-[12.5px]">
                              <span className="tnum w-5 text-ink-3">{i + 2}</span>
                              <span className={clsx('min-w-0 flex-1 truncate', ok ? 'text-ink-2' : 'text-ink-3 line-through decoration-[var(--c-bad)]/50')}>{h.label}</span>
                              <span className="tnum text-ink-3">{ok ? `${PAGES[h.key]} pp` : '–'}</span>
                              {ok ? <Check size={14} className="text-ok" /> : <X size={14} className="text-bad" />}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                    {missing.length > 0 ? (
                      <div className="mt-3 rounded-2xl bg-warn-soft px-4 py-3">
                        <div className="text-[12.5px] font-semibold text-ink">What is missing</div>
                        <ul className="mt-1 space-y-0.5 text-[12.5px] text-ink-2">
                          {missing.map((m) => (
                            <li key={m.key}>
                              {m.label}: {m.key === 'warranty' ? j.system.split(' ')[0] : OWNERS[m.key]}
                              {chased[`${j.id}.${m.key}`] ? ' (chased)' : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-ok-soft px-4 py-3 text-[12.5px] font-medium text-ok">
                        <CheckCircle2 size={15} /> Pack complete, ready to issue
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {queued ? (
                        <>
                          <Pill tone={queued.status === 'Approved' ? 'ok' : queued.status === 'Rejected' ? 'bad' : 'brand'} dot>
                            {queued.status === 'Pending' ? 'In approval queue' : queued.status}
                          </Pill>
                          <Button size="sm" variant="ghost" icon={<ArrowRight size={13} />} onClick={() => nav('/agents')}>
                            Open approvals
                          </Button>
                        </>
                      ) : (
                        <Button variant="primary" size="sm" icon={<Send size={13} />} onClick={sendForApproval}>
                          Send to approval queue
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
