import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, ChevronDown, Moon, PlayCircle, Search, Sparkles, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';
import { ROLES, roleById } from '../../data/people';
import { agentById } from '../../data/agents';
import { GBP_TO_EUR } from '../../lib/format';
import { Avatar } from '../ui';

export function Topbar() {
  const nav = useNavigate();
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const mode = useStore((s) => s.currencyMode);
  const setMode = useStore((s) => s.setCurrencyMode);
  const setSearchOpen = useStore((s) => s.setSearchOpen);
  const setAssistantOpen = useStore((s) => s.setAssistantOpen);
  const approvals = useStore((s) => s.approvals);
  const setDemo = useStore((s) => s.setDemo);
  const pending = approvals.filter((a) => a.status === 'Pending');
  const [roleOpen, setRoleOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const r = roleById(role);

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-3 px-6">
      <button
        onClick={() => setSearchOpen(true)}
        className="glass flex h-10 w-full min-w-[160px] max-w-[380px] items-center gap-2.5 rounded-full px-4 text-left text-[13.5px] text-ink-3 transition hover:text-ink-2"
      >
        <Search size={16} />
        <span className="flex-1 truncate">Search jobs, tenders, people…</span>
        <kbd className="hidden rounded-md bg-sunk px-1.5 py-0.5 text-[11px] font-medium text-ink-3 lg:inline">⌘/</kbd>
      </button>

      <span className="hidden items-center gap-1.5 rounded-full border border-dashed border-[var(--c-warn)]/50 bg-warn-soft px-2.5 py-1 text-[11.5px] font-medium text-warn shrink-0 whitespace-nowrap md:inline-flex" title="All figures in this demo are illustrative and are not Capcon's real data.">
        <span className="h-1.5 w-1.5 rounded-full bg-current" /> Demo data
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap [&>*]:shrink-0">
        <button
          onClick={() => setAssistantOpen(true)}
          className="glass hidden h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium text-ink-2 transition hover:text-ink xl:flex"
        >
          <Sparkles size={16} className="text-brand" /> Ask Capcon
        </button>

        <div className="glass flex h-10 items-center rounded-full p-1" title={`Group view converts GBP to EUR at a demo rate of ${GBP_TO_EUR}`}>
          {(['local', 'group'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={clsx('h-8 rounded-full px-3 text-[12px] font-medium transition', mode === m ? 'bg-surface-strong text-ink shadow-sm' : 'text-ink-3 hover:text-ink-2')}
            >
              {m === 'local' ? '€ / £' : 'Group €'}
            </button>
          ))}
        </div>

        <button onClick={toggleTheme} className="glass grid h-10 w-10 place-items-center rounded-full text-ink-2 transition hover:text-ink" aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <div className="relative">
          <button onClick={() => setBellOpen((o) => !o)} className="glass relative grid h-10 w-10 place-items-center rounded-full text-ink-2 transition hover:text-ink" aria-label="Approvals">
            <Bell size={17} />
            {pending.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white dark:text-[#06101e]">{pending.length}</span>
            )}
          </button>
          <Popover open={bellOpen} onClose={() => setBellOpen(false)} width={360}>
            <div className="px-4 pb-2 pt-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Waiting for your approval</div>
            {pending.length === 0 && <div className="px-4 pb-4 text-[13px] text-ink-3">All clear. Agents have nothing waiting.</div>}
            {pending.slice(0, 5).map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  setBellOpen(false);
                  nav('/agents#approvals');
                }}
                className="block w-full px-4 py-2.5 text-left hover:bg-sunk"
              >
                <div className="text-[11.5px] font-medium text-brand">{agentById(a.agent).name}</div>
                <div className="truncate text-[13px] text-ink">{a.title}</div>
              </button>
            ))}
            <button
              onClick={() => {
                setBellOpen(false);
                nav('/agents#approvals');
              }}
              className="w-full border-t hairline px-4 py-2.5 text-left text-[12.5px] font-medium text-brand hover:bg-sunk"
            >
              Open approval queue →
            </button>
          </Popover>
        </div>

        <button
          onClick={() => setDemo({ active: true, step: 0 })}
          className="flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-[13px] font-semibold text-white shadow-[0_6px_16px_-6px_var(--c-brand)] transition hover:brightness-110 dark:text-[#06101e]"
        >
          <PlayCircle size={16} /> Demo
        </button>

        <div className="relative">
          <button onClick={() => setRoleOpen((o) => !o)} className="glass flex h-10 items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-surface-strong" data-testid="role-switcher">
            <Avatar name={r.person} size={32} />
            <div className="hidden text-left leading-tight lg:block">
              <div className="text-[12.5px] font-semibold text-ink">{r.person}</div>
              <div className="text-[11px] text-ink-3">{r.short}</div>
            </div>
            <ChevronDown size={15} className="text-ink-3" />
          </button>
          <Popover open={roleOpen} onClose={() => setRoleOpen(false)} width={320}>
            <div className="px-4 pb-1.5 pt-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">View Capcon OS as</div>
            {ROLES.map((x) => (
              <button
                key={x.id}
                onClick={() => {
                  setRole(x.id);
                  setRoleOpen(false);
                  nav(x.home);
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-sunk"
              >
                <Avatar name={x.person} size={30} tone={x.id === role ? 'brand' : 'neutral'} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-ink">{x.person}</div>
                  <div className="truncate text-[11.5px] text-ink-3">{x.title}</div>
                </div>
                {x.id === role && <Check size={16} className="text-brand" />}
              </button>
            ))}
            <div className="h-2" />
          </Popover>
        </div>
      </div>
    </header>
  );
}

function Popover({ open, onClose, children, width }: { open: boolean; onClose: () => void; children: React.ReactNode; width: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose();
    };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('keydown', k);
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          className="glass-strong absolute right-0 top-12 z-50 overflow-hidden rounded-2xl"
          style={{ width }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
