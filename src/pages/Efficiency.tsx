import { useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calculator, ClipboardCheck, Clock, Euro, HardHat, PencilRuler, Receipt, RotateCcw, Ruler, Users, Wrench } from 'lucide-react';
import { Button, Card, CardHeader, CountUp, LinkButton, Note, PageHeader, Segmented, clsx } from '../components/ui';
import { CHART, ChartTooltip, axisProps } from '../components/charts';

// ------------------------------------------------------------------ model
type Key =
  | 'sites'
  | 'callsPerSite'
  | 'minsPerCall'
  | 'callsSavedPct'
  | 'emailsPerDay'
  | 'minsPerEmail'
  | 'triageSavedPct'
  | 'valuations'
  | 'hrsPerValuation'
  | 'valuationSavedPct'
  | 'tenders'
  | 'hrsPerTakeoff'
  | 'takeoffSavedPct'
  | 'reports'
  | 'hrsPerReport'
  | 'reportSavedPct'
  | 'packs'
  | 'hrsPerPack'
  | 'packSavedPct'
  | 'adminHrs'
  | 'adminSavedPct'
  | 'rate'
  | 'weeks';

type Inputs = Record<Key, number>;

interface SliderDef {
  key: Key;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  prefix?: string;
}

const EXPECTED: Inputs = {
  sites: 110,
  callsPerSite: 3,
  minsPerCall: 6,
  callsSavedPct: 70,
  emailsPerDay: 120,
  minsPerEmail: 2,
  triageSavedPct: 80,
  valuations: 95,
  hrsPerValuation: 2.5,
  valuationSavedPct: 60,
  tenders: 18,
  hrsPerTakeoff: 6,
  takeoffSavedPct: 55,
  reports: 60,
  hrsPerReport: 1.5,
  reportSavedPct: 60,
  packs: 6,
  hrsPerPack: 14,
  packSavedPct: 65,
  adminHrs: 6,
  adminSavedPct: 60,
  rate: 55,
  weeks: 46,
};

const CONSERVATIVE: Inputs = {
  ...EXPECTED,
  callsSavedPct: 40,
  triageSavedPct: 50,
  valuationSavedPct: 35,
  takeoffSavedPct: 30,
  reportSavedPct: 35,
  packSavedPct: 40,
  adminSavedPct: 35,
};

const WEEKS_PER_MONTH = 52 / 12; // 4.33
const DAYS_PER_WEEK = 5;
const FTE_HOURS = 37.5;
const EMAIL_OPS_SHARE = 0.6; // remainder is drawings / RFIs routed to Design

type Dept = 'Operations' | 'Commercial' | 'Estimating' | 'Maintenance' | 'HSQE' | 'Design';

interface Group {
  dept: Dept;
  title: string;
  icon: ReactNode;
  agent: string;
  sliders: SliderDef[];
}

