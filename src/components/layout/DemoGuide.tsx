import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';

export interface DemoStep {
  route: string;
  title: string;
  say: string;
  do: string;
  assistant?: boolean;
}

// The 12-minute discovery-call path. Mirrors the README.
export const DEMO_STEPS: DemoStep[] = [
  {
    route: '/command',
    title: 'Every site on one screen',
    say: '113 live jobs across Ireland, the UK and Asia. Health, crews, valuations and tenders, without ringing round.',
    do: 'Point at the KPI row, then the “Needs your attention” feed the agents wrote overnight.',
  },
  {
    route: '/projects/CE-2333',
    title: 'Where does this job truly stand?',
    say: 'Clonee is amber. Last update came in by email from Kilcarra; the programme moved and nobody is booked tomorrow.',
    do: 'Show the status strip, programme vs main contractor, crew tomorrow = none.',
  },
  {
    route: '/crews',
    title: 'Cover the gap',
    say: 'IE Crew 8 frees up after Tuesday. Drag it onto Clonee for Wednesday to Friday. Compliance checks tickets as you drop.',
    do: 'Drag IE Crew 8 Wed→Fri onto Clonee (or approve the Scheduler Agent’s suggestion). Note the IPAF warning on the Cork crew.',
  },
  {
    route: '/field',
    title: 'The field app',
    say: 'This is what Barry sees at Dexcom. He logs 48 m of siphonic pipe with a photo. No phone call, no spreadsheet.',
    do: 'Log 48 m, add photo, submit. Then tap “View in Capcon OS” to see Dexcom update.',
  },
  {
    route: '/finance',
    title: 'Valuation Agent',
    say: 'From installed metres and agreed variations, the agent drafts Thurrock’s application before Thursday’s cut-off. Valerie approves.',
    do: 'Run the Valuation Agent on Thurrock, review the lines, approve.',
  },
  {
    route: '/tenders',
    title: 'Takeoff Agent',
    say: 'Aaron is over capacity. The agent reads the tender pack and drafts the BOQ, so he reviews instead of measures.',
    do: 'Open “Run Takeoff Agent”, drop the sample pack, then “Send to Aaron for review”.',
  },
  {
    route: '/command',
    title: 'Ask Capcon',
    say: 'Anyone can ask the business a question in plain English. Answers come from live data, with sources.',
    do: 'Ask: “Where are we on Dexcom?”, “Whose IPAF expires this month?”, “What applications for payment are over 60 days?”',
    assistant: true,
  },
  {
    route: '/integrations',
    title: 'Own software, or AI on what you have?',
    say: 'Both. Capcon OS is your own platform, connected into Outlook, SharePoint, Sage, Revit and the rest. Agents work on top, with your approval.',
    do: 'Walk the diagram left to right: your tools, Capcon OS, agents, people.',
  },
  {
    route: '/efficiency',
    title: 'What this gives back',
    say: 'Your numbers, not ours. Let’s set the sliders together.',
    do: 'Ask Donnacha for sites, calls per site, hours per valuation, and adjust live.',
  },
];

export function DemoGuide() {
  const demo = useStore((s) => s.demo);
  const setDemo = useStore((s) => s.setDemo);
  const setRole = useStore((s) => s.setRole);
  const setAssistantOpen = useStore((s) => s.setAssistantOpen);
  const nav = useNavigate();
  const step = DEMO_STEPS[demo.step];

  useEffect(() => {
    if (!demo.active || !step) return;
    if (step.route !== '/field') setRole('donnacha');
    else setRole('technician');
    nav(step.route);
    setAssistantOpen(!!step.assistant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo.active, demo.step]);

  const go = (d: number) => {
    const next = demo.step + d;
    if (next < 0) return;
    if (next >= DEMO_STEPS.length) {
      setDemo({ active: false, step: 0 });
      setRole('donnacha');
      return;
    }
    setDemo({ step: next });
  };

  return (
    <AnimatePresence>
      {demo.active && step && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="glass-strong fixed bottom-5 left-1/2 z-[60] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 rounded-[22px] px-5 py-4"
          data-testid="demo-guide"
        >
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-[14px] font-semibold text-white dark:text-[#06101e]">{demo.step + 1}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  Demo · step {demo.step + 1} of {DEMO_STEPS.length}
                </span>
              </div>
              <div className="mt-0.5 text-[15px] font-semibold text-ink">{step.title}</div>
              <p className="mt-1 text-[13px] text-ink-2">{step.say}</p>
              <p className="mt-1.5 text-[12px] text-ink-3">
                <span className="font-medium text-brand">Do: </span>
                {step.do}
              </p>
            </div>
            <button onClick={() => setDemo({ active: false })} className="rounded-full p-1 text-ink-3 hover:bg-sunk hover:text-ink" aria-label="End demo">
              <X size={16} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {DEMO_STEPS.map((_, i) => (
                <button key={i} onClick={() => setDemo({ step: i })} className="h-1.5 flex-1 rounded-full transition" style={{ background: i <= demo.step ? 'var(--c-brand)' : 'var(--c-hairline)' }} aria-label={`Go to step ${i + 1}`} />
              ))}
            </div>
            <button onClick={() => go(-1)} disabled={demo.step === 0} className="flex h-8 items-center gap-1 rounded-full px-3 text-[12.5px] font-medium text-ink-2 hover:bg-sunk disabled:opacity-40">
              <ChevronLeft size={15} /> Back
            </button>
            <button onClick={() => go(1)} className="flex h-8 items-center gap-1 rounded-full bg-brand px-3.5 text-[12.5px] font-semibold text-white dark:text-[#06101e]" data-testid="demo-next">
              {demo.step === DEMO_STEPS.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
