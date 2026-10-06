import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Background } from './Background';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SearchPalette } from './SearchPalette';
import { DemoGuide } from './DemoGuide';
import { AssistantPanel } from '../../assistant/AssistantPanel';
import { useInterval } from '../ui';
import { AGENTS } from '../../data/agents';

export function Shell({ children }: { children: ReactNode }) {
  const theme = useStore((s) => s.theme);
  const loc = useLocation();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  useAgentTicker();
  return (
    <div className="flex h-full w-full">
      <Background />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="scroll-thin relative flex-1 overflow-y-auto overflow-x-hidden" id="main-scroll">
          <AnimatePresence mode="wait">
            <motion.div
              key={loc.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-full max-w-[1680px] px-6 pb-28 pt-2"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <AssistantPanel />
      <SearchPalette />
      <DemoGuide />
      <Toasts />
    </div>
  );
}

/** Keeps the agent activity layer ticking: a new log line every ~9 s. */
function useAgentTicker() {
  const pushLog = useStore((s) => s.pushLog);
  const tick = useStore((s) => s.tickClock);
  const jobs = useStore((s) => s.jobs);
  useInterval(() => {
    tick();
    const n = useStore.getState().clockMinutes;
    const agent = AGENTS[n % AGENTS.length];
    const tpl = agent.logTemplates[Math.floor(n / AGENTS.length) % agent.logTemplates.length];
    const live = jobs.filter((j) => j.stage === 'Install');
    const job = live[(n * 7) % live.length];
    const text = tpl
      .replace('{job}', job.shortName)
      .replace('{mc}', job.mainContractor === 'Undisclosed' ? 'the main contractor' : job.mainContractor)
      .replace('{m}', String(12 + ((n * 5) % 30)))
      .replace('{tender}', 'Hyperscale data centre, Clonee Phase 3')
      .replace('{site}', 'Dublin Airport Logistics Park');
    pushLog({ agent: agent.id, text, jobId: tpl.includes('{job}') ? job.id : undefined });
  }, 9000);
}

function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-[80] flex w-[360px] -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="glass-strong pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3"
          >
            <span className={t.tone === 'warning' ? 'text-warn' : t.tone === 'info' ? 'text-brand' : 'text-ok'}>
              {t.tone === 'warning' ? <TriangleAlert size={18} /> : t.tone === 'info' ? <Info size={18} /> : <CheckCircle2 size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink">{t.title}</div>
              {t.detail && <div className="mt-0.5 text-[12px] text-ink-2">{t.detail}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-ink-3 hover:text-ink" aria-label="Dismiss">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
