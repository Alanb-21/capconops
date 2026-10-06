// Shared building blocks for the Command Centre and role homes.
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bot, CheckCircle2, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { agentById } from '../../data/agents';
import { TODAY_DAY, attentionItems } from '../../data/metrics';
import type { Allocation, AttentionItem, RoleId } from '../../data/types';
import { fmtTime } from '../../lib/dates';
import { useStore } from '../../store/useStore';
import { Card, CardHeader, clsx } from '../ui';

const SEV: Record<AttentionItem['severity'], { color: string; label: string }> = {
  high: { color: 'var(--c-bad)', label: 'High' },
  medium: { color: 'var(--c-warn)', label: 'Medium' },
  low: { color: 'var(--c-brand-2)', label: 'Low' },
};
const SEV_ORDER = { high: 0, medium: 1, low: 2 } as const;

export function useAttention(role: RoleId) {
  const jobs = useStore((s) => s.jobs);
  const allocation = useStore((s) => s.allocation);
  return attentionItems(jobs, allocation)
    .filter((i) => i.roles.includes(role))
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}

export function AgentChip({ agent, className }: { agent: AttentionItem['agent']; className?: string }) {
  return (
    <span className={clsx('inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand', className)}>
      <Bot size={11} className="shrink-0" />
      <span className="truncate">{agentById(agent).name}</span>
    </span>
  );
}

export function AttentionFeed({
  role,
  className,
  height,
  maxHeight,
  delay = 0,
  subtitle,
}: {
  role: RoleId;
  className?: string;
  height?: number;
  maxHeight?: number;
  delay?: number;
  subtitle?: string;
}) {
  const items = useAttention(role);
  const nav = useNavigate();
  const high = items.filter((i) => i.severity === 'high').length;
  return (
    <Card className={clsx('flex flex-col', className)} delay={delay}>
      <div style={{ height, maxHeight }} className="flex min-h-0 flex-col">
        <CardHeader
          title="Needs your attention"
          subtitle={subtitle ?? (items.length ? `${items.length} items · ${high} high priority · raised by agents overnight` : 'Nothing waiting on you')}
          icon={<Sparkles size={15} />}
          className="!mb-3"
        />
        <div className="scroll-thin -mx-2 min-h-0 flex-1 overflow-y-auto px-2">
          <ul className="space-y-1.5">
            <AnimatePresence initial={true} mode="popLayout">
              {items.map((it, i) => (
                <motion.li
                  key={it.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: delay + 0.08 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
                  exit={{ opacity: 0, x: 24, transition: { duration: 0.25 } }}
                >
                  <button
                    onClick={() => nav(it.route)}
                    className="group flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-sunk"
                  >
                    <span className="relative mt-1.5 grid h-2.5 w-2.5 shrink-0 place-items-center" title={`${SEV[it.severity].label} priority`}>
                      {it.severity === 'high' && <span className="absolute inset-0 rounded-full opacity-40 pulse-ring" style={{ background: SEV[it.severity].color }} />}
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEV[it.severity].color }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium leading-snug text-ink">{it.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-ink-3">{it.detail}</span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <AgentChip agent={it.agent} />
                        {it.jobId && <span className="text-[11px] text-ink-3 tnum">{it.jobId}</span>}
                      </span>
                    </span>
                    <ArrowRight size={15} className="mt-1 shrink-0 text-ink-3 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {items.length === 0 && (
            <div className="grid place-items-center gap-2 py-10 text-center text-[13px] text-ink-3">
              <CheckCircle2 size={22} className="text-ok" />
              All clear. Agents will flag anything new here.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Last few agent log entries, ticking in. */
export function AgentsNow({ count = 4, delay = 0, className }: { count?: number; delay?: number; className?: string }) {
  const log = useStore((s) => s.agentLog).slice(0, count);
  const nav = useNavigate();
  return (
    <Card className={clsx('!py-4', className)} delay={delay}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center gap-2.5 lg:w-[180px]">
          <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand">
            <Bot size={15} />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ok">
              <span className="absolute inset-0 rounded-full bg-ok pulse-ring" />
            </span>
          </span>
          <div className="min-w-0">
            <div className="whitespace-nowrap text-[14px] font-semibold text-ink">Agents working now</div>
            <Link to="/agents" className="text-[12px] text-brand hover:underline">
              Open agent log
            </Link>
          </div>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <AnimatePresence initial={false} mode="popLayout">
            {log.map((e) => (
              <motion.button
                key={e.id}
                layout
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => nav(e.jobId ? `/projects/${e.jobId}` : '/agents')}
                className="min-w-0 rounded-2xl bg-sunk px-3 py-2.5 text-left transition hover:bg-brand-soft"
              >
                <div className="flex items-center justify-between gap-2">
                  <AgentChip agent={e.agent} />
                  <span className="shrink-0 text-[11px] text-ink-3 tnum">{fmtTime(e.at)}</span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-ink-2">{e.text}</p>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}

export function QuickLinks({ links, delay = 0 }: { links: { to: string; label: string; icon: ReactNode; hint?: string }[]; delay?: number }) {
  return (
    <Card delay={delay}>
      <CardHeader title="Quick links" subtitle="Jump straight to your work" />
      <div className="grid grid-cols-1 gap-1.5">
        {links.map((l) => (
          <Link key={l.to + l.label} to={l.to} className="group flex items-center gap-3 rounded-2xl px-2.5 py-2 transition hover:bg-sunk">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{l.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium text-ink">{l.label}</span>
              {l.hint && <span className="block truncate text-[12px] text-ink-3">{l.hint}</span>}
            </span>
            <ArrowRight size={15} className="shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-brand" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

/** Small chart card with an explicit-height plot area. */
export function ChartCard({
  title,
  subtitle,
  icon,
  action,
  height = 240,
  children,
  delay = 0,
  className,
  footer,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  height?: number;
  children: ReactNode;
  delay?: number;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <Card delay={delay} className={className}>
      <CardHeader title={title} subtitle={subtitle} icon={icon} action={action} />
      <div style={{ height }} className="w-full min-w-0">
        {children}
      </div>
      {footer}
    </Card>
  );
}

export function LegendDot({ color, label }: { color: string; label: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export const GREETING_DATE = 'Tuesday 6 October';

/** Field crews (excluding the maintenance crew) booked out today. */
export function crewsOut(allocation: Allocation) {
  const crews = Object.keys(allocation).filter((c) => c !== 'MT-01');
  return { out: crews.filter((c) => !!allocation[c][TODAY_DAY]).length, total: crews.length };
}
