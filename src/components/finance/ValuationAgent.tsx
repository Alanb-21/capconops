import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle2, FileText, Loader2, Pencil, Receipt, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar, Button, Card, CardHeader, Modal, Money, Note, Pill, clsx } from '../ui';
import { useStore } from '../../store/useStore';
import { fmtDate, daysUntil, TODAY_ISO } from '../../lib/dates';
import { num } from '../../lib/format';
import type { Job } from '../../data/types';
import { draftApplication, jobsNeedingApplication, type DraftApplication } from './financeCalc';

const STEPS = [
  'Reading installed metres from the site diary and foreman updates',
  'Applying contract rates per metre (siphonic and gravity)',
  'Adding agreed variations from the variation register',
  'Deducting retention and previously certified amounts',
  'Checking against the main contractor’s cut-off date',
];

export function ValuationAgentCard() {
  const jobs = useStore((s) => s.jobs);
  const vals = useStore((s) => s.valuations);
  const list = useMemo(() => jobsNeedingApplication(jobs, vals), [jobs, vals]);
  const [openId, setOpenId] = useState<string | null>(null);
  const openJob = jobs.find((j) => j.id === openId);
  const submitted = useMemo(() => vals.filter((v) => v.month === '2026-10'), [vals]);

  return (
    <Card strong className="h-full">
      <CardHeader
        icon={<Receipt size={15} />}
        title="Valuation Agent: October applications"
        subtitle={`${list.length} jobs need an application this cycle. The agent drafts, Valerie approves.`}
        action={<Pill tone="brand" dot>Draft only</Pill>}
      />
      <div className="space-y-2">
        {list.slice(0, 5).map(({ job, draft, cutoff }, i) => {
          const d = daysUntil(cutoff);
          const urgent = d <= 3;
          return (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className={clsx('flex items-center gap-3 rounded-2xl px-3 py-2.5', i === 0 ? 'bg-brand-soft' : 'bg-sunk')}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-medium text-ink">{job.name}</span>
                  <span className="shrink-0 text-[11.5px] text-ink-3">{job.id}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-3">
                  <span className="truncate">{mcLabel(job)}</span>
                  <span>·</span>
                  <span className={clsx('shrink-0', urgent && 'font-medium text-warn')}>Cut-off {fmtDate(cutoff, { weekday: true })}{urgent ? ` (${d} days)` : ''}</span>
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <div className="text-[13px] font-semibold text-ink">
                  <Money amount={draft.net} currency={job.currency} />
                </div>
                <div className="text-[11px] text-ink-3">net, app {draft.appNo}</div>
              </div>
              <Button size="sm" variant={i === 0 ? 'primary' : 'secondary'} icon={<Sparkles size={13} />} onClick={() => setOpenId(job.id)}>
                Draft application
              </Button>
            </motion.div>
          );
        })}
        {list.length === 0 && <div className="rounded-2xl bg-ok-soft px-4 py-6 text-center text-[13px] text-ok">All October applications are drafted or submitted.</div>}
      </div>
      {submitted.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {submitted.map((v) => {
            const j = jobs.find((x) => x.id === v.jobId);
            return (
              <div key={v.id} className="flex items-center gap-2 text-[12.5px] text-ok">
                <CheckCircle2 size={14} />
                <span className="truncate">
                  Application {v.appNo} submitted for {j?.name}: <Money amount={v.applied} currency={j?.currency} />
                </span>
              </div>
            );
          })}
        </div>
      )}
      <Note className="mt-3">Approved applications post to Sage / Xero as a draft invoice (example connection).</Note>
      <ValuationModal job={openJob} onClose={() => setOpenId(null)} />
    </Card>
  );
}

const mcLabel = (j: Job) => (j.mainContractor === 'Undisclosed' ? 'Undisclosed' : j.mainContractor);

function ValuationModal({ job, onClose }: { job?: Job; onClose: () => void }) {
  return createPortal(
    <Modal open={!!job} onClose={onClose} width={720} title={job ? `Draft application: ${job.name}` : ''} subtitle={job ? `${job.id} · ${mcLabel(job)} · cut-off ${fmtDate(`2026-10-${String(job.mcCutoffDay).padStart(2, '0')}`, { weekday: true })}` : ''}>
      {job && <ValuationRun key={job.id} job={job} onClose={onClose} />}
    </Modal>,
    document.body,
  );
}

