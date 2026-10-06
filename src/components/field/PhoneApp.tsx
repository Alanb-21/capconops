// Barry's technician app, rendered inside a phone frame on /field.
// iOS look: large titles, grouped inset lists, glass tab bar.
import { AnimatePresence, motion } from 'framer-motion';
import {
  BatteryFull,
  Camera,
  Check,
  ChevronRight,
  CircleCheck,
  CloudSun,
  Delete,
  ExternalLink,
  House,
  IdCard,
  MapPin,
  Minus,
  PenLine,
  Plus,
  Ruler,
  ShieldCheck,
  Signal,
  TriangleAlert,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TECHNICIANS } from '../../data/seed';
import { designed, installed, jobPct } from '../../data/metrics';
import { daysUntil, fmtDate, fmtTime } from '../../lib/dates';
import { num, pct } from '../../lib/format';
import { currentIso, useStore } from '../../store/useStore';
import { clsx, PhotoPlaceholder } from '../ui';

const JOB_ID = 'CE-2291';
const AUTHOR = 'Barry McEvoy';
type TabKey = 'today' | 'log' | 'tickets' | 'issues';

/** iOS-ish palette tied to the app theme so the phone matches light/dark. */
function usePalette() {
  const dark = useStore((s) => s.theme) === 'dark';
  return dark
    ? { dark, bg: '#000000', card: '#1c1c1e', card2: '#2c2c2e', text: '#f5f5f7', text2: '#98989f', sep: 'rgba(84,84,88,0.55)', tint: '#4ea8f0', ok: '#30d158', warn: '#ffd60a', bad: '#ff453a', bar: 'rgba(28,28,30,0.72)', onTint: '#06101e' }
    : { dark, bg: '#f2f2f7', card: '#ffffff', card2: '#f2f2f7', text: '#0b1b2e', text2: '#6b7280', sep: 'rgba(60,60,67,0.18)', tint: '#0d4f8b', ok: '#34c759', warn: '#ff9500', bad: '#ff3b30', bar: 'rgba(249,249,251,0.78)', onTint: '#ffffff' };
}
type Pal = ReturnType<typeof usePalette>;

const SF: CSSProperties = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter Variable', system-ui, sans-serif" };

