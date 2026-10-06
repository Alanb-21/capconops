// Capcon Assistant: glass side panel that answers plain-English questions from
// live Capcon OS data. Opens from the top-bar button, the floating button, ⌘K,
// and the `capcon:ask` window event (detail = question text).
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowUp, Check, Copy, CornerDownRight, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import clsx from 'clsx';
import { useStore, currentIso } from '../store/useStore';
import { CHART, ChartTooltip, axisProps } from '../components/charts';
import { SUGGESTED, answer as localAnswer, type Answer, type Block, type Tone } from './engine';
import { askClaude } from './remote';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  answer?: Answer;
  status: 'typing' | 'streaming' | 'done';
  via?: 'local' | 'claude';
}

const WORD_MS = 30;
const TYPING_MS = 420;
const NARROW = 1100;

let seq = 0;
const nextId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

export function AssistantPanel() {
  const open = useStore((s) => s.assistantOpen);
  const setOpen = useStore((s) => s.setAssistantOpen);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const msgsRef = useRef<Msg[]>([]);
  msgsRef.current = msgs;

  const ask = useCallback((raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const aId = nextId();
    stick.current = true;
    setMsgs((m) => [...m, { id: nextId(), role: 'user', text: q, status: 'done' }, { id: aId, role: 'assistant', status: 'typing' }]);
    const history = msgsRef.current
      .filter((m) => m.status === 'done')
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.role === 'user' ? (m.text ?? '') : plainText(m.answer) }));
    window.setTimeout(async () => {
      let a: Answer = localAnswer(q);
      let via: Msg['via'] = 'local';
      if (!a.confident) {
        const text = await askClaude(q, history);
        if (text) {
          a = { confident: true, sources: ['Capcon OS data', 'Claude'], blocks: [{ kind: 'text', text }], suggestions: a.suggestions };
          via = 'claude';
        }
      }
      setMsgs((m) => m.map((x) => (x.id === aId ? { ...x, answer: a, status: 'streaming', via } : x)));
    }, TYPING_MS);
  }, []);

  const finish = useCallback((id: string) => {
    setMsgs((m) => m.map((x) => (x.id === id ? { ...x, status: 'done' } : x)));
  }, []);

  // capcon:ask from the search palette (and anything else)
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<unknown>).detail;
      useStore.getState().setAssistantOpen(true);
      if (typeof d === 'string' && d.trim()) ask(d);
    };
    window.addEventListener('capcon:ask', h);
    return () => window.removeEventListener('capcon:ask', h);
  }, [ask]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 260);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  // auto-scroll while content grows, unless the reader has scrolled up
  useLayoutEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    const inner = innerRef.current;
    if (!el || !inner || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, [open]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const submit = () => {
    if (!input.trim()) return;
    ask(input);
    setInput('');
  };

  const busy = msgs.some((m) => m.status !== 'done');

  return (
    <>
      {/* floating launcher */}
      <motion.button
        data-testid="assist-fab"
        onClick={() => setOpen(!open)}
        aria-label="Ask Capcon"
        title="Ask Capcon (⌘K)"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="glass-strong group fixed bottom-5 right-5 z-[65] grid h-14 w-14 place-items-center rounded-full"
      >
        <span className="absolute inset-[5px] rounded-full bg-gradient-to-br from-[var(--c-brand)] to-[var(--c-brand-2)] opacity-95 shadow-[0_8px_22px_-8px_var(--c-brand)]" />
        <span className="absolute inset-[5px] animate-ping rounded-full bg-[var(--c-brand-2)] opacity-0 [animation-duration:2.8s] group-hover:opacity-20" />
        <Sparkles size={20} className="relative text-white" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            key="assistant"
            data-testid="assist-panel"
            role="dialog"
            aria-label="Ask Capcon"
            initial={{ x: 480, opacity: 0.4 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 480, opacity: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            style={{ background: 'color-mix(in srgb, var(--c-bg) 95%, transparent)' }}
            className="glass-strong fixed bottom-3 right-3 top-3 z-[70] flex w-[440px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[24px]"
          >
            {/* header */}
            <div className="flex items-center gap-3 border-b hairline px-5 py-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--c-brand)] to-[var(--c-brand-2)] text-white shadow-[0_6px_16px_-6px_var(--c-brand)]">
                <Sparkles size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Ask Capcon</div>
                <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Answers from live Capcon OS data
                </div>
              </div>
              {msgs.length > 0 && (
                <button onClick={() => setMsgs([])} disabled={busy} title="New conversation" aria-label="New conversation" className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition hover:bg-sunk hover:text-ink disabled:opacity-40">
                  <RotateCcw size={15} />
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Close assistant" data-testid="assist-close" className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition hover:bg-sunk hover:text-ink">
                <X size={17} />
              </button>
            </div>

            {/* conversation */}
            <div ref={scrollRef} onScroll={onScroll} className="scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
              <div ref={innerRef} className="flex flex-col gap-3">
                {msgs.length === 0 && <EmptyState onAsk={ask} />}
                {msgs.map((m) =>
                  m.role === 'user' ? (
                    <UserBubble key={m.id} text={m.text ?? ''} />
                  ) : (
                    <AssistantBubble key={m.id} msg={m} onDone={finish} onAsk={ask} />
                  ),
                )}
              </div>
            </div>

            {/* composer */}
            <div className="border-t hairline px-4 pb-4 pt-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className="flex items-center gap-2 rounded-full bg-sunk py-1.5 pl-4 pr-1.5 ring-1 ring-transparent transition focus-within:ring-[var(--c-brand)]/40"
              >
                <input
                  ref={inputRef}
                  data-testid="assist-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about jobs, crews, money, tenders…"
                  className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3"
                />
                <button
                  type="submit"
                  data-testid="assist-send"
                  disabled={!input.trim()}
                  aria-label="Send"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:brightness-110 disabled:opacity-35 dark:text-[#06101e]"
                >
                  <ArrowUp size={16} />
                </button>
              </form>
              <div className="mt-2 text-center text-[11px] text-ink-3">Read-only. Anything that changes data goes to the approval queue first.</div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------- empty state
function EmptyState({ onAsk }: { onAsk: (q: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="px-1 pt-2">
      <div className="mb-1 text-[20px] font-semibold tracking-[-0.02em] text-ink">Morning, Donnacha.</div>
      <p className="mb-5 text-[13.5px] leading-relaxed text-ink-2">
        Ask the business a question in plain English. I read the same live data as every page in Capcon OS, show my sources, and link you straight to the right screen.
      </p>
      <div className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">Try asking</div>
      <div className="flex flex-col gap-2">
        {SUGGESTED.map((q, i) => (
          <motion.button
            key={q}
            data-testid="assist-chip"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 + i * 0.04 }}
            onClick={() => onAsk(q)}
            className="glass group flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-[13px] text-ink-2 transition hover:text-ink"
          >
            <CornerDownRight size={14} className="shrink-0 text-brand" />
            <span className="flex-1">{q}</span>
            <ArrowRight size={14} className="shrink-0 text-ink-3 opacity-0 transition group-hover:opacity-100" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------- bubbles
function UserBubble({ text }: { text: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end pl-10">
      <div className="rounded-[18px] rounded-br-md bg-brand px-3.5 py-2 text-[13.5px] leading-snug text-white shadow-[0_6px_16px_-8px_var(--c-brand)] dark:text-[#06101e]">{text}</div>
    </motion.div>
  );
}

function blockUnits(b: Block): number {
  if (b.kind === 'text') return Math.max(1, countWords(b.text));
  if (b.kind === 'email') return countWords(b.subject) + countWords(b.body);
  return 4;
}
function countWords(s: string) {
  return s.split(/\s+/).filter(Boolean).length;
}
function takeWords(s: string, n: number) {
  if (n <= 0) return '';
  const parts = s.split(/(\s+)/);
  let w = 0;
  let out = '';
  for (const p of parts) {
    if (!p) continue;
    if (/^\s+$/.test(p)) {
      out += p;
      continue;
    }
    if (w >= n) break;
    out += p;
    w++;
  }
  return out.replace(/\s+$/, '');
}
function plainText(a?: Answer) {
  if (!a) return '';
  return a.blocks
    .map((b) => (b.kind === 'text' ? b.text : b.kind === 'email' ? `${b.subject}\n${b.body}` : ''))
    .filter(Boolean)
    .join('\n')
    .replace(/\*\*/g, '')
    .slice(0, 1200);
}

function AssistantBubble({ msg, onDone, onAsk }: { msg: Msg; onDone: (id: string) => void; onAsk: (q: string) => void }) {
  const a = msg.answer;
  const units = useMemo(() => (a ? a.blocks.map(blockUnits) : []), [a]);
  const total = units.reduce((x, y) => x + y, 0);
  const [shown, setShown] = useState(msg.status === 'done' ? Number.MAX_SAFE_INTEGER : 0);

  useEffect(() => {
    if (msg.status !== 'streaming') return;
    let n = 0;
    const t = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= total) {
        window.clearInterval(t);
        onDone(msg.id);
      }
    }, WORD_MS);
    return () => window.clearInterval(t);
  }, [msg.status, msg.id, total, onDone]);

  const done = msg.status === 'done';
  const nav = useNavigate();
  const setOpen = useStore((s) => s.setAssistantOpen);
  const go = (to: string) => {
    nav(to);
    if (window.innerWidth < NARROW) setOpen(false);
  };

  if (msg.status === 'typing' || !a) {
    return (
      <div className="flex pr-10">
        <div className="glass flex items-center gap-1.5 rounded-[18px] rounded-bl-md px-4 py-3" data-testid="assist-typing">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-ink-3" animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </div>
      </div>
    );
  }

  let budget = done ? Number.MAX_SAFE_INTEGER : shown;
  const rendered: ReactNode[] = [];
  a.blocks.forEach((b, i) => {
    if (budget <= 0) return;
    const u = units[i];
    const partial = Math.min(budget, u);
    budget -= u;
    rendered.push(<BlockView key={i} block={b} words={partial} complete={partial >= u} go={go} />);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex" data-testid="assist-msg" data-done={done ? '1' : '0'}>
      <div className="glass min-w-0 flex-1 rounded-[18px] rounded-bl-md px-3.5 py-3">
        <div className="flex flex-col gap-3" data-testid="assist-answer">
          {rendered}
        </div>
        <AnimatePresence>
          {done && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 border-t hairline pt-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-ink-3">Sources</span>
                {a.sources.map((s) => (
                  <span key={s} className="rounded-full bg-sunk px-2 py-0.5 text-[11px] font-medium text-ink-2">
                    {s}
                  </span>
                ))}
                <span className="ml-auto text-[11px] text-ink-3 tnum">{msg.via === 'claude' ? 'via Claude' : `as of ${currentIso(useStore.getState().clockMinutes).slice(11, 16)}`}</span>
              </div>
              {a.suggestions && a.suggestions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {a.suggestions.map((q) => (
                    <button key={q} onClick={() => onAsk(q)} className="rounded-full border hairline bg-surface-strong px-2.5 py-1 text-left text-[12px] text-ink-2 transition hover:border-[var(--c-brand)]/40 hover:text-brand">
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------- blocks
const toneText: Record<Tone, string> = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', brand: 'text-brand' };
const toneDot: Record<Tone, string> = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', brand: 'bg-brand' };

function BlockView({ block, words, complete, go }: { block: Block; words: number; complete: boolean; go: (to: string) => void }) {
  if (block.kind === 'text') return <Markdown text={complete ? block.text : takeWords(block.text, words)} />;
  if (block.kind === 'email') return <EmailCard block={block} words={words} complete={complete} />;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="min-w-0">
      {block.kind === 'stats' && <Stats block={block} />}
      {block.kind === 'table' && <MiniTable block={block} go={go} />}
      {block.kind === 'chart' && <MiniChart block={block} />}
      {block.kind === 'links' && (
        <div className="flex flex-wrap gap-1.5">
          {block.links.map((l) => (
            <button key={l.to + l.label} onClick={() => go(l.to)} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[12.5px] font-medium text-brand transition hover:brightness-110">
              {l.label} <ArrowRight size={13} />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function inline(s: string): ReactNode[] {
  // balance an unclosed ** while streaming
  const count = (s.match(/\*\*/g) ?? []).length;
  const t = count % 2 === 1 ? s + '**' : s;
  return t.split(/(\*\*[^*]*\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') && p.length >= 4 ? (
      <strong key={i} className="font-semibold text-ink">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{p.replace(/\*\*/g, '')}</Fragment>
    ),
  );
}

function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flushList = () => {
    if (!list.length) return;
    const items = list;
    out.push(
      <ul key={`u${out.length}`} className="flex flex-col gap-1.5">
        {items.map((l, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--c-brand)]" />
            <span className="min-w-0">{inline(l)}</span>
          </li>
        ))}
      </ul>,
    );
    list = [];
  };
  const flushPara = () => {
    if (!para.length) return;
    const ps = para;
    out.push(
      <p key={`p${out.length}`}>
        {ps.map((l, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {inline(l)}
          </Fragment>
        ))}
      </p>,
    );
    para = [];
  };
  for (const l of lines) {
    const m = l.match(/^\s*[-•*]\s+(.*)$/);
    if (m) {
      flushPara();
      list.push(m[1]);
    } else if (!l.trim()) {
      flushList();
      flushPara();
    } else {
      flushList();
      para.push(l);
    }
  }
  flushList();
  flushPara();
  return <div className="flex flex-col gap-2 text-[13.5px] leading-relaxed text-ink-2">{out}</div>;
}

function Stats({ block }: { block: Extract<Block, { kind: 'stats' }> }) {
  return (
    <div className={clsx('grid gap-2', block.items.length >= 4 ? 'grid-cols-2' : 'grid-cols-3')}>
      {block.items.map((s) => (
        <div key={s.label} className="min-w-0 rounded-xl bg-sunk px-3 py-2">
          <div className="truncate text-[11px] font-medium text-ink-3">{s.label}</div>
          <div className={clsx('tnum truncate text-[18px] font-semibold tracking-[-0.02em]', s.tone ? toneText[s.tone] : 'text-ink')}>{s.value}</div>
          {s.sub && <div className="tnum truncate text-[11px] text-ink-3">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function MiniTable({ block, go }: { block: Extract<Block, { kind: 'table' }>; go: (to: string) => void }) {
  return (
    <div className="scroll-thin overflow-x-auto rounded-xl bg-sunk">
      <table className="w-full border-separate border-spacing-0 text-[12px]">
        <thead>
          <tr>
            {block.columns.map((c, i) => (
              <th
                key={c.label + i}
                className={clsx(
                  'border-b hairline px-2.5 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.04em] text-ink-3',
                  c.align === 'right' ? 'text-right' : 'text-left',
                  i === 0 || c.wrap ? '' : 'whitespace-nowrap',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r, ri) => (
            <tr key={ri} onClick={r.to ? () => go(r.to!) : undefined} className={clsx('transition-colors', r.to && 'cursor-pointer hover:bg-brand-soft')}>
              {r.cells.map((c, ci) => (
                <td
                  key={ci}
                  title={c}
                  className={clsx(
                    'px-2.5 py-1.5 align-middle',
                    ri < block.rows.length - 1 || block.foot ? 'border-b hairline' : '',
                    block.columns[ci]?.align === 'right' ? 'tnum text-right' : 'text-left',
                    ci === 0 ? 'font-medium text-ink' : 'text-ink-2',
                  )}
                >
                  {ci === 0 ? (
                    <span className="flex min-w-0 items-start gap-1.5">
                      {r.tone && <span className={clsx('mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full', toneDot[r.tone])} />}
                      <span className={clsx('min-w-0 leading-snug', c.includes(' ') ? 'line-clamp-2' : 'whitespace-nowrap')}>{c}</span>
                    </span>
                  ) : (
                    <span className={clsx('block leading-snug', block.columns[ci]?.wrap ? 'line-clamp-2' : 'whitespace-nowrap')}>{c}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
          {block.foot && (
            <tr>
              {block.foot.map((c, ci) => (
                <td key={ci} className={clsx('whitespace-nowrap px-2.5 py-1.5 font-semibold text-ink', block.columns[ci]?.align === 'right' ? 'tnum text-right' : 'text-left')}>
                  {c}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MiniChart({ block }: { block: Extract<Block, { kind: 'chart' }> }) {
  const fmt = (v: number) => (block.unit === '%' ? `${v.toFixed(1)}%` : `${Math.round(v).toLocaleString('en-IE')} m`);
  const W = 360;
  const H = 128;
  return (
    <div className="overflow-hidden rounded-xl bg-sunk px-2 pb-1 pt-2">
      {block.caption && <div className="mb-1 px-1 text-[11px] font-medium text-ink-3">{block.caption}</div>}
      <div className="h-[128px] w-full overflow-hidden">
        {block.type === 'bar' ? (
          <BarChart width={W} height={H} data={block.data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" {...axisProps} interval={block.data.length > 8 ? 2 : 0} tick={{ fontSize: 10, fill: 'var(--c-ink-3)' }} />
            <YAxis {...axisProps} width={38} tick={{ fontSize: 10, fill: 'var(--c-ink-3)' }} tickFormatter={(v: number) => (block.unit === '%' ? `${v}%` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} />
            <Tooltip cursor={{ fill: 'var(--c-hairline)' }} content={<ChartTooltip format={(v) => fmt(v)} />} />
            <Bar dataKey="value" name={block.unit === '%' ? 'Margin' : 'Installed'} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {block.data.map((d, i) => (
                <Cell key={i} fill={d.highlight ? CHART.brand : CHART.brand3} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <LineChart width={W} height={H} data={block.data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" {...axisProps} tick={{ fontSize: 10, fill: 'var(--c-ink-3)' }} />
            <YAxis {...axisProps} width={38} tick={{ fontSize: 10, fill: 'var(--c-ink-3)' }} />
            <Tooltip content={<ChartTooltip format={(v) => fmt(v)} />} />
            <Line dataKey="value" stroke={CHART.brand} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        )}
      </div>
    </div>
  );
}

function EmailCard({ block, words, complete }: { block: Extract<Block, { kind: 'email' }>; words: number; complete: boolean }) {
  const [copied, setCopied] = useState(false);
  const [queued, setQueued] = useState(false);
  const subjWords = countWords(block.subject);
  const subject = complete ? block.subject : takeWords(block.subject, words);
  const body = complete ? block.body : takeWords(block.body, words - subjWords);
  const full = `Subject: ${block.subject}\n\n${block.body}`;

  const copy = () => {
    try {
      const p = navigator.clipboard?.writeText(full);
      if (p && typeof p.catch === 'function') p.catch(() => undefined);
    } catch {
      /* clipboard unavailable: still show feedback */
    }
    setCopied(true);
    useStore.getState().toast({ title: 'Email copied', detail: 'Paste it into Outlook to send.', tone: 'success' });
    window.setTimeout(() => setCopied(false), 1800);
  };
  const queue = () => {
    if (queued) return;
    const s = useStore.getState();
    s.addApproval({
      id: `AP-ASK-${Date.now().toString(36)}`,
      agent: 'inbox',
      kind: 'email',
      title: `Send progress update to ${block.contractor} (${block.jobName})`,
      detail: `${block.subject}. Drafted by Ask Capcon from live progress data; review and send from Outlook.`,
      jobId: block.jobId,
      route: `/projects/${block.jobId}`,
      created: currentIso(s.clockMinutes),
      status: 'Pending',
    });
    s.pushLog({ agent: 'inbox', text: `Queued progress update email to ${block.contractor} for approval`, jobId: block.jobId });
    s.toast({ title: 'Sent to the approval queue', detail: `Update to ${block.contractor} is waiting for your approval.`, tone: 'success' });
    setQueued(true);
  };

  return (
    <div className="overflow-hidden rounded-xl border hairline bg-surface-strong" data-testid="assist-email">
      <div className="border-b hairline px-3.5 py-2.5 text-[12px]">
        <div className="flex gap-2">
          <span className="w-12 shrink-0 text-ink-3">To</span>
          <span className="truncate font-medium text-ink">{block.to}</span>
        </div>
        <div className="mt-1 flex gap-2">
          <span className="w-12 shrink-0 text-ink-3">Subject</span>
          <span className="min-w-0 font-medium text-ink">{subject}</span>
        </div>
      </div>
      <div className="whitespace-pre-wrap px-3.5 py-3 text-[13px] leading-relaxed text-ink-2">{body}</div>
      {complete && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 border-t hairline px-3.5 py-2.5">
          <button onClick={copy} data-testid="assist-copy" className="glass-strong inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-ink transition hover:bg-surface-strong">
            {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={queue}
            disabled={queued}
            data-testid="assist-queue"
            className={clsx(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition',
              queued ? 'bg-ok-soft text-ok' : 'bg-brand text-white shadow-[0_6px_16px_-6px_var(--c-brand)] hover:brightness-110 dark:text-[#06101e]',
            )}
          >
            {queued ? <Check size={14} /> : <Send size={14} />} {queued ? 'In approval queue' : 'Send to approval queue'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
