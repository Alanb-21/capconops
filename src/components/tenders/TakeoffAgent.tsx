// Takeoff Agent demo: drop a tender pack, watch the agent read it, measure
// roofs, count outlets, size pipework and draft a BOQ with a price range.
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle2, Download, FileText, GripVertical, Loader2, Send, Sparkles, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Button, CountUp, Modal, Pill, clsx } from '../ui';
import { currentIso, useStore } from '../../store/useStore';
import { money, num } from '../../lib/format';
import { isoAdd } from '../../lib/dates';
import {
  ASSUMPTIONS,
  BOQ,
  BOQ_MARGIN,
  BOQ_TOTAL,
  OVERFLOW_OUTLETS,
  PIPES,
  PIPE_TOTAL,
  PRICE_HIGH,
  PRICE_LOW,
  ROOF_AREAS,
  SAMPLE_PACK,
  SIPHONIC_OUTLETS,
  TAKEOFF_TENDER_ID,
  TOTAL_AREA,
  TOTAL_OUTLETS,
  boqCsv,
  lineTotal,
  marginAt,
} from './takeoffData';

type Phase = 'pick' | 'running' | 'done';

const STEPS: { label: string; detail: string; ms: number }[] = [
  { label: `Reading ${SAMPLE_PACK.pages} pages`, detail: 'ITT, drawing list, 12 drawings, specification', ms: 950 },
  { label: 'Found roof plan RP-201', detail: 'Rev C3, page 17, drainage zones A to F', ms: 700 },
  { label: `Measured ${ROOF_AREAS.length} roof areas`, detail: `${num(TOTAL_AREA)} m² in total`, ms: 1150 },
  { label: `Counted ${TOTAL_OUTLETS} outlets`, detail: `${SIPHONIC_OUTLETS} siphonic + ${OVERFLOW_OUTLETS} overflow`, ms: 750 },
  { label: 'System: siphonic primary + gravity overflow', detail: 'BS EN 12056-3, 1 in 100 year storm, 2.5 min', ms: 750 },
  { label: 'Pipe lengths by diameter', detail: `${num(PIPE_TOTAL)} m from Ø56 to Ø315`, ms: 1000 },
  { label: 'Drafted BOQ', detail: `${BOQ.length} line items`, ms: 1250 },
  { label: 'Suggested price range', detail: 'From BOQ, margin and market', ms: 700 },
  { label: 'Listed assumptions', detail: `${ASSUMPTIONS.length} items to confirm`, ms: 650 },
];

const eurFmt = (v: number) => money(v, 'EUR');
const k = (v: number) => `€${Math.round(v / 1000)}k`;