function ValuationRun({ job, onClose }: { job: Job; onClose: () => void }) {
  const vals = useStore((s) => s.valuations);
  const diary = useStore((s) => s.diary);
  const addValuation = useStore((s) => s.addValuation);
  const addApproval = useStore((s) => s.addApproval);
  const decideApproval = useStore((s) => s.decideApproval);
  const pushLog = useStore((s) => s.pushLog);
  const toast = useStore((s) => s.toast);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(false);
  const [prelims, setPrelims] = useState(0);
  const [done, setDone] = useState(false);
  const live = useMemo(() => draftApplication(job, vals, prelims), [job, vals, prelims]);
  const [frozen, setFrozen] = useState<DraftApplication | null>(null);
  const draft = frozen ?? live;
  const diaryCount = useMemo(() => diary.filter((d) => d.jobId === job.id).length, [diary, job.id]);
  const finished = step >= STEPS.length;
  const draftRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(() => draftRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 450);
    return () => clearTimeout(t);
  }, [finished]);

  useEffect(() => {
    if (finished) return;
    const t = setTimeout(() => setStep((s) => s + 1), 650);
    return () => clearTimeout(t);
  }, [step, finished]);

  const stepDetail = (i: number) => {
    const sym = job.currency === 'GBP' ? '£' : '€';
    switch (i) {
      case 0:
        return `${num(job.siphonicInstalled)} m siphonic, ${num(job.gravityInstalled)} m gravity from ${diaryCount} diary entries`;
      case 1:
        return `Contract rate ${sym}${draft.rate.toFixed(2)} per metre from the priced BOQ`;
      case 2:
        return `${draft.variations.length} agreed variations, ${sym}${num(draft.variationsTotal)}`;
      case 3:
        return `Retention ${(job.retentionPct * 100).toFixed(0)}%, ${sym}${num(draft.previouslyCertified)} certified to date`;
      default:
        return `${mcLabel(job)} cut-off is ${fmtDate(`2026-10-${String(job.mcCutoffDay).padStart(2, '0')}`, { weekday: true })}`;
    }
  };

  const approve = () => {
    setFrozen(live);
    setEditing(false);
    const apId = `AP-VAL-${job.id}-${draft.appNo}`;
    addApproval({
      id: apId,
      agent: 'valuation',
      kind: 'valuation',
      title: `Application ${draft.appNo} for ${job.name}`,
      detail: `Gross to date ${Math.round(draft.gross)}, net due ${Math.round(draft.net)}.`,
      jobId: job.id,
      route: '/finance',
      value: Math.round(draft.net),
      currency: job.currency,
      created: `${TODAY_ISO}T08:30:00`,
      status: 'Pending',
    });
    addValuation({
      id: `AFP-OCT-${job.id}`,
      jobId: job.id,
      month: '2026-10',
      appNo: draft.appNo,
      applied: Math.round(draft.net),
      certified: null,
      paid: null,
      submitted: TODAY_ISO,
      dueOn: draft.dueOn,
    });
    decideApproval(apId, 'Approved');
    pushLog({ agent: 'valuation', text: `Application ${draft.appNo} for ${job.name} submitted to ${mcLabel(job)} after Valerie’s approval`, jobId: job.id });
    toast({ title: `Application ${draft.appNo} submitted to ${mcLabel(job)}`, detail: `${job.name}. Draft invoice posted to Sage (example connection).`, tone: 'success' });
    setDone(true);
  };

  const reject = () => {
    const apId = `AP-VAL-${job.id}-${draft.appNo}`;
    addApproval({ id: apId, agent: 'valuation', kind: 'valuation', title: `Application ${draft.appNo} for ${job.name}`, detail: 'Draft application', jobId: job.id, route: '/finance', created: `${TODAY_ISO}T08:30:00`, status: 'Pending' });
    decideApproval(apId, 'Rejected');
    toast({ title: 'Draft rejected', detail: 'The Valuation Agent will not submit. It stays in Draft for you to rework.', tone: 'info' });
    onClose();
  };

  return (
    <div>
      {/* agent working */}
      <div className="rounded-2xl bg-sunk p-4">
        <div className="mb-2.5 flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
          <Sparkles size={14} className="text-brand" /> Valuation Agent
          {!finished && <Loader2 size={13} className="animate-spin text-ink-3" />}
          {finished && <span className="text-ok">draft ready</span>}
        </div>
        <div className="space-y-1.5">
          {STEPS.map((s, i) => (
            <AnimatePresence key={s}>
              {i <= step && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 text-[12.5px]">
                  <span className="mt-0.5 shrink-0">{i < step ? <Check size={13} className="text-ok" /> : <Loader2 size={13} className="animate-spin text-brand" />}</span>
                  <span className="min-w-0">
                    <span className="text-ink">{s}</span>
                    {i < step && <span className="block text-ink-3">{stepDetail(i)}</span>}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {finished && (
          <motion.div ref={draftRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-4 scroll-mt-2">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <FileText size={15} className="text-brand" /> Application for payment no. {draft.appNo}, October 2026
              </div>
              <span className="text-[12px] text-ink-3">Valuation date {fmtDate(TODAY_ISO, { year: true })}</span>
            </div>
            <div className="overflow-hidden rounded-2xl border hairline">
              {draft.lines.map((l) => (
                <div
                  key={l.key}
                  className={clsx(
                    'flex items-center gap-3 border-b hairline px-4 py-2 text-[13px] last:border-b-0',
                    l.kind === 'subtotal' && 'bg-sunk font-semibold text-ink',
                    l.kind === 'total' && 'bg-brand-soft text-[14px] font-semibold text-ink',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className={clsx('truncate', l.kind === 'deduction' ? 'text-ink-2' : l.kind === 'variation' ? 'text-ink-2' : 'text-ink')}>{l.label}</div>
                    {l.detail && <div className="truncate text-[11.5px] text-ink-3">{l.detail}</div>}
                  </div>
                  {l.kind === 'prelims' && editing ? (
                    <input
                      type="number"
                      min={0}
                      step={500}
                      autoFocus
                      value={prelims}
                      onChange={(e) => setPrelims(Math.max(0, Number(e.target.value) || 0))}
                      className="tnum h-8 w-32 rounded-lg border hairline bg-surface-strong px-2 text-right text-[13px] text-ink outline-none focus:ring-2 focus:ring-[var(--c-brand)]"
                    />
                  ) : (
                    <span className={clsx('tnum shrink-0', l.kind === 'deduction' && 'text-ink-2', l.kind === 'total' && 'text-brand')}>
                      <Money amount={l.amount} currency={job.currency} />
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 text-[11.5px] text-ink-3">
              Reconciles: {num(job.siphonicInstalled + job.gravityInstalled)} m installed × contract rate + agreed variations{draft.prelims > 0 ? ' + prelims' : ''} = gross to date. Payment due {fmtDate(draft.dueOn, { weekday: true })}.
            </div>

            {done ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-ok-soft px-4 py-3 text-[13px] text-ok">
                <CheckCircle2 size={18} />
                <span className="flex-1">Approved by Valerie Curran and submitted to {mcLabel(job)}. Draft invoice posted to Sage (example connection).</span>
                <Button size="sm" onClick={onClose}>Close</Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-sunk px-4 py-3">
                <Avatar name="Valerie Curran" size={30} />
                <div className="min-w-0 flex-1 text-[12.5px]">
                  <div className="font-medium text-ink">Valerie Curran reviews</div>
                  <div className="text-ink-3">Nothing is sent to {mcLabel(job)} until you approve.</div>
                </div>
                <Button variant="danger" size="sm" icon={<X size={13} />} onClick={reject}>Reject</Button>
                <Button size="sm" icon={<Pencil size={13} />} onClick={() => setEditing((e) => !e)}>{editing ? 'Done editing' : 'Edit'}</Button>
                <Button variant="ok" size="sm" icon={<Check size={13} />} onClick={approve}>Approve and submit</Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