const GROUPS: Group[] = [
  {
    dept: 'Operations',
    title: 'Operations: site status and the inbox',
    icon: <HardHat size={15} />,
    agent: 'Site Progress Agent, Inbox Agent',
    sliders: [
      { key: 'sites', label: 'Live sites', min: 10, max: 200, step: 1 },
      { key: 'callsPerSite', label: 'Status calls per site per week', min: 0, max: 10, step: 0.5 },
      { key: 'minsPerCall', label: 'Minutes per call', min: 1, max: 20, step: 1, unit: 'min' },
      { key: 'callsSavedPct', label: 'Calls no longer needed', min: 0, max: 100, step: 5, unit: '%' },
      { key: 'emailsPerDay', label: 'Emails per day to projects@', min: 0, max: 400, step: 5 },
      { key: 'minsPerEmail', label: 'Minutes per email to triage and file', min: 0.5, max: 10, step: 0.5, unit: 'min' },
      { key: 'triageSavedPct', label: 'Triage time saved', min: 0, max: 100, step: 5, unit: '%' },
    ],
  },
  {
    dept: 'Commercial',
    title: 'Commercial: applications for payment',
    icon: <Receipt size={15} />,
    agent: 'Valuation Agent',
    sliders: [
      { key: 'valuations', label: 'Valuations per month', min: 0, max: 200, step: 1 },
      { key: 'hrsPerValuation', label: 'Hours per valuation', min: 0.5, max: 8, step: 0.25, unit: 'h' },
      { key: 'valuationSavedPct', label: 'Valuation time saved', min: 0, max: 100, step: 5, unit: '%' },
    ],
  },
  {
    dept: 'Estimating',
    title: 'Estimating: tender takeoffs',
    icon: <Ruler size={15} />,
    agent: 'Takeoff Agent',
    sliders: [
      { key: 'tenders', label: 'Tenders per month', min: 0, max: 60, step: 1 },
      { key: 'hrsPerTakeoff', label: 'Hours per takeoff', min: 0.5, max: 24, step: 0.5, unit: 'h' },
      { key: 'takeoffSavedPct', label: 'Takeoff time saved', min: 0, max: 100, step: 5, unit: '%' },
    ],
  },
  {
    dept: 'Maintenance',
    title: 'Maintenance: inspection reports',
    icon: <Wrench size={15} />,
    agent: 'Maintenance Agent',
    sliders: [
      { key: 'reports', label: 'Maintenance reports per month', min: 0, max: 200, step: 1 },
      { key: 'hrsPerReport', label: 'Hours per report', min: 0.25, max: 6, step: 0.25, unit: 'h' },
      { key: 'reportSavedPct', label: 'Report time saved', min: 0, max: 100, step: 5, unit: '%' },
    ],
  },
  {
    dept: 'Design',
    title: 'Design: handover packs and drawing issues',
    icon: <PencilRuler size={15} />,
    agent: 'Handover Pack Agent, Inbox Agent',
    sliders: [
      { key: 'packs', label: 'Handover packs per month', min: 0, max: 30, step: 1 },
      { key: 'hrsPerPack', label: 'Hours per pack', min: 1, max: 60, step: 1, unit: 'h' },
      { key: 'packSavedPct', label: 'Pack time saved', min: 0, max: 100, step: 5, unit: '%' },
    ],
  },
  {
    dept: 'HSQE',
    title: 'HSQE: tickets and compliance admin',
    icon: <ClipboardCheck size={15} />,
    agent: 'Compliance Agent',
    sliders: [
      { key: 'adminHrs', label: 'Ticket and compliance admin hours per week', min: 0, max: 40, step: 0.5, unit: 'h' },
      { key: 'adminSavedPct', label: 'Admin time saved', min: 0, max: 100, step: 5, unit: '%' },
    ],
  },
];

const VALUE_SLIDERS: SliderDef[] = [
  { key: 'rate', label: 'Loaded hourly rate', min: 25, max: 120, step: 1, prefix: '€' },
  { key: 'weeks', label: 'Working weeks per year', min: 40, max: 52, step: 1 },
];


const r1 = (n: number) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : 0);
const fmtNum = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-IE') : n.toLocaleString('en-IE', { maximumFractionDigits: 2 }));
const fmtH = (n: number) => `${r1(n).toLocaleString('en-IE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`;

function compute(v: Inputs) {
  const p = (k: Key) => v[k] / 100;
  const callsH = (v.sites * v.callsPerSite * v.minsPerCall) / 60;
  const callsSaved = callsH * p('callsSavedPct');
  const emailH = (v.emailsPerDay * DAYS_PER_WEEK * v.minsPerEmail) / 60;
  const emailSaved = emailH * p('triageSavedPct');
  const valH = (v.valuations * v.hrsPerValuation) / WEEKS_PER_MONTH;
  const tenH = (v.tenders * v.hrsPerTakeoff) / WEEKS_PER_MONTH;
  const repH = (v.reports * v.hrsPerReport) / WEEKS_PER_MONTH;
  const packH = (v.packs * v.hrsPerPack) / WEEKS_PER_MONTH;

  const depts: Record<Dept, number> = {
    Operations: callsSaved + emailSaved * EMAIL_OPS_SHARE,
    Commercial: valH * p('valuationSavedPct'),
    Estimating: tenH * p('takeoffSavedPct'),
    Design: packH * p('packSavedPct') + emailSaved * (1 - EMAIL_OPS_SHARE),
    Maintenance: repH * p('reportSavedPct'),
    HSQE: v.adminHrs * p('adminSavedPct'),
  };
  const total = Object.values(depts).reduce((s, x) => s + x, 0);
  return {
    callsH,
    callsSaved,
    emailH,
    emailSaved,
    valH,
    tenH,
    repH,
    packH,
    depts,
    total,
    fte: total / FTE_HOURS,
    hoursYear: total * v.weeks,
    annual: total * v.rate * v.weeks,
  };
}