export function PhoneApp() {
  const p = usePalette();
  const [tab, setTab] = useState<TabKey>('today');
  const [sheet, setSheet] = useState(false);
  const [flash, setFlash] = useState(0);
  const issueCount = useStore((s) => s.diary.filter((d) => d.jobId === JOB_ID && d.id.startsWith('D-issue')).length);

  return (
    <div className="relative h-[844px] w-[390px] shrink-0 rounded-[48px] p-[11px] shadow-[0_40px_80px_-30px_rgba(10,37,64,0.55),0_0_0_1.5px_rgba(120,130,145,0.55)]" style={{ background: '#0b0d10', ...SF }}>
      {/* side buttons */}
      <span className="absolute -left-[3px] top-[150px] h-[34px] w-[3px] rounded-l bg-[#2a2d33]" />
      <span className="absolute -left-[3px] top-[205px] h-[62px] w-[3px] rounded-l bg-[#2a2d33]" />
      <span className="absolute -left-[3px] top-[280px] h-[62px] w-[3px] rounded-l bg-[#2a2d33]" />
      <span className="absolute -right-[3px] top-[230px] h-[96px] w-[3px] rounded-r bg-[#2a2d33]" />
      <div className="relative h-full w-full overflow-hidden rounded-[38px]" style={{ background: p.bg, color: p.text }}>
        <StatusBar p={p} />
        {/* dynamic island */}
        <div className="absolute left-1/2 top-[11px] z-30 h-[33px] w-[118px] -translate-x-1/2 rounded-full bg-black" />

        <div className="absolute inset-0 overflow-y-auto pb-[96px] pt-[50px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
              {tab === 'today' && <TodayScreen p={p} go={setTab} openSheet={() => setSheet(true)} />}
              {tab === 'log' && <LogScreen p={p} onFlash={() => setFlash((f) => f + 1)} />}
              {tab === 'tickets' && <TicketsScreen p={p} />}
              {tab === 'issues' && <IssuesScreen p={p} openSheet={() => setSheet(true)} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <TabBar p={p} tab={tab} setTab={setTab} issues={issueCount} />
        <IssueSheet p={p} open={sheet} onClose={() => setSheet(false)} onSent={() => setTab('issues')} />
        {/* camera flash */}
        <AnimatePresence>
          {flash > 0 && (
            <motion.div
              key={flash}
              className="pointer-events-none absolute inset-0 z-[60] bg-white"
              initial={{ opacity: 0.95 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
        {/* home indicator */}
        <div className="absolute bottom-[7px] left-1/2 z-40 h-[5px] w-[134px] -translate-x-1/2 rounded-full" style={{ background: p.text, opacity: 0.85 }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- chrome
function StatusBar({ p }: { p: Pal }) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex h-[50px] items-center justify-between px-[30px] pt-[4px] text-[15px] font-semibold" style={{ background: `linear-gradient(${p.bg}, ${p.bg}ee 70%, transparent)` }}>
      <span className="tnum">08:30</span>
      <span className="flex items-center gap-1.5">
        <Signal size={16} strokeWidth={2.5} />
        <Wifi size={16} strokeWidth={2.5} />
        <BatteryFull size={22} strokeWidth={1.8} />
      </span>
    </div>
  );
}

function TabBar({ p, tab, setTab, issues }: { p: Pal; tab: TabKey; setTab: (t: TabKey) => void; issues: number }) {
  const items: { key: TabKey; label: string; icon: ReactNode }[] = [
    { key: 'today', label: 'Today', icon: <House size={23} /> },
    { key: 'log', label: 'Log', icon: <Ruler size={23} /> },
    { key: 'tickets', label: 'Tickets', icon: <IdCard size={23} /> },
    { key: 'issues', label: 'Issues', icon: <TriangleAlert size={23} /> },
  ];
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex h-[84px] items-start justify-around border-t px-2 pt-[7px] backdrop-blur-xl" style={{ background: p.bar, borderColor: p.sep }}>
      {items.map((it) => (
        <button key={it.key} data-testid={`tab-${it.key}`} onClick={() => setTab(it.key)} className="relative flex w-[72px] flex-col items-center gap-[3px]" style={{ color: tab === it.key ? p.tint : p.text2 }}>
          {it.icon}
          <span className="text-[10.5px] font-medium">{it.label}</span>
          {it.key === 'issues' && issues > 0 && (
            <span className="absolute -top-1 right-3 grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[11px] font-semibold text-white" style={{ background: p.bad }}>
              {issues}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function LargeTitle({ p, eyebrow, title, right }: { p: Pal; eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between px-5 pb-3 pt-2">
      <div>
        {eyebrow && <div className="text-[13px] font-semibold uppercase tracking-[0.02em]" style={{ color: p.text2 }}>{eyebrow}</div>}
        <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">{title}</h1>
      </div>
      {right}
    </div>
  );
}

function Group({ p, header, footer, children, className }: { p: Pal; header?: string; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('mx-4 mb-6', className)}>
      {header && <div className="mb-1.5 px-4 text-[13px] uppercase" style={{ color: p.text2 }}>{header}</div>}
      <div className="overflow-hidden rounded-[12px]" style={{ background: p.card }}>
        {children}
      </div>
      {footer && <div className="mt-1.5 px-4 text-[12.5px] leading-snug" style={{ color: p.text2 }}>{footer}</div>}
    </div>
  );
}

function Row({ p, children, last, onClick, className }: { p: Pal; children: ReactNode; last?: boolean; onClick?: () => void; className?: string }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className={clsx('relative flex w-full items-center gap-3 px-4 py-[11px] text-left', onClick && 'active:opacity-60', className)}>
      {children}
      {!last && <span className="absolute bottom-0 left-4 right-0 h-px" style={{ background: p.sep }} />}
    </Comp>
  );
}

function IconTile({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <span className="grid h-[29px] w-[29px] shrink-0 place-items-center rounded-[7px] text-white" style={{ background: bg }}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------- Today
const TASKS = [
  'Toolbox talk: MEWP rescue plan',
  'Building 2 collector D10–D14 install and support',
  'Electrofusion weld log for D10–D14',
  'Stage spools B2-059 to B2-066 at laydown 4',
  'Photo record of high-level runs before ceiling close-up',
];

function TodayScreen({ p, go, openSheet }: { p: Pal; go: (t: TabKey) => void; openSheet: () => void }) {
  const ramsSigned = useStore((s) => s.ramsSigned);
  const setRamsSigned = useStore((s) => s.setRamsSigned);
  const toast = useStore((s) => s.toast);
  const pushLog = useStore((s) => s.pushLog);
  const job = useStore((s) => s.jobs.find((j) => j.id === JOB_ID));
  const [done, setDone] = useState<boolean[]>([true, false, false, false, false]);
  const [signing, setSigning] = useState(false);

  const sign = () => {
    if (ramsSigned) return;
    setSigning(true);
    setTimeout(() => {
      setSigning(false);
      setRamsSigned(true);
      pushLog({ agent: 'compliance', text: 'Barry McEvoy signed on to RAMS R4 (Building 2 high-level works) on Dexcom via technician app', jobId: JOB_ID });
      toast({ title: 'Signed on to RAMS', detail: 'Barry McEvoy · Dexcom RAMS R4 · 08:30', tone: 'success' });
    }, 650);
  };

  return (
    <div>
      <LargeTitle
        p={p}
        eyebrow="Tuesday 6 October"
        title="Today"
        right={
          <span className="mb-1 grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold" style={{ background: p.tint, color: p.onTint }}>
            BM
          </span>
        }
      />

      {/* site card */}
      <div className="mx-4 mb-6 overflow-hidden rounded-[14px]" style={{ background: p.card }}>
        <PhotoPlaceholder seed="p2" className="h-[92px] rounded-none" />
        <div className="px-4 pb-3.5 pt-3">
          <div className="text-[12px] font-semibold uppercase tracking-[0.03em]" style={{ color: p.tint }}>
            Your site today
          </div>
          <div className="mt-0.5 text-[20px] font-semibold tracking-[-0.01em]">Dexcom campus, Athenry</div>
          <div className="text-[14px]" style={{ color: p.text2 }}>
            John Paul Construction · CE-2291
          </div>
          <div className="mt-2.5 flex items-start gap-2 rounded-[10px] px-3 py-2 text-[13px] leading-snug" style={{ background: p.card2 }}>
            <MapPin size={15} className="mt-[1px] shrink-0" style={{ color: p.warn }} />
            <span>
              <b>Gate 3 only</b> for access and deliveries. 1,000+ operatives on campus: sign in at the JPC cabin.
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[13px]" style={{ color: p.text2 }}>
            <span className="flex items-center gap-1.5">
              <Users size={14} /> IE Crew 2 · 4 on site
            </span>
            <span className="flex items-center gap-1.5">
              <CloudSun size={14} /> Overcast, 11°C
            </span>
          </div>
        </div>
      </div>

      <Group p={p} header="Safety" footer={ramsSigned ? 'Signed on today. The office and Compliance Agent have your sign-on.' : 'You must sign on before starting work at height.'}>
        <Row p={p} last onClick={sign}>
          <IconTile bg={ramsSigned ? p.ok : p.warn}>{ramsSigned ? <ShieldCheck size={17} /> : <PenLine size={16} />}</IconTile>
          <div className="min-w-0 flex-1">
            <div className="text-[16px]">Sign on to RAMS R4</div>
            <div className="text-[13px]" style={{ color: p.text2 }}>
              {ramsSigned ? 'Signed 08:30 · MEWP permit live' : 'Building 2 · work at height'}
            </div>
          </div>
          {ramsSigned ? (
            <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="grid h-7 w-7 place-items-center rounded-full text-white" style={{ background: p.ok }}>
              <Check size={16} strokeWidth={3} />
            </motion.span>
          ) : (
            <span className="rounded-full px-3 py-1.5 text-[14px] font-semibold" style={{ background: p.tint, color: p.onTint }}>
              {signing ? 'Signing…' : 'Tap to sign'}
            </span>
          )}
        </Row>
      </Group>

      <Group p={p} header={`Today’s tasks · ${done.filter(Boolean).length} of ${TASKS.length}`}>
        {TASKS.map((t, i) => (
          <Row key={t} p={p} last={i === TASKS.length - 1} onClick={() => setDone((d) => d.map((x, k) => (k === i ? !x : x)))}>
            <span
              className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors"
              style={{ borderColor: done[i] ? p.ok : p.text2, background: done[i] ? p.ok : 'transparent', color: '#fff' }}
            >
              {done[i] && <Check size={13} strokeWidth={3.5} />}
            </span>
            <span className={clsx('min-w-0 flex-1 text-[15px] leading-snug', done[i] && 'line-through')} style={{ color: done[i] ? p.text2 : p.text }}>
              {t}
            </span>
          </Row>
        ))}
      </Group>

      <Group p={p} header="Quick actions">
        <Row p={p} onClick={() => go('log')}>
          <IconTile bg={p.tint}>
            <Ruler size={16} />
          </IconTile>
          <span className="flex-1 text-[16px]">Log metres installed</span>
          <ChevronRight size={18} style={{ color: p.text2 }} />
        </Row>
        <Row p={p} last onClick={openSheet}>
          <IconTile bg={p.bad}>
            <TriangleAlert size={16} />
          </IconTile>
          <span className="flex-1 text-[16px]">Flag an issue to the office</span>
          <ChevronRight size={18} style={{ color: p.text2 }} />
        </Row>
      </Group>

      {job && (
        <div className="mx-4 mb-4 px-4 text-[12.5px]" style={{ color: p.text2 }}>
          Job progress {pct(jobPct(job))} · {num(installed(job))} of {num(designed(job))} m installed
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Log
const DEFAULT_NOTE = 'Building 2 collector D10–D14 installed and supported';

function LogScreen({ p, onFlash }: { p: Pal; onFlash: () => void }) {
  const logInstall = useStore((s) => s.logInstall);
  const toast = useStore((s) => s.toast);
  const job = useStore((s) => s.jobs.find((j) => j.id === JOB_ID));
  const [metres, setMetres] = useState('48');
  const [fresh, setFresh] = useState(true);
  const [system, setSystem] = useState<'siphonic' | 'gravity'>('siphonic');
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [photos, setPhotos] = useState<string[]>([]);
  const [result, setResult] = useState<null | { metres: number; system: string; at: string }>(null);

  const m = parseInt(metres || '0', 10) || 0;
  const key = (k: string) => {
    if (k === 'del') {
      setMetres((v) => v.slice(0, -1));
      setFresh(false);
      return;
    }
    setMetres((v) => {
      const next = fresh ? k : (v + k).replace(/^0+(?=\d)/, '');
      return next.length > 3 ? v : next;
    });
    setFresh(false);
  };
  const snap = () => {
    if (photos.length >= 3) return;
    onFlash();
    setPhotos((ph) => [...ph, `p${6 - ph.length}`]);
  };
  const submit = () => {
    if (m <= 0) return;
    const at = currentIso(useStore.getState().clockMinutes);
    logInstall({ jobId: JOB_ID, metres: m, system, note: note.trim() || DEFAULT_NOTE, author: AUTHOR, photo: photos.length > 0 });
    toast({ title: `${m} m ${system} logged on Dexcom`, detail: 'Capcon OS updated: metres, % complete and site diary', tone: 'success' });
    setResult({ metres: m, system, at });
  };

  if (result && job) {
    return (
      <div className="flex min-h-[640px] flex-col items-center px-6 pt-16 text-center">
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
          className="grid h-[84px] w-[84px] place-items-center rounded-full text-white"
          style={{ background: p.ok }}
        >
          <Check size={46} strokeWidth={3} />
        </motion.div>
        <h2 className="mt-5 text-[26px] font-bold tracking-[-0.02em]">Sent to the office</h2>
        <p className="mt-1.5 text-[15px]" style={{ color: p.text2 }}>
          {result.metres} m {result.system} logged at {fmtTime(result.at)}
          {photos.length ? ` with ${photos.length} photo${photos.length > 1 ? 's' : ''}` : ''}.
        </p>
        <div className="mt-6 w-full overflow-hidden rounded-[12px] text-left" style={{ background: p.card }}>
          <Row p={p}>
            <span className="flex-1 text-[15px]">Dexcom installed</span>
            <span className="text-[15px] font-semibold tnum">{num(installed(job))} m</span>
          </Row>
          <Row p={p}>
            <span className="flex-1 text-[15px]">% complete</span>
            <span className="text-[15px] font-semibold tnum">{pct(jobPct(job))}</span>
          </Row>
          <Row p={p} last>
            <span className="flex-1 text-[15px]">Site diary</span>
            <span className="flex items-center gap-1 text-[15px] font-semibold" style={{ color: p.ok }}>
              <CircleCheck size={16} /> Written
            </span>
          </Row>
        </div>
        <Link
          to={`/projects/${JOB_ID}`}
          data-testid="view-in-os"
          className="mt-6 flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] text-[17px] font-semibold"
          style={{ background: p.tint, color: p.onTint }}
        >
          View in Capcon OS <ExternalLink size={17} />
        </Link>
        <button
          onClick={() => {
            setResult(null);
            setMetres('0');
            setFresh(true);
            setPhotos([]);
            setNote('');
          }}
          className="mt-3 h-[44px] text-[17px] font-medium"
          style={{ color: p.tint }}
        >
          Log another
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <LargeTitle p={p} eyebrow="Dexcom campus, Athenry" title="Log install" />

      {/* system toggle */}
      <div className="mx-4 mb-4 grid grid-cols-2 rounded-[9px] p-[2px]" style={{ background: p.dark ? '#2c2c2e' : 'rgba(118,118,128,0.12)' }}>
        {(['siphonic', 'gravity'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSystem(s)}
            className="h-[30px] rounded-[7px] text-[14px] font-semibold capitalize transition"
            style={system === s ? { background: p.dark ? '#636366' : '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.12)', color: p.text } : { color: p.text }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* metres display + stepper */}
      <div className="mx-4 mb-3 flex items-center justify-between rounded-[14px] px-3 py-3" style={{ background: p.card }}>
        <button
          aria-label="Decrease metres"
          onClick={() => {
            setMetres(String(Math.max(0, m - 1)));
            setFresh(false);
          }}
          className="grid h-11 w-11 place-items-center rounded-full active:opacity-60"
          style={{ background: p.card2, color: p.tint }}
        >
          <Minus size={20} strokeWidth={2.5} />
        </button>
        <div className="text-center">
          <div className="text-[46px] font-bold leading-none tracking-[-0.03em] tnum" data-testid="field-metres">
            {m}
            <span className="ml-1 text-[22px] font-semibold" style={{ color: p.text2 }}>
              m
            </span>
          </div>
          <div className="mt-1 text-[12px] capitalize" style={{ color: p.text2 }}>
            {system} · Building 2
          </div>
        </div>
        <button
          aria-label="Increase metres"
          onClick={() => {
            setMetres(String(Math.min(999, m + 1)));
            setFresh(false);
          }}
          className="grid h-11 w-11 place-items-center rounded-full active:opacity-60"
          style={{ background: p.card2, color: p.tint }}
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* keypad */}
      <div className="mx-4 mb-5 grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
          k === '' ? (
            <span key={`blank-${i}`} />
          ) : (
            <button
              key={k}
              onClick={() => key(k)}
              aria-label={k === 'del' ? 'Delete digit' : `Digit ${k}`}
              className="grid h-[42px] place-items-center rounded-[9px] text-[21px] font-medium active:opacity-50"
              style={{ background: k === 'del' ? 'transparent' : p.card, color: p.text }}
            >
              {k === 'del' ? <Delete size={21} /> : k}
            </button>
          ),
        )}
      </div>

      <Group p={p} header="Note">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="block w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-snug outline-none"
          style={{ color: p.text }}
          placeholder="What was installed, where"
        />
      </Group>

      <Group p={p} header="Photos">
        <div className="flex items-center gap-2 px-3 py-3">
          {photos.map((ph, i) => (
            <motion.div key={ph} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
              <PhotoPlaceholder seed={ph} className="h-[58px] w-[58px] !rounded-[10px]" />
              <button
                onClick={() => setPhotos((x) => x.filter((_, k) => k !== i))}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white"
              >
                <X size={11} strokeWidth={3} />
              </button>
            </motion.div>
          ))}
          {photos.length < 3 && (
            <button
              onClick={snap}
              data-testid="snap-photo"
              className="flex h-[58px] flex-1 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed text-[15px] font-semibold active:opacity-60"
              style={{ borderColor: p.tint, color: p.tint }}
            >
              <Camera size={19} /> Snap photo
            </button>
          )}
        </div>
      </Group>

      <div className="mx-4 mb-6">
        <button
          onClick={submit}
          disabled={m <= 0}
          data-testid="submit-install"
          className="h-[50px] w-full rounded-[14px] text-[17px] font-semibold transition active:scale-[0.98] disabled:opacity-40"
          style={{ background: p.tint, color: p.onTint }}
        >
          Submit {m} m to Capcon OS
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Tickets
function TicketsScreen({ p }: { p: Pal }) {
  const barry = TECHNICIANS.find((t) => t.name === AUTHOR);
  const [open, setOpen] = useState<number | null>(null);
  const tickets = useMemo(() => [...(barry?.tickets ?? [])].sort((a, b) => a.expires.localeCompare(b.expires)), [barry]);
  const colour = (d: number) => (d < 0 ? ['#b91c1c', '#ef4444'] : d <= 30 ? ['#b45309', '#f59e0b'] : d <= 90 ? ['#0e7490', '#22d3ee'] : ['#0a2540', '#0d4f8b']);
  return (
    <div>
      <LargeTitle p={p} eyebrow="Barry McEvoy · Lead Technician" title="Tickets" />
      <div className="mx-4 mb-4 flex items-center gap-2 rounded-[12px] px-4 py-3 text-[14px]" style={{ background: p.card }}>
        <ShieldCheck size={18} style={{ color: p.ok }} />
        <span>All {tickets.length} tickets valid for Dexcom. Next renewal {tickets[0] ? fmtDate(tickets[0].expires, { year: true }) : ''}.</span>
      </div>
      <div className="mx-4 mb-6">
        {tickets.map((t, i) => {
          const d = daysUntil(t.expires);
          const [c1, c2] = colour(d);
          const expanded = open === i;
          return (
            <motion.button
              layout
              key={t.type + t.ref}
              onClick={() => setOpen(expanded ? null : i)}
              className={clsx('relative block w-full overflow-hidden rounded-[16px] px-4 pt-3 text-left text-white shadow-[0_-6px_18px_-8px_rgba(0,0,0,0.45)]', i > 0 && '-mt-[38px]')}
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, height: expanded ? 150 : 96, zIndex: i }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">{t.type === 'Site induction' ? 'Site induction' : 'Certification'}</div>
                  <div className="text-[18px] font-semibold leading-tight">{t.type}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-[0.06em] opacity-80">Expires</div>
                  <div className="text-[14px] font-semibold tnum">{fmtDate(t.expires, { year: true })}</div>
                </div>
              </div>
              {expanded && (
                <div className="mt-3 flex items-end justify-between text-[13px]">
                  <div>
                    <div className="opacity-80">Ref</div>
                    <div className="font-semibold tnum">{t.ref}</div>
                    {t.note && <div className="mt-0.5 opacity-90">{t.note}</div>}
                  </div>
                  <div className="rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold">{d < 0 ? 'Expired' : d <= 30 ? `${d} days left` : `${Math.round(d / 30)} months left`}</div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
      <div className="mx-8 mb-6 text-center text-[12.5px]" style={{ color: p.text2 }}>
        Tap a ticket to show it at the gate. The Compliance Agent reminds you 30 days before anything expires.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Issues
function IssuesScreen({ p, openSheet }: { p: Pal; openSheet: () => void }) {
  const diary = useStore((s) => s.diary);
  const mine = diary.filter((d) => d.jobId === JOB_ID && d.id.startsWith('D-issue'));
  const past = [
    { id: 'i1', text: 'Spool B2-047 bracket centres did not match drawing. Prefab re-issued, resolved.', at: '2026-09-24T10:12:00', status: 'Resolved' },
    { id: 'i2', text: 'MEWP access blocked by JPC scaffold at grid F2. Moved by JPC same day.', at: '2026-09-17T08:55:00', status: 'Resolved' },
  ];
  return (
    <div>
      <LargeTitle
        p={p}
        eyebrow="Dexcom campus, Athenry"
        title="Issues"
        right={
          <button onClick={openSheet} aria-label="Flag issue" className="mb-1 grid h-9 w-9 place-items-center rounded-full" style={{ background: p.tint, color: p.onTint }}>
            <Plus size={20} strokeWidth={2.5} />
          </button>
        }
      />
      <Group p={p} header="Sent today">
        {mine.length ? (
          mine.map((d, i) => (
            <Row key={d.id} p={p} last={i === mine.length - 1}>
              <IconTile bg={p.warn}>
                <TriangleAlert size={15} />
              </IconTile>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] leading-snug">{d.text.replace(/^Issue flagged: /, '')}</div>
                <div className="text-[12.5px]" style={{ color: p.text2 }}>
                  {fmtTime(d.at)} · With Donnacha and the Site Progress Agent
                </div>
              </div>
            </Row>
          ))
        ) : (
          <Row p={p} last>
            <span className="text-[15px]" style={{ color: p.text2 }}>
              Nothing flagged today.
            </span>
          </Row>
        )}
      </Group>
      <Group p={p} header="Earlier">
        {past.map((it, i) => (
          <Row key={it.id} p={p} last={i === past.length - 1}>
            <IconTile bg={p.ok}>
              <Check size={15} strokeWidth={3} />
            </IconTile>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] leading-snug">{it.text}</div>
              <div className="text-[12.5px]" style={{ color: p.text2 }}>
                {fmtDate(it.at, { weekday: true })} · {it.status}
              </div>
            </div>
          </Row>
        ))}
      </Group>
      <div className="mx-4 mb-6">
        <button onClick={openSheet} className="h-[50px] w-full rounded-[14px] text-[17px] font-semibold" style={{ background: p.card, color: p.bad }}>
          Flag a new issue
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- issue sheet
const CATS = ['Access', 'Materials', 'Design / RFI', 'Safety', 'Programme'];

function IssueSheet({ p, open, onClose, onSent }: { p: Pal; open: boolean; onClose: () => void; onSent: () => void }) {
  const flagIssue = useStore((s) => s.flagIssue);
  const toast = useStore((s) => s.toast);
  const [cat, setCat] = useState('Materials');
  const [note, setNote] = useState('Spools B2-059 to B2-066 not on today’s delivery. Need them for D15 onwards Thursday.');
  const send = () => {
    if (!note.trim()) return;
    flagIssue({ jobId: JOB_ID, note: `${cat}: ${note.trim()}`, author: AUTHOR });
    toast({ title: 'Issue sent to the office', detail: `${cat} · Dexcom · flagged to Donnacha`, tone: 'warning' });
    onClose();
    onSent();
  };
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="absolute inset-0 z-40 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="absolute inset-x-0 bottom-0 z-50 rounded-t-[14px] px-4 pb-10 pt-2"
            style={{ background: p.dark ? '#1c1c1e' : '#f2f2f7' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          >
            <div className="mx-auto mb-3 h-[5px] w-9 rounded-full" style={{ background: p.text2, opacity: 0.5 }} />
            <div className="mb-4 flex items-center justify-between">
              <button onClick={onClose} className="text-[17px]" style={{ color: p.tint }}>
                Cancel
              </button>
              <span className="text-[17px] font-semibold">Flag issue</span>
              <button onClick={send} className="text-[17px] font-semibold" style={{ color: p.tint }}>
                Send
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className="rounded-full px-3 py-1.5 text-[14px] font-medium"
                  style={cat === c ? { background: p.tint, color: p.onTint } : { background: p.card, color: p.text }}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="overflow-hidden rounded-[12px]" style={{ background: p.card }}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="block w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-snug outline-none"
                style={{ color: p.text }}
                placeholder="What’s the problem and what do you need?"
              />
            </div>
            <div className="mt-2 px-2 text-[12.5px]" style={{ color: p.text2 }}>
              Goes to the site diary and the Operations Director with your location and the time.
            </div>
            <button onClick={send} className="mt-4 h-[50px] w-full rounded-[14px] text-[17px] font-semibold" style={{ background: p.bad, color: '#fff' }}>
              Send to the office
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
