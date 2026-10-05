import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Building2, Calculator, Search, Sparkles, User, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';
import { ALL_NAV } from './nav';
import { MAINT_CONTRACTS, TECHNICIANS } from '../../data/seed';
import { PEOPLE, roleById } from '../../data/people';

interface Result {
  key: string;
  group: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function SearchPalette() {
  const open = useStore((s) => s.searchOpen);
  const setOpen = useStore((s) => s.setSearchOpen);
  const setAssistantOpen = useStore((s) => s.setAssistantOpen);
  const jobs = useStore((s) => s.jobs);
  const tenders = useStore((s) => s.tenders);
  const role = useStore((s) => s.role);
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // ⌘K opens the assistant (per spec); ⌘/ or the search bar opens search
        setAssistantOpen(true);
        setOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [setOpen, setAssistantOpen]);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const s = q.trim().toLowerCase();
    const go = (to: string) => () => {
      setOpen(false);
      nav(to);
    };
    const out: Result[] = [];
    const pages = ALL_NAV.filter((n) => !s || n.label.toLowerCase().includes(s) || n.keywords?.includes(s));
    pages.slice(0, s ? 4 : 6).forEach((n) => {
      const Icon = n.icon;
      out.push({ key: 'p' + n.to, group: 'Pages', label: n.label, icon: <Icon size={16} />, run: go(n.to === '/home' ? roleById(role).home : n.to) });
    });
    if (s) {
      jobs
        .filter((j) => (j.name + ' ' + j.id + ' ' + j.mainContractor + ' ' + j.location + ' ' + j.shortName).toLowerCase().includes(s))
        .slice(0, 6)
        .forEach((j) => out.push({ key: j.id, group: 'Jobs', label: j.name, sub: `${j.id} · ${j.mainContractor} · ${j.stage}`, icon: <Building2 size={16} />, run: go(`/projects/${j.id}`) }));
      tenders
        .filter((t) => (t.name + ' ' + t.id + ' ' + t.mainContractor).toLowerCase().includes(s))
        .slice(0, 4)
        .forEach((t) => out.push({ key: t.id, group: 'Tenders', label: t.name, sub: `${t.id} · ${t.stage}`, icon: <Calculator size={16} />, run: go('/tenders') }));
      [...Object.values(PEOPLE).map((p) => ({ n: p.name, r: p.role, to: '/command' })), ...TECHNICIANS.map((t) => ({ n: t.name, r: `${t.role} · ${t.crewId}`, to: '/crews' }))]
        .filter((p) => p.n.toLowerCase().includes(s))
        .slice(0, 4)
        .forEach((p) => out.push({ key: 'u' + p.n, group: 'People', label: p.n, sub: p.r, icon: <User size={16} />, run: go(p.to) }));
      MAINT_CONTRACTS.filter((c) => (c.site + c.client).toLowerCase().includes(s))
        .slice(0, 3)
        .forEach((c) => out.push({ key: c.id, group: 'Maintenance', label: c.site, sub: c.id, icon: <Wrench size={16} />, run: go('/maintenance') }));
      out.push({
        key: 'ask',
        group: 'Assistant',
        label: `Ask Capcon: “${q}”`,
        icon: <Sparkles size={16} />,
        run: () => {
          setOpen(false);
          setAssistantOpen(true);
          window.dispatchEvent(new CustomEvent('capcon:ask', { detail: q }));
        },
      });
    }
    return out;
  }, [q, jobs, tenders, nav, setOpen, setAssistantOpen, role]);

  useEffect(() => setSel(0), [q]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/20 px-4 pt-[12vh] backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: -10, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -10, scale: 0.98, opacity: 0 }}
            className="glass-strong w-full max-w-[620px] overflow-hidden rounded-[22px]"
          >
            <div className="flex items-center gap-3 border-b hairline px-5 py-3.5">
              <Search size={18} className="text-ink-3" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setOpen(false);
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSel((x) => Math.min(results.length - 1, x + 1));
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSel((x) => Math.max(0, x - 1));
                  }
                  if (e.key === 'Enter') results[sel]?.run();
                }}
                placeholder="Search jobs, tenders, people, pages…"
                className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
              />
              <kbd className="rounded-md bg-sunk px-1.5 py-0.5 text-[11px] text-ink-3">esc</kbd>
            </div>
            <div className="scroll-thin max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-ink-3">No matches</div>}
              {results.map((r, i) => (
                <div key={r.key}>
                  {(i === 0 || results[i - 1].group !== r.group) && <div className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{r.group}</div>}
                  <button
                    onMouseEnter={() => setSel(i)}
                    onClick={r.run}
                    className={clsx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left', sel === i ? 'bg-brand-soft text-brand' : 'text-ink-2')}
                  >
                    <span className={sel === i ? 'text-brand' : 'text-ink-3'}>{r.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{r.label}</span>
                      {r.sub && <span className="block truncate text-[11.5px] text-ink-3">{r.sub}</span>}
                    </span>
                    {sel === i && <ArrowRight size={15} />}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
