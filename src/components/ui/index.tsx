// Capcon OS UI kit. Glass cards, KPIs, pills, buttons, tables, drawers.
// Every page should build from these so the look stays consistent.
import { animate, AnimatePresence, motion, useInView } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { Currency, Health } from '../../data/types';
import { money } from '../../lib/format';
import { useStore } from '../../store/useStore';

export { clsx };

// ---------------------------------------------------------------- Card
export function Card({
  children,
  className,
  strong,
  padded = true,
  onClick,
  as = 'div',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  padded?: boolean;
  onClick?: () => void;
  as?: 'div' | 'section';
  delay?: number;
}) {
  const Comp = as === 'section' ? motion.section : motion.div;
  return (
    <Comp
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={clsx(
        strong ? 'glass-strong' : 'glass',
        'rounded-[22px] min-w-0',
        padded && 'p-5',
        onClick && 'cursor-pointer transition-transform hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </Comp>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">{icon}</div>}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Page header
export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-brand">{eyebrow}</div>}
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-[14px] text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- CountUp
export function CountUp({
  value,
  format = (v) => Math.round(v).toLocaleString('en-IE'),
  duration = 1.1,
  className,
}: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const prev = useRef(0);
  const [display, setDisplay] = useState(format(0));
  useEffect(() => {
    if (!inView) return;
    const safe = Number.isFinite(value) ? value : 0;
    const controls = animate(prev.current, safe, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(format(v)),
    });
    prev.current = safe;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView]);
  return (
    <span ref={ref} className={clsx('tnum', className)}>
      {display}
    </span>
  );
}

// ---------------------------------------------------------------- KPI
export function Kpi({
  label,
  value,
  format,
  sub,
  delta,
  deltaTone,
  to,
  icon,
  className,
  delay = 0,
  children,
}: {
  label: string;
  value: number;
  format?: (v: number) => string;
  sub?: ReactNode;
  delta?: string;
  deltaTone?: 'ok' | 'warn' | 'bad' | 'neutral';
  to?: string;
  icon?: ReactNode;
  className?: string;
  delay?: number;
  children?: ReactNode;
}) {
  const inner = (
    <Card className={clsx('h-full !p-4', to && 'transition hover:-translate-y-0.5 hover:shadow-lg', className)} delay={delay}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium text-ink-3">{label}</span>
        {icon && <span className="text-ink-3">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <CountUp value={value} format={format} className="text-[26px] font-semibold leading-none text-ink" />
        {delta && (
          <span
            className={clsx(
              'text-[12px] font-medium',
              deltaTone === 'ok' && 'text-ok',
              deltaTone === 'warn' && 'text-warn',
              deltaTone === 'bad' && 'text-bad',
              (!deltaTone || deltaTone === 'neutral') && 'text-ink-3',
            )}
          >
            {delta}
          </span>
        )}
      </div>
      {sub && <div className="mt-1.5 truncate text-[12px] text-ink-3">{sub}</div>}
      {children}
    </Card>
  );
  return to ? (
    <Link to={to} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// ---------------------------------------------------------------- Pills
export type Tone = 'brand' | 'ok' | 'warn' | 'bad' | 'neutral' | 'accent';
export function Pill({ children, tone = 'neutral', className, dot }: { children: ReactNode; tone?: Tone; className?: string; dot?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-medium',
        tone === 'brand' && 'bg-brand-soft text-brand',
        tone === 'accent' && 'bg-brand-soft text-brand-2',
        tone === 'ok' && 'bg-ok-soft text-ok',
        tone === 'warn' && 'bg-warn-soft text-warn',
        tone === 'bad' && 'bg-bad-soft text-bad',
        tone === 'neutral' && 'bg-sunk text-ink-2',
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const healthTone = (h: Health): Tone => (h === 'on-track' ? 'ok' : h === 'at-risk' ? 'warn' : 'bad');
export const healthLabel = (h: Health) => (h === 'on-track' ? 'On track' : h === 'at-risk' ? 'At risk' : 'Blocked');
export const healthColor = (h: Health) => (h === 'on-track' ? 'var(--c-ok)' : h === 'at-risk' ? 'var(--c-warn)' : 'var(--c-bad)');

export function HealthPill({ health }: { health: Health }) {
  return (
    <Pill tone={healthTone(health)} dot>
      {healthLabel(health)}
    </Pill>
  );
}

export function HealthDot({ health, className }: { health: Health; className?: string }) {
  return <span className={clsx('inline-block h-2 w-2 shrink-0 rounded-full', className)} style={{ background: healthColor(health) }} />;
}

// ---------------------------------------------------------------- Progress
export function Progress({ value, tone = 'brand', className, height = 6 }: { value: number; tone?: Tone; className?: string; height?: number }) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const color = tone === 'ok' ? 'var(--c-ok)' : tone === 'warn' ? 'var(--c-warn)' : tone === 'bad' ? 'var(--c-bad)' : tone === 'accent' ? 'var(--c-brand-2)' : 'var(--c-brand)';
  return (
    <div className={clsx('w-full overflow-hidden rounded-full bg-sunk', className)} style={{ height }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${v * 100}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- Buttons
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  onClick,
  className,
  icon,
  disabled,
  type = 'button',
  title,
}: {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ok';
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
  icon?: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-[12.5px]' : 'h-9 px-4 text-[13.5px]',
        variant === 'primary' && 'bg-brand text-white shadow-[0_6px_16px_-6px_var(--c-brand)] hover:brightness-110 dark:text-[#06101e]',
        variant === 'secondary' && 'glass-strong text-ink hover:bg-surface-strong',
        variant === 'ghost' && 'text-ink-2 hover:bg-sunk hover:text-ink',
        variant === 'danger' && 'bg-bad-soft text-bad hover:brightness-95',
        variant === 'ok' && 'bg-ok text-white hover:brightness-110 dark:text-[#06101e]',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function LinkButton({ to, children, variant = 'secondary', size = 'md', icon, className }: { to: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md'; icon?: ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition active:scale-[0.97]',
        size === 'sm' ? 'h-8 px-3 text-[12.5px]' : 'h-9 px-4 text-[13.5px]',
        variant === 'primary' && 'bg-brand text-white hover:brightness-110 dark:text-[#06101e]',
        variant === 'secondary' && 'glass-strong text-ink',
        variant === 'ghost' && 'text-ink-2 hover:bg-sunk hover:text-ink',
        className,
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------- Segmented control
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div className={clsx('relative inline-flex rounded-full bg-sunk p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'relative z-10 whitespace-nowrap rounded-full font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-[12px]' : 'px-3.5 py-1.5 text-[13px]',
            value === o.value ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={undefined}
              className="absolute inset-0 -z-10 rounded-full bg-surface-strong shadow-sm"
              initial={false}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Money
export function Money({ amount, currency = 'EUR', compact, className }: { amount: number; currency?: Currency; compact?: boolean; className?: string }) {
  const mode = useStore((s) => s.currencyMode);
  return <span className={clsx('tnum', className)}>{money(amount, currency, { mode, compact })}</span>;
}

/** Hook version for strings (charts, labels). */
export function useMoney() {
  const mode = useStore((s) => s.currencyMode);
  return (amount: number, currency: Currency = 'EUR', compact = false) => money(amount, currency, { mode, compact });
}

// ---------------------------------------------------------------- Table
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('scroll-thin -mx-1 overflow-x-auto px-1', className)}>
      <table className="w-full border-separate border-spacing-0 text-left text-[13px]">{children}</table>
    </div>
  );
}
export function Th({ children, className, align = 'left' }: { children?: ReactNode; className?: string; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={clsx(
        'sticky top-0 z-[1] whitespace-nowrap border-b hairline bg-transparent px-3 py-2.5 text-[11.5px] font-medium uppercase tracking-[0.04em] text-ink-3',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  );
}
export function Td({ children, className, align = 'left', colSpan }: { children?: ReactNode; className?: string; align?: 'left' | 'right' | 'center'; colSpan?: number }) {
  return (
    <td
      colSpan={colSpan}
      className={clsx('border-b hairline px-3 py-2.5 align-middle text-ink-2', align === 'right' && 'text-right tnum', align === 'center' && 'text-center', className)}
    >
      {children}
    </td>
  );
}
export function Tr({ children, onClick, className, highlight }: { children: ReactNode; onClick?: () => void; className?: string; highlight?: boolean }) {
  return (
    <tr
      onClick={onClick}
      className={clsx(onClick && 'cursor-pointer', 'transition-colors hover:bg-sunk', highlight && 'bg-brand-soft', className)}
    >
      {children}
    </tr>
  );
}

// ---------------------------------------------------------------- Drawer / Modal
function useEscape(open: boolean, onClose: () => void) {
  const cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        cb.current();
      }
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [open]);
}

export function Drawer({ open, onClose, title, subtitle, children, width = 520 }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; width?: number }) {
  useEscape(open, onClose);
  // Portal to <body>: backdrop-filter on glass ancestors would otherwise trap position:fixed.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[72] bg-black/20 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            className="glass-strong fixed right-3 top-3 bottom-3 z-[73] flex flex-col overflow-hidden rounded-[24px]"
            style={{ width: `min(${width}px, calc(100vw - 24px))` }}
            initial={{ x: width + 40, opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: width + 40, opacity: 0.6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <div className="flex items-start justify-between gap-3 border-b hairline px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
                {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 text-ink-3 hover:bg-sunk hover:text-ink" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  , document.body);
}

export function Modal({ open, onClose, title, subtitle, children, width = 640 }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; width?: number }) {
  useEscape(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[73] grid place-items-center bg-black/25 p-4 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="glass-strong flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[24px]"
            style={{ maxWidth: width }}
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="flex items-start justify-between gap-3 border-b hairline px-6 py-4">
              <div>
                <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
                {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 text-ink-3 hover:bg-sunk hover:text-ink" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  , document.body);
}

// ---------------------------------------------------------------- misc
export function Avatar({ name, size = 28, tone = 'brand' }: { name: string; size?: number; tone?: 'brand' | 'neutral' }) {
  const initials = name
    .replace(/[^A-Za-zÀ-ÿ' ]/g, '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={clsx('inline-grid shrink-0 place-items-center rounded-full font-semibold', tone === 'brand' ? 'bg-brand text-white dark:text-[#06101e]' : 'bg-sunk text-ink-2')}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

export function Stat({ label, value, sub, className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={clsx('min-w-0', className)}>
      <div className="truncate text-[11.5px] font-medium text-ink-3">{label}</div>
      <div className="mt-0.5 truncate text-[17px] font-semibold tracking-[-0.02em] text-ink tnum">{value}</div>
      {sub && <div className="truncate text-[11.5px] text-ink-3">{sub}</div>}
    </div>
  );
}

export function Sparkline({ data, width = 100, height = 28, color = 'var(--c-brand)', fill = true }: { data: number[]; width?: number; height?: number; color?: string; fill?: boolean }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data.map((v, i) => [i * step, height - ((v - min) / (max - min || 1)) * (height - 4) - 2]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const id = `sg-${Math.round(max)}-${data.length}-${Math.round(data[0])}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
        </>
      )}
      <motion.path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
    </svg>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={clsx('mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3', className)}>{children}</h2>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed hairline px-4 py-8 text-center text-[13px] text-ink-3">{children}</div>;
}

/** Small "Demo data" or "Example connection" style note. */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx('text-[11.5px] text-ink-3', className)}>{children}</p>;
}

/** Placeholder site photo: tasteful gradient + roofline drawing, no stock imagery. */
export function PhotoPlaceholder({ seed = 'p1', className, label }: { seed?: string; className?: string; label?: string }) {
  const n = parseInt(seed.replace(/\D/g, '') || '1', 10);
  const hues = [205, 195, 215, 190, 200, 210];
  const h = hues[n % hues.length];
  return (
    <div
      className={clsx('relative overflow-hidden rounded-xl', className)}
      style={{ background: `linear-gradient(160deg, hsl(${h} 35% 78%), hsl(${h + 10} 30% 52%))` }}
    >
      <svg viewBox="0 0 120 80" className="absolute inset-0 h-full w-full opacity-70" preserveAspectRatio="none">
        <path d={`M0 ${48 - (n % 3) * 4} L40 ${30 + (n % 2) * 6} L80 ${34 - (n % 3) * 3} L120 ${26 + (n % 4) * 3} L120 80 L0 80 Z`} fill="rgba(255,255,255,0.18)" />
        <path d={`M${12 + n * 7} 80 L${12 + n * 7} ${40 - (n % 3) * 3}`} stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" />
        <path d={`M${12 + n * 7} ${40 - (n % 3) * 3} L${70 + n * 3} ${40 - (n % 3) * 3}`} stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" />
        <path d={`M${70 + n * 3} ${40 - (n % 3) * 3} L${70 + n * 3} 80`} stroke="rgba(255,255,255,0.4)" strokeWidth="2.2" />
      </svg>
      {label && <span className="absolute bottom-1.5 left-2 rounded-md bg-black/35 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">{label}</span>}
    </div>
  );
}

export function useInterval(cb: () => void, ms: number | null) {
  const saved = useRef(cb);
  useEffect(() => {
    saved.current = cb;
  }, [cb]);
  useEffect(() => {
    if (ms === null) return;
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}
