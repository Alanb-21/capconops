import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Lightbulb, MessageSquareQuote, MousePointerClick, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { TOUR, TOUR_TARGET_SECS, type TourTarget } from './notes';

const fmtClock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Find the card around a heading/button with the given text (or a selector). */
function findTarget(t: TourTarget): HTMLElement | null {
  let el: HTMLElement | null = null;
  if (t.selector) el = document.querySelector<HTMLElement>(t.selector);
  if (!el && t.text) {
    const want = t.text.trim();
    const order = ['h1', 'h2', 'h3', 'button', 'span', 'div'];
    outer: for (const tag of order) {
      for (const node of Array.from(document.querySelectorAll<HTMLElement>(`#main-scroll ${tag}`))) {
        if (node.textContent?.trim() === want && node.offsetParent !== null) {
          el = node;
          break outer;
        }
      }
    }
    if (el && el.tagName !== 'BUTTON') el = el.closest<HTMLElement>('.glass, .glass-strong') ?? el;
  }
  for (let i = 0; el && i < (t.up ?? 0); i++) el = el.parentElement;
  return el;
}

function useSpotlight(target: TourTarget | undefined, key: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [dim, setDim] = useState(false);
  useEffect(() => {
    setRect(null);
    setDim(false);
    if (!target) return;
    let el: HTMLElement | null = null;
    let tries = 0;
    let scrolled = false;
    const id = window.setInterval(() => {
      if (!el || !el.isConnected) {
        el = findTarget(target);
        tries++;
        if (!el) {
          if (tries > 40) window.clearInterval(id);
          return;
        }
      }
      if (!scrolled) {
        scrolled = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setDim(true);
        window.setTimeout(() => setDim(false), 4500);
      }
      const r = el.getBoundingClientRect();
      setRect((prev) => (prev && Math.abs(prev.top - r.top) < 0.5 && Math.abs(prev.left - r.left) < 0.5 && Math.abs(prev.width - r.width) < 0.5 && Math.abs(prev.height - r.height) < 0.5 ? prev : r));
    }, 120);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { rect, dim };
}

export function Walkthrough() {
  const demo = useStore((s) => s.demo);
  const setDemo = useStore((s) => s.setDemo);
  const setRole = useStore((s) => s.setRole);
  const setAssistantOpen = useStore((s) => s.setAssistantOpen);
  const setNotesOpen = useStore((s) => s.setNotesOpen);
  const notesOpen = useStore((s) => s.notesOpen);
  const nav = useNavigate();
  const step = TOUR[demo.step];
  const [min, setMin] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const started = useRef<number | null>(null);
  const stepStarted = useRef<number>(Date.now());
  const [now, setNow] = useState(Date.now());

  // start / stop timer
  useEffect(() => {
    if (demo.active && started.current === null) started.current = Date.now();
    if (!demo.active) started.current = null;
    if (demo.active) setMin(false);
  }, [demo.active]);
  useEffect(() => {
    if (!demo.active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [demo.active]);

  // Clicking anywhere in the app tucks the card away so it never blocks what you need to click.
  useEffect(() => {
    if (!demo.active) return;
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest('[data-tour-ui]')) return;
      setMin(true);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [demo.active]);

  // navigate on step change
  useEffect(() => {
    if (!demo.active || !step) return;
    setMin(false);
    stepStarted.current = Date.now();
    setRole(step.route === '/field' ? 'technician' : 'donnacha');
    nav(step.route);
    setAssistantOpen(!!step.assistant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo.active, demo.step]);

  const go = (d: number) => {
    const next = demo.step + d;
    if (next < 0) return;
    if (next >= TOUR.length) {
      setDemo({ active: false, step: 0 });
      setAssistantOpen(false);
      setRole('donnacha');
      return;
    }
    setDemo({ step: next });
  };

  // keyboard
  useEffect(() => {
    if (!demo.active) return;
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !min)) {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Escape') {
        setMin(true);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const { rect, dim } = useSpotlight(demo.active && !min ? step?.target : undefined, `${demo.active}-${demo.step}-${min}`);

  if (!demo.active || !step) return null;
  // Dock the card on the side away from the highlighted element so it never covers it.
  const dockRight = !!rect && rect.left + rect.width / 2 < 280 + (window.innerWidth - 280) / 2;
  const dockCls = dockRight ? 'right-24' : 'left-[280px]';
  const elapsed = started.current ? (now - started.current) / 1000 : 0;
  const stepElapsed = (now - stepStarted.current) / 1000;
  const budgetSoFar = TOUR.slice(0, demo.step + 1).reduce((a, s) => a + s.secs, 0);
  const behind = elapsed > budgetSoFar + 20;
  const chapters = [...new Set(TOUR.map((s) => s.chapter))];

  return createPortal(
    <>
      {/* Spotlight */}
      <AnimatePresence>
        {rect && !min && (
          <motion.div
            key={`spot-${demo.step}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed z-[55] rounded-[24px]"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: `0 0 0 3px var(--c-brand), 0 0 0 9999px rgba(6, 16, 30, ${dim ? 0.32 : 0})`,
              transition: 'box-shadow 0.8s ease, top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease',
            }}
            data-testid="tour-spotlight"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {min ? (
          <motion.button
            key="pill"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={() => setMin(false)}
            className={clsx('glass-strong fixed bottom-5 z-[60] flex items-center gap-3 rounded-full py-2 pl-2 pr-4 text-left', dockCls)}
            data-testid="tour-pill"
            data-tour-ui
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-[12px] font-semibold text-white dark:text-[#06101e]">{step.chapter}</span>
            <span className="text-[12.5px] font-medium text-ink">{step.title}</span>
            <span className={clsx('tnum text-[12px]', behind ? 'text-warn' : 'text-ink-3')}>{fmtClock(elapsed)}</span>
            <ChevronUp size={15} className="text-ink-3" />
          </motion.button>
        ) : (
          <motion.div
            key="card"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className={clsx('glass-strong fixed bottom-5 z-[60] w-[min(470px,calc(100vw-300px))] overflow-hidden rounded-[22px]', dockCls)}
            data-testid="demo-guide"
            data-tour-ui
          >
            {/* header */}
            <div className="flex items-center gap-2 border-b hairline px-4 py-2.5">
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">Walkthrough</span>
              <span className="min-w-0 truncate text-[11px] text-ink-3">
                · {step.chapter}/{chapters.length} {step.chapterTitle}
              </span>
              <span className={clsx('ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap text-[11.5px] tnum', behind ? 'text-warn' : 'text-ink-3')} title="Elapsed vs the 12-minute plan">
                <Clock size={12} /> {fmtClock(elapsed)} / {fmtClock(TOUR_TARGET_SECS)}
              </span>
              <button onClick={() => setNotesOpen(!notesOpen)} className={clsx('rounded-full p-1 hover:bg-sunk', notesOpen ? 'text-brand' : 'text-ink-3')} title="Page notes (N)" aria-label="Page notes">
                <BookOpen size={15} />
              </button>
              <button onClick={() => setMin(true)} className="rounded-full p-1 text-ink-3 hover:bg-sunk hover:text-ink" title="Minimise (Esc)" aria-label="Minimise walkthrough">
                <ChevronDown size={16} />
              </button>
              <button
                onClick={() => {
                  setDemo({ active: false });
                  setAssistantOpen(false);
                }}
                className="rounded-full p-1 text-ink-3 hover:bg-sunk hover:text-ink"
                aria-label="End walkthrough"
                title="End walkthrough"
              >
                <X size={15} />
              </button>
            </div>

            <div className="scroll-thin max-h-[52vh] overflow-y-auto px-4 pb-3 pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">{step.title}</h3>
                <span className={clsx('shrink-0 text-[11px] tnum', stepElapsed > step.secs ? 'text-warn' : 'text-ink-3')}>
                  ~{Math.round(step.secs / 10) * 10 >= 60 ? `${(step.secs / 60).toFixed(1).replace('.0', '')} min` : `${step.secs}s`}
                </span>
              </div>

              <div className="mt-2.5 flex gap-2.5">
                <MessageSquareQuote size={15} className="mt-0.5 shrink-0 text-brand" />
                <p className="text-[13.5px] leading-snug text-ink">“{step.say}”</p>
              </div>
              <div className="mt-2 flex gap-2.5">
                <MousePointerClick size={15} className="mt-0.5 shrink-0 text-brand-2" />
                <p className="text-[12.5px] leading-snug text-ink-2">{step.do}</p>
              </div>

              {step.questions && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 pl-[25px]">
                  {step.questions.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setAssistantOpen(true);
                        window.setTimeout(() => window.dispatchEvent(new CustomEvent('capcon:ask', { detail: q })), 150);
                      }}
                      className="rounded-full bg-brand-soft px-2.5 py-1 text-left text-[11.5px] font-medium text-brand hover:brightness-95"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <button onClick={() => setShowHow((v) => !v)} className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-ink-3 hover:text-ink-2">
                <Lightbulb size={13} /> How it works {showHow ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showHow && (
                <div className="mt-1.5 rounded-xl bg-sunk px-3 py-2 text-[12px] leading-snug text-ink-2">
                  {step.how}
                  {step.ask && (
                    <div className="mt-2 border-t hairline pt-2">
                      <span className="font-medium text-ink">If asked: “{step.ask.q}”</span>
                      <br />
                      {step.ask.a}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 pb-2 text-[10.5px] text-ink-3">Click anywhere to tuck this away · → next · N notes</div>

            {/* footer */}
            <div className="flex items-center gap-2 border-t hairline px-4 py-2.5">
              <div className="flex flex-1 gap-1">
                {TOUR.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setDemo({ step: i })}
                    className={clsx('h-1.5 flex-1 rounded-full transition', i > 0 && TOUR[i - 1].chapter !== s.chapter && 'ml-1')}
                    style={{ background: i <= demo.step ? 'var(--c-brand)' : 'var(--c-hairline)' }}
                    aria-label={`Go to step ${i + 1}: ${s.title}`}
                    title={s.title}
                  />
                ))}
              </div>
              <button onClick={() => go(-1)} disabled={demo.step === 0} className="flex h-8 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-sunk disabled:opacity-40">
                <ChevronLeft size={15} /> Back
              </button>
              <button onClick={() => go(1)} className="flex h-8 items-center gap-1 rounded-full bg-brand px-3.5 text-[12.5px] font-semibold text-white dark:text-[#06101e]" data-testid="demo-next">
                {demo.step === TOUR.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
