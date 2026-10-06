import { ArrowRight, HardHat, Ruler, ShieldCheck, Smartphone, WifiOff } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { PhoneApp } from '../components/field/PhoneApp';
import { Card, clsx, LinkButton, Pill, Progress } from '../components/ui';
import { designed, installed, jobPct } from '../data/metrics';
import { ago } from '../lib/dates';
import { num, pct } from '../lib/format';
import { useStore } from '../store/useStore';
import { jobLastUpdate, SourceBadge } from '../components/projects/shared';

const PHONE_H = 844;
const PHONE_W = 390;

/** Scale the phone so it fits the viewport at 1440×900 without scrolling. */
function usePhoneScale() {
  const calc = () => (typeof window === 'undefined' ? 1 : Math.max(0.62, Math.min(1, (window.innerHeight - 110) / PHONE_H)));
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return scale;
}

export default function Field() {
  const scale = usePhoneScale();
  const job = useStore((s) => s.jobs.find((j) => j.id === 'CE-2291'));
  const ramsSigned = useStore((s) => s.ramsSigned);
  const fresh = useStore((s) => s.recentlyUpdated.includes('CE-2291'));

  return (
    <div className="flex flex-wrap items-start justify-center gap-x-14 gap-y-8 pt-2">
      {/* explanation */}
      <div className="w-full max-w-[400px] pt-4">
        <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-brand">Technician app</div>
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink">This is what Barry sees on site</h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
          Barry McEvoy, Lead Technician on IE Crew 2, is on the Dexcom campus in Athenry today. Everything he taps lands in Capcon OS straight away: metres and % complete, the site diary,
          the valuation and the office’s view of where the job stands. Nobody has to ring him.
        </p>

        <ol className="mt-5 space-y-2.5">
          <Step n={1} done={ramsSigned} icon={<ShieldCheck size={15} />}>
            Sign on to today’s RAMS with one tap
          </Step>
          <Step n={2} done={fresh} icon={<Ruler size={15} />}>
            Log 48 m of siphonic collector with a photo
          </Step>
          <Step n={3} done={false} icon={<ArrowRight size={15} />}>
            Open Dexcom in Capcon OS: metres, % and diary already updated
          </Step>
        </ol>

        {job && (
          <Card strong className={clsx('mt-6 !p-4 transition-shadow', fresh && 'ring-2 ring-[var(--c-brand)]')}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px] font-medium text-ink-3">In the office right now · Dexcom</div>
              {fresh ? <Pill tone="brand" dot>Updated just now</Pill> : <Pill tone="ok" dot>Live</Pill>}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={clsx('text-[28px] font-semibold tracking-[-0.02em] tnum', fresh ? 'text-brand' : 'text-ink')} data-testid="office-installed">
                {num(installed(job))}
              </span>
              <span className="text-[13px] text-ink-3 tnum">of {num(designed(job))} m installed</span>
              <span className="ml-auto text-[15px] font-semibold text-ink tnum">{pct(jobPct(job))}</span>
            </div>
            <Progress value={jobPct(job)} className="mt-2" />
            <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-3">
              <span>Last update {fresh ? 'just now' : ago(jobLastUpdate(job).at)}</span>
              <SourceBadge source={jobLastUpdate(job).source} />
            </div>
            <LinkButton to="/projects/CE-2291" size="sm" variant={fresh ? 'primary' : 'secondary'} className="mt-3.5" icon={<ArrowRight size={14} />}>
              Open Dexcom in Capcon OS
            </LinkButton>
          </Card>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2 text-[11.5px] text-ink-3">
          <Fact icon={<WifiOff size={14} />}>Works offline, syncs on signal</Fact>
          <Fact icon={<Smartphone size={14} />}>iPhone and Android</Fact>
          <Fact icon={<HardHat size={14} />}>Big targets for gloves</Fact>
        </div>
      </div>

      {/* phone */}
      <div style={{ width: PHONE_W * scale, height: PHONE_H * scale }} className="shrink-0">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: PHONE_W, height: PHONE_H }}>
          <PhoneApp />
        </div>
      </div>
    </div>
  );
}

function Step({ n, done, icon, children }: { n: number; done: boolean; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className={clsx('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition-colors', done ? 'bg-ok text-white dark:text-[#06101e]' : 'bg-brand-soft text-brand')}>
        {done ? icon : n}
      </span>
      <span className={clsx('text-[13.5px]', done ? 'text-ink-3 line-through' : 'text-ink')}>{children}</span>
    </li>
  );
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5 rounded-2xl bg-sunk px-3 py-2.5">
      <span className="text-brand">{icon}</span>
      <span className="leading-snug">{children}</span>
    </div>
  );
}