export function TakeoffAgentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [step, setStep] = useState(0); // index of the step currently running; STEPS.length = all done
  const [fileName, setFileName] = useState(SAMPLE_PACK.file);
  const [over, setOver] = useState(false);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addApproval = useStore((s) => s.addApproval);
  const pushLog = useStore((s) => s.pushLog);
  const setTakeoffSent = useStore((s) => s.setTakeoffSent);
  const upsertTender = useStore((s) => s.upsertTender);
  const toast = useStore((s) => s.toast);
  const clock = useStore((s) => s.clockMinutes);

  // reset whenever the modal is opened
  useEffect(() => {
    if (open) {
      setPhase('pick');
      setStep(0);
      setSent(false);
      setFileName(SAMPLE_PACK.file);
    }
  }, [open]);

  // drive the step animation
  useEffect(() => {
    if (phase !== 'running') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 0;
    STEPS.forEach((s, i) => {
      t += s.ms;
      timers.push(setTimeout(() => setStep(i + 1), t));
    });
    timers.push(setTimeout(() => setPhase('done'), t + 250));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // keep the newest result in view
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || phase === 'pick') return;
    const id = setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), 120);
    return () => clearTimeout(id);
  }, [step, phase]);

  const start = (name: string) => {
    setFileName(name);
    setStep(0);
    setPhase('running');
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) return start(f.name);
    if (e.dataTransfer.getData('text/plain') === 'capcon-sample-pack') start(SAMPLE_PACK.file);
  };

  const send = () => {
    const now = currentIso(clock);
    upsertTender({
      id: TAKEOFF_TENDER_ID,
      name: 'Hyperscale data centre, Clonee Phase 3',
      sector: 'Data Centre',
      region: 'IE',
      location: 'Clonee, Co. Meath',
      mainContractor: SAMPLE_PACK.mainContractor,
      currency: 'EUR',
      value: BOQ_TOTAL,
      received: isoAdd(-1),
      closeDate: '2026-10-16',
      stage: 'Priced',
      estimator: "Aaron O'Neill",
      hoursEstimate: 4,
      veSaving: 21500,
      roofArea: TOTAL_AREA,
      system: 'Siphonic + gravity',
    });
    addApproval({
      id: 'AP-TAKEOFF-CLONEE3',
      agent: 'takeoff',
      title: 'Review draft BOQ: Hyperscale data centre, Clonee Phase 3',
      detail: `${ROOF_AREAS.length} roof areas, ${num(TOTAL_AREA)} m², ${TOTAL_OUTLETS} outlets, ${num(PIPE_TOTAL)} m pipework. BOQ ${eurFmt(BOQ_TOTAL)}; suggested ${k(PRICE_LOW)} to ${k(PRICE_HIGH)}. ${ASSUMPTIONS.length} assumptions to confirm.`,
      route: '/tenders',
      value: BOQ_TOTAL,
      currency: 'EUR',
      created: now,
      status: 'Pending',
      kind: 'boq',
    });
    pushLog({
      agent: 'takeoff',
      text: `Took off Clonee Phase 3 tender pack: ${num(TOTAL_AREA)} m², ${TOTAL_OUTLETS} outlets, draft BOQ ${eurFmt(BOQ_TOTAL)} sent to Aaron for review`,
    });
    setTakeoffSent(true);
    setSent(true);
    toast({ title: 'Sent to Aaron for review', detail: `Draft BOQ ${eurFmt(BOQ_TOTAL)} added to Approvals. Tender moved to Priced.`, tone: 'success' });
  };

  const download = () => {
    const blob = new Blob(['﻿' + boqCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BOQ-Clonee-Phase3-roof-drainage-draft.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ title: 'BOQ downloaded', detail: `${BOQ.length} line items, total ${eurFmt(BOQ_TOTAL)}`, tone: 'info' });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={1040}
      title={
        <span className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand">
            <Sparkles size={15} />
          </span>
          Takeoff Agent
        </span>
      }
      subtitle="Reads a tender pack, measures the roofs and drafts a priced BOQ for an estimator to check"
    >
      {phase === 'pick' ? (
        <div className="grid gap-5 md:grid-cols-[1fr_300px]">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            data-testid="takeoff-dropzone"
            className={clsx(
              'grid min-h-[300px] cursor-pointer place-items-center rounded-[20px] border-2 border-dashed p-8 text-center transition-colors',
              over ? 'border-brand bg-brand-soft' : 'border-[var(--c-hairline)] bg-sunk hover:border-brand/50',
            )}
          >
            <div>
              <motion.div
                animate={over ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }}
                className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"
              >
                <Upload size={24} />
              </motion.div>
              <div className="mt-4 text-[16px] font-semibold text-ink">Drop a tender pack here</div>
              <p className="mt-1 text-[13px] text-ink-3">PDF drawings and specification, any size. Or click to choose a file.</p>
              <p className="mt-4 text-[12px] text-ink-3">Nothing leaves this browser in the demo.</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) start(f.name);
              }}
            />
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">Sample file</div>
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', 'capcon-sample-pack');
                e.dataTransfer.effectAllowed = 'copy';
              }}
              data-testid="takeoff-sample"
              className="glass-strong flex cursor-grab items-start gap-3 rounded-2xl p-3.5 active:cursor-grabbing"
            >
              <div className="grid h-12 w-10 shrink-0 place-items-center rounded-lg bg-bad-soft text-bad">
                <FileText size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">{SAMPLE_PACK.file}</div>
                <div className="mt-0.5 text-[12px] text-ink-3">{SAMPLE_PACK.title}: roof drainage</div>
                <div className="mt-1 text-[11.5px] text-ink-3">{SAMPLE_PACK.sizeLabel} · from {SAMPLE_PACK.mainContractor}</div>
              </div>
              <GripVertical size={16} className="mt-1 shrink-0 text-ink-3" />
            </div>
            <p className="text-[12px] text-ink-3">Drag the sample onto the drop zone, or:</p>
            <Button variant="primary" icon={<Sparkles size={15} />} onClick={() => start(SAMPLE_PACK.file)} className="w-full">
              Use sample pack
            </Button>
            <a
              href={`${import.meta.env.BASE_URL}${SAMPLE_PACK.path}`}
              target="_blank"
              rel="noreferrer"
              className="text-center text-[12.5px] font-medium text-brand hover:underline"
            >
              Open the sample PDF
            </a>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[280px_1fr]">
          {/* steps */}
          <div className="flex flex-col">
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-sunk px-3 py-2">
              <FileText size={15} className="shrink-0 text-bad" />
              <span className="truncate text-[12.5px] font-medium text-ink">{fileName}</span>
            </div>
            <ol className="space-y-1" data-testid="takeoff-steps">
              {STEPS.map((s, i) => {
                const state = step > i ? 'done' : step === i ? 'run' : 'wait';
                return (
                  <li key={s.label} className={clsx('flex items-start gap-2.5 rounded-xl px-2 py-1.5 transition-opacity', state === 'wait' && 'opacity-35', state === 'run' && 'bg-brand-soft')}>
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center">
                      {state === 'done' ? (
                        <motion.span initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
                          <CheckCircle2 size={18} className="text-ok" />
                        </motion.span>
                      ) : state === 'run' ? (
                        <Loader2 size={17} className="animate-spin text-brand" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-[var(--c-ink-3)] opacity-50" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium leading-snug text-ink">{s.label}</span>
                      <span className="block text-[11.5px] text-ink-3">{s.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 rounded-xl bg-sunk px-3 py-2.5 text-[12px] text-ink-3">
              {phase === 'done' ? (
                <span className="flex items-center gap-1.5 text-ok">
                  <Check size={14} /> Done in 7.9 s. Typical manual takeoff: 1.5 to 2 days.
                </span>
              ) : (
                'Working… an estimator always reviews before anything is sent.'
              )}
            </div>
          </div>

          {/* results */}
          <div className="flex min-w-0 flex-col">
            <div ref={scrollRef} className="scroll-thin max-h-[58vh] min-h-[420px] space-y-4 overflow-y-auto pr-1" data-testid="takeoff-results">
              <AnimatePresence initial={false}>
                {step >= 0 && (
                  <Section key="read" title="Tender pack">
                    <div className="grid grid-cols-3 gap-3">
                      <MiniStat label="Pages read" value={<CountUp value={SAMPLE_PACK.pages} duration={0.9} />} />
                      <MiniStat label="Drawings" value={step >= 1 ? '12' : '…'} sub={step >= 1 ? 'Roof plan RP-201 rev C3' : undefined} />
                      <MiniStat label="Main contractor" value={<span className="text-[14px]">{SAMPLE_PACK.mainContractor}</span>} />
                    </div>
                  </Section>
                )}
                {step >= 2 && (
                  <Section key="areas" title="Roof areas" right={<Pill tone="brand">{num(TOTAL_AREA)} m²</Pill>}>
                    <MiniTable
                      head={['Roof', 'Use', 'Area', 'Siphonic', 'Overflow']}
                      align={['l', 'l', 'r', 'r', 'r']}
                      rows={ROOF_AREAS.map((r) => [r.roof, r.use, `${num(r.area)} m²`, step >= 4 ? r.siphonic : '…', step >= 4 ? r.overflow : '…'])}
                      foot={['Total', '', `${num(TOTAL_AREA)} m²`, step >= 4 ? SIPHONIC_OUTLETS : '', step >= 4 ? OVERFLOW_OUTLETS : '']}
                      stagger={STEPS[2].ms / 1000 / (ROOF_AREAS.length + 1)}
                    />
                  </Section>
                )}
                {step >= 4 && (
                  <Section key="system" title="System">
                    <div className="flex flex-wrap gap-2">
                      <Pill tone="brand">Siphonic primary</Pill>
                      <Pill tone="accent">Gravity overflow</Pill>
                      <Pill>BS EN 12056-3</Pill>
                      <Pill>1 in 100 year storm, 2.5 min</Pill>
                      <Pill>Overflow checked at 1 in 500</Pill>
                      <Pill>HDPE, suspension rail</Pill>
                    </div>
                  </Section>
                )}
                {step >= 5 && (
                  <Section key="pipes" title="Pipe lengths by diameter" right={<Pill tone="brand">{num(PIPE_TOTAL)} m</Pill>}>
                    <div className="grid grid-cols-5 gap-2">
                      {PIPES.map((p, i) => (
                        <motion.div
                          key={p.dia}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="rounded-xl bg-sunk px-2.5 py-2"
                        >
                          <div className="text-[11px] font-medium text-ink-3">Ø{p.dia}</div>
                          <div className="text-[14px] font-semibold text-ink tnum">{num(p.m)} m</div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--c-hairline)]">
                            <div className="h-full rounded-full bg-brand-2" style={{ width: `${(p.m / 610) * 100}%` }} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </Section>
                )}
                {step >= 6 && (
                  <Section key="boq" title="Draft BOQ" right={<Pill tone="brand">{eurFmt(BOQ_TOTAL)}</Pill>}>
                    <MiniTable
                      head={['Ref', 'Item', 'Qty', 'Rate', 'Total']}
                      align={['l', 'l', 'r', 'r', 'r']}
                      rows={BOQ.map((l) => [l.ref, l.item, `${num(l.qty)} ${l.unit}`, money(l.rate, 'EUR', { decimals: l.rate % 1 ? 2 : 0 }), eurFmt(lineTotal(l))])}
                      foot={['', 'BOQ total', '', '', eurFmt(BOQ_TOTAL)]}
                      stagger={STEPS[6].ms / 1000 / (BOQ.length + 1)}
                    />
                  </Section>
                )}
                {step >= 7 && (
                  <Section key="price" title="Suggested price range">
                    <PriceRange />
                  </Section>
                )}
                {step >= 8 && (
                  <Section key="assume" title="Assumptions to confirm">
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {ASSUMPTIONS.map((a, i) => (
                        <motion.li
                          key={a}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-start gap-2 rounded-lg bg-sunk px-2.5 py-1.5 text-[12.5px] text-ink-2"
                        >
                          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                          {a}
                        </motion.li>
                      ))}
                    </ul>
                  </Section>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {phase === 'done' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t hairline pt-4"
                  data-testid="takeoff-actions"
                >
                  <Button variant="ghost" onClick={() => setPhase('pick')}>
                    Run on another pack
                  </Button>
                  <Button icon={<Download size={15} />} onClick={download}>
                    Download BOQ (CSV)
                  </Button>
                  {sent ? (
                    <Button variant="ok" icon={<Check size={15} />} onClick={onClose}>
                      Sent to Aaron · Close
                    </Button>
                  ) : (
                    <Button variant="primary" icon={<Send size={15} />} onClick={send} className="!h-10 !px-5">
                      Send to Aaron for review
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border hairline p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-ink">{title}</h4>
        {right}
      </div>
      {children}
    </motion.section>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-sunk px-3 py-2">
      <div className="text-[11px] font-medium text-ink-3">{label}</div>
      <div className="mt-0.5 truncate text-[18px] font-semibold text-ink tnum">{value}</div>
      {sub && <div className="truncate text-[11px] text-ink-3">{sub}</div>}
    </div>
  );
}

function MiniTable({
  head,
  rows,
  foot,
  align,
  stagger,
}: {
  head: string[];
  rows: (string | number)[][];
  foot: (string | number)[];
  align: ('l' | 'r')[];
  stagger: number;
}) {
  return (
    <table className="w-full text-[12.5px]">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} className={clsx('border-b hairline pb-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-ink-3', align[i] === 'r' ? 'text-right' : 'text-left')}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <motion.tr key={String(r[0])} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ri * stagger, duration: 0.25 }}>
            {r.map((c, ci) => (
              <td key={ci} className={clsx('border-b hairline py-1.5 pr-2 text-ink-2 last:pr-0', align[ci] === 'r' && 'text-right tnum', ci === 0 && 'font-medium text-ink')}>
                {c}
              </td>
            ))}
          </motion.tr>
        ))}
      </tbody>
      <tfoot>
        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: rows.length * stagger }}>
          {foot.map((c, ci) => (
            <td key={ci} className={clsx('pt-2 pr-2 font-semibold text-ink last:pr-0', align[ci] === 'r' && 'text-right tnum')}>
              {c}
            </td>
          ))}
        </motion.tr>
      </tfoot>
    </table>
  );
}

function PriceRange() {
  const lo = PRICE_LOW - 20000;
  const hi = PRICE_HIGH + 20000;
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[28px] font-semibold tracking-[-0.02em] text-ink tnum">
          {k(PRICE_LOW)} to {k(PRICE_HIGH)}
        </span>
        <span className="text-[12.5px] text-ink-3">BOQ {eurFmt(BOQ_TOTAL)} sits inside the range</span>
      </div>
      <div className="relative mt-5 h-2 rounded-full bg-sunk">
        <motion.div
          className="absolute top-0 h-2 rounded-full bg-brand-2"
          style={{ left: pos(PRICE_LOW), width: `calc(${pos(PRICE_HIGH)} - ${pos(PRICE_LOW)})`, transformOrigin: 'left' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6 }}
        />
        <div className="absolute -top-1.5 h-5 w-0.5 rounded bg-brand" style={{ left: pos(BOQ_TOTAL) }} />
        <div className="absolute top-4 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-brand" style={{ left: pos(BOQ_TOTAL) }}>
          BOQ {k(BOQ_TOTAL)}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3 text-[12px]">
        <div className="rounded-xl bg-sunk px-3 py-2">
          <div className="text-ink-3">Low: competitive</div>
          <div className="font-semibold text-ink tnum">{eurFmt(PRICE_LOW)} · {(marginAt(PRICE_LOW) * 100).toFixed(1)}% margin</div>
        </div>
        <div className="rounded-xl bg-brand-soft px-3 py-2">
          <div className="text-ink-3">BOQ rates</div>
          <div className="font-semibold text-ink tnum">{eurFmt(BOQ_TOTAL)} · {(BOQ_MARGIN * 100).toFixed(0)}% margin</div>
        </div>
        <div className="rounded-xl bg-sunk px-3 py-2">
          <div className="text-ink-3">High: programme risk</div>
          <div className="font-semibold text-ink tnum">{eurFmt(PRICE_HIGH)} · {(marginAt(PRICE_HIGH) * 100).toFixed(1)}% margin</div>
        </div>
      </div>
      <p className="mt-3 text-[12px] text-ink-3">
        Margin note: Kilcarra data centre packages won at 12 to 16% over the last 12 months. Holding the BOQ rate keeps us mid-range; drop toward the low end
        only if the programme stays at a single mobilisation per roof.
      </p>
    </div>
  );
}