// ------------------------------------------------------------------ page
export default function Efficiency() {
  const [v, setV] = useState<Inputs>(EXPECTED);
  const set = (k: Key, n: number) => setV((s) => ({ ...s, [k]: n }));
  const r = useMemo(() => compute(v), [v]);

  const preset: 'conservative' | 'expected' | 'custom' = same(v, EXPECTED) ? 'expected' : same(v, CONSERVATIVE) ? 'conservative' : 'custom';
  const options = [
    { value: 'conservative' as const, label: 'Conservative' },
    { value: 'expected' as const, label: 'Expected' },
    ...(preset === 'custom' ? [{ value: 'custom' as const, label: 'Your numbers' }] : []),
  ];

  const chartData = (Object.keys(r.depts) as Dept[]).map((d) => ({ dept: d, hours: r1(r.depts[d]) })).sort((a, b) => b.hours - a.hours);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="What this gives back"
        title="Hours back every week, on your numbers."
        subtitle="Every figure below comes from the assumptions on this page. Move any slider to your own numbers and the totals recalculate. Nothing is hidden."
        actions={
          <>
            <Segmented
              value={preset}
              options={options}
              onChange={(o) => {
                if (o === 'conservative') setV(CONSERVATIVE);
                if (o === 'expected') setV(EXPECTED);
              }}
            />
            <Button variant="secondary" size="sm" icon={<RotateCcw size={14} />} onClick={() => setV(EXPECTED)} disabled={preset === 'expected'}>
              Reset to defaults
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <BigNumber label="Hours given back per week" icon={<Clock size={15} />} value={r.total} format={(x) => Math.round(x).toLocaleString('en-IE')} sub="Across six departments" accent />
        <BigNumber label="Full-time equivalent" icon={<Users size={15} />} value={r.fte} format={(x) => x.toFixed(1)} sub={`Hours per week ÷ ${FTE_HOURS}`} />
        <BigNumber label="Hours per year" icon={<Calculator size={15} />} value={r.hoursYear} format={(x) => Math.round(x).toLocaleString('en-IE')} sub={`Per week × ${v.weeks} working weeks`} />
        <BigNumber
          label="Annual value of that time"
          icon={<Euro size={15} />}
          value={r.annual}
          format={(x) => `€${Math.round(x).toLocaleString('en-IE')}`}
          sub={`At €${v.rate} per hour`}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px] min-[1700px]:grid-cols-[minmax(0,1fr)_460px]!">
        <div className="grid grid-cols-1 gap-4">
          {GROUPS.map((g, i) => (
            <Card key={g.dept} delay={0.03 * i}>
              <CardHeader
                icon={g.icon}
                title={g.title}
                subtitle={g.agent}
                action={
                  <div className="text-right">
                    <div className="text-[18px] font-semibold leading-none text-ink tnum">{fmtH(r.depts[g.dept])}</div>
                    <div className="mt-1 text-[11px] text-ink-3">per week</div>
                  </div>
                }
              />
              <div className="grid grid-cols-1 gap-x-7 gap-y-4 md:grid-cols-2 min-[1700px]:grid-cols-3!">
                {g.sliders.map((s) => (
                  <Slider key={s.key} def={s} value={v[s.key]} def0={EXPECTED[s.key]} onChange={(n) => set(s.key, n)} />
                ))}
              </div>
            </Card>
          ))}
          <Card delay={0.2}>
            <CardHeader icon={<Euro size={15} />} title="Turning hours into value" subtitle="Use your own loaded cost per hour" />
            <div className="grid grid-cols-1 gap-x-7 gap-y-4 md:grid-cols-2 min-[1700px]:grid-cols-3!">
              {VALUE_SLIDERS.map((s) => (
                <Slider key={s.key} def={s} value={v[s.key]} def0={EXPECTED[s.key]} onChange={(n) => set(s.key, n)} />
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-2">
          <Card delay={0.05}>
            <CardHeader title="Hours per week by department" subtitle="Recalculates as you move the sliders" />
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 64, bottom: 0, left: 0 }} barCategoryGap={10}>
                  <XAxis type="number" hide domain={[0, 'dataMax']} />
                  <YAxis type="category" dataKey="dept" width={92} {...axisProps} tick={{ fontSize: 12, fill: 'var(--c-ink-2)' }} />
                  <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={<ChartTooltip format={(x) => `${x.toFixed(1)} h per week`} />} />
                  <Bar dataKey="hours" name="Hours saved" radius={[0, 8, 8, 0]} isAnimationActive={false}>
                    {chartData.map((d, i) => (
                      <Cell key={d.dept} fill={i === 0 ? CHART.brand : CHART.brand2} fillOpacity={i === 0 ? 1 : 0.75} />
                    ))}
                    <LabelList dataKey="hours" position="right" formatter={(x) => `${Number(x).toFixed(1)} h`} style={{ fontSize: 11.5, fill: 'var(--c-ink-2)', fontWeight: 500 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t hairline pt-3">
              <span className="text-[12.5px] text-ink-3">Total per week</span>
              <span className="text-[20px] font-semibold text-ink tnum">{fmtH(r.total)}</span>
            </div>
          </Card>
          <Maths v={v} r={r} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Note>Hours are time freed up for people to spend on better work, not headcount cuts. Agents draft and people approve, so review time is already netted off in the “% saved” figures.</Note>
        <LinkButton to="/agents" size="sm" variant="ghost">
          See the agents doing this
        </LinkButton>
      </div>
    </div>
  );
}

function same(a: Inputs, b: Inputs) {
  return (Object.keys(a) as Key[]).every((k) => a[k] === b[k]);
}

function BigNumber({ label, value, format, sub, icon, accent }: { label: string; value: number; format: (v: number) => string; sub: string; icon: ReactNode; accent?: boolean }) {
  return (
    <Card className={clsx('!p-5', accent && 'relative overflow-hidden')} strong={accent}>
      {accent && <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-soft blur-2xl" />}
      <div className="flex items-center justify-between text-ink-3">
        <span className="text-[12px] font-medium">{label}</span>
        {icon}
      </div>
      <CountUp value={value} format={format} duration={0.6} className={clsx('mt-2 block text-[34px] font-semibold leading-none tracking-[-0.03em]', accent ? 'text-brand' : 'text-ink')} />
      <div className="mt-2 truncate text-[12px] text-ink-3">{sub}</div>
    </Card>
  );
}

// ------------------------------------------------------------------ slider
function Slider({ def, value, def0, onChange }: { def: SliderDef; value: number; def0: number; onChange: (n: number) => void }) {
  const { min, max, step, unit, prefix } = def;
  const pct = ((value - min) / (max - min)) * 100;
  const defPct = ((def0 - min) / (max - min)) * 100;
  const [focus, setFocus] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const n = parseFloat(raw.replace(/[^\d.]/g, ''));
    if (Number.isFinite(n)) {
      const snapped = Math.round(Math.min(max, Math.max(min, n)) / step) * step;
      onChange(Number(snapped.toFixed(4)));
    }
    setText(null);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label className="min-w-0 truncate text-[12.5px] text-ink-2" htmlFor={`sl-${def.key}`}>
          {def.label}
        </label>
        <div className="flex shrink-0 items-center rounded-lg bg-sunk px-2 py-0.5 focus-within:ring-2 focus-within:ring-brand/40">
          {prefix && <span className="text-[13px] font-semibold text-ink-3">{prefix}</span>}
          <input
            ref={inputRef}
            aria-label={`${def.label} value`}
            value={text ?? fmtNum(value)}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') inputRef.current?.blur();
              if (e.key === 'Escape') {
                setText(null);
                inputRef.current?.blur();
              }
            }}
            className="w-[52px] bg-transparent text-right text-[13px] font-semibold text-ink outline-none tnum"
            inputMode="decimal"
          />
          {unit && <span className="ml-0.5 text-[12px] font-medium text-ink-3">{unit}</span>}
        </div>
      </div>
      <div className="relative h-6">
        {/* track */}
        <div className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-sunk shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]" />
        <motion.div
          className="absolute left-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--c-brand-2), var(--c-brand))' }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 700, damping: 45 }}
        />
        {/* default marker */}
        <div className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-ink-3/50" style={{ left: `${defPct}%` }} title={`Default ${fmtNum(def0)}`} />
        {/* thumb */}
        <motion.div
          className={clsx(
            'pointer-events-none absolute top-1/2 h-[20px] w-[20px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2),0_3px_10px_-2px_rgba(13,79,139,0.35)]',
            focus && 'ring-4 ring-brand/20',
          )}
          animate={{ left: `${pct}%`, scale: focus ? 1.08 : 1 }}
          transition={{ type: 'spring', stiffness: 700, damping: 45 }}
        >
          <span className="absolute inset-[6px] rounded-full bg-brand" />
        </motion.div>
        <input
          id={`sl-${def.key}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onPointerDown={() => setFocus(true)}
          onPointerUp={() => setFocus(false)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[10.5px] text-ink-3 tnum">
        <span>
          {prefix}
          {fmtNum(min)}
          {unit && unit !== '%' ? ` ${unit}` : unit}
        </span>
        <span>
          {prefix}
          {fmtNum(max)}
          {unit && unit !== '%' ? ` ${unit}` : unit}
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ maths
function Maths({ v, r }: { v: Inputs; r: ReturnType<typeof compute> }) {
  const n = fmtNum;
  const rows: { dept: string; formula: ReactNode; result: number }[] = [
    {
      dept: 'Operations',
      formula: (
        <>
          ({n(v.sites)} sites × {n(v.callsPerSite)} calls × {n(v.minsPerCall)} min ÷ 60) × {v.callsSavedPct}% = {fmtH(r.callsSaved)}
          <br />+ ({n(v.emailsPerDay)} emails × {DAYS_PER_WEEK} days × {n(v.minsPerEmail)} min ÷ 60) × {v.triageSavedPct}% × {EMAIL_OPS_SHARE * 100}% ={' '}
          {fmtH(r.emailSaved * EMAIL_OPS_SHARE)}
        </>
      ),
      result: r.depts.Operations,
    },
    {
      dept: 'Commercial',
      formula: (
        <>
          {n(v.valuations)} valuations × {n(v.hrsPerValuation)} h ÷ 4.33 weeks × {v.valuationSavedPct}%
        </>
      ),
      result: r.depts.Commercial,
    },
    {
      dept: 'Estimating',
      formula: (
        <>
          {n(v.tenders)} tenders × {n(v.hrsPerTakeoff)} h ÷ 4.33 weeks × {v.takeoffSavedPct}%
        </>
      ),
      result: r.depts.Estimating,
    },
    {
      dept: 'Maintenance',
      formula: (
        <>
          {n(v.reports)} reports × {n(v.hrsPerReport)} h ÷ 4.33 weeks × {v.reportSavedPct}%
        </>
      ),
      result: r.depts.Maintenance,
    },
    {
      dept: 'Design',
      formula: (
        <>
          {n(v.packs)} packs × {n(v.hrsPerPack)} h ÷ 4.33 weeks × {v.packSavedPct}% = {fmtH(r.packH * (v.packSavedPct / 100))}
          <br />+ email triage × {Math.round((1 - EMAIL_OPS_SHARE) * 100)}% (drawing issues, RFIs) = {fmtH(r.emailSaved * (1 - EMAIL_OPS_SHARE))}
        </>
      ),
      result: r.depts.Design,
    },
    {
      dept: 'HSQE',
      formula: (
        <>
          {n(v.adminHrs)} h admin per week × {v.adminSavedPct}%
        </>
      ),
      result: r.depts.HSQE,
    },
  ];

  return (
    <Card delay={0.1}>
      <CardHeader title="Assumptions and maths" subtitle="Your numbers, not ours. Every line is shown in full." />
      <div className="flex flex-col divide-y divide-[var(--c-hairline)]">
        {rows.map((row) => (
          <div key={row.dept} className="py-2.5 first:pt-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12.5px] font-semibold text-ink">{row.dept}</span>
              <span className="text-[12.5px] font-semibold text-ink tnum">{fmtH(row.result)}</span>
            </div>
            <div className="mt-0.5 font-mono text-[11px] leading-relaxed text-ink-3 tnum">{row.formula}</div>
          </div>
        ))}
        <div className="py-2.5">
          <div className="font-mono text-[11px] leading-relaxed text-ink-3 tnum">
            Total {fmtH(r.total)} per week ÷ {FTE_HOURS} h = <span className="font-semibold text-ink">{r.fte.toFixed(2)} FTE</span>
            <br />
            {fmtH(r.total)} × {v.weeks} weeks × €{v.rate} = <span className="font-semibold text-ink">€{Math.round(r.annual).toLocaleString('en-IE')} a year</span>
          </div>
        </div>
      </div>
      <Note className="mt-1">Monthly volumes are converted to weekly by dividing by 4.33 (52 weeks ÷ 12 months). Email volumes use a 5-day week.</Note>
    </Card>
  );
}
