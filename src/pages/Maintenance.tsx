import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ClipboardCheck,
  FileSignature,
  Hammer,
  Loader2,
  Repeat,
  Search,
  ShieldAlert,
  Sparkles,
  TestTube2,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Button, Card, CardHeader, Drawer, Kpi, Modal, Money, Note, PageHeader, PhotoPlaceholder, Pill, Segmented, Stat, Table, Td, Th, Tr, clsx, useInterval, type Tone } from '../components/ui';
import { useStore } from '../store/useStore';
import { BUILDINGS, MAINT_CONTRACTS, MAINT_VISITS } from '../data/seed';
import { maintVisitsDue } from '../data/metrics';
import type { Building, Defect, MaintenanceContract, MaintenanceVisit } from '../data/types';
import { eur, num, toEur } from '../lib/format';
import { TODAY_ISO, daysUntil, fmtDate, isoAdd } from '../lib/dates';

const contractById = new Map(MAINT_CONTRACTS.map((c) => [c.id, c]));
const buildingById = new Map(BUILDINGS.map((b) => [b.id, b]));
const NCH = contractById.get('MC-501')!;
/** Building name without the site prefix ("Site · Block A" → "Block A"). */
const bShort = (id: string) => {
  const n = buildingById.get(id)?.name ?? '';
  return n.includes(' · ') ? n.split(' · ').slice(1).join(' · ') : n;
};

const conditionTone: Record<Building['condition'], Tone> = { Good: 'ok', Fair: 'warn', 'Needs attention': 'bad' };
const sevTone: Record<Defect['severity'], Tone> = { Low: 'neutral', Medium: 'warn', High: 'bad' };
const STAGES: Defect['stage'][] = ['Defect found', 'Quote raised', 'Approved', 'Scheduled', 'Complete'];

export default function Maintenance() {
  const defects = useStore((s) => s.defects);
  const [openContract, setOpenContract] = useState<string | null>(null);

  const arv = MAINT_CONTRACTS.reduce((a, c) => a + toEur(c.annualValue, c.currency), 0);
  const renewals = MAINT_CONTRACTS.filter((c) => daysUntil(c.renewal) >= 0 && daysUntil(c.renewal) <= 90);
  const openDefects = defects.filter((d) => d.stage !== 'Complete');
  const openValue = openDefects.reduce((a, d) => a + toEur(d.quoteValue, contractById.get(d.contractId)?.currency ?? 'EUR'), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Robert Finn · Operations Director"
        title="Maintenance & Service"
        subtitle="Every completed install is a building we know inside out. Planned maintenance to BS EN 12056-3 and BS 8490 turns it into recurring revenue."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Maintenance contracts" value={MAINT_CONTRACTS.length} sub={`${MAINT_CONTRACTS.filter((c) => c.region === 'IE').length} Ireland · ${MAINT_CONTRACTS.filter((c) => c.region === 'UK').length} UK`} icon={<FileSignature size={15} />} />
        <Kpi label="Buildings under contract" value={BUILDINGS.length} sub={`${num(BUILDINGS.reduce((a, b) => a + b.outlets, 0))} outlets on the register`} icon={<Building2 size={15} />} delay={0.04} />
        <Kpi label="Annual recurring value" value={arv} format={(v) => eur(v)} sub="Group €, all contracts" icon={<Repeat size={15} />} delay={0.08} />
        <Kpi label="Renewals in 90 days" value={renewals.length} sub={`${eur(renewals.reduce((a, c) => a + toEur(c.annualValue, c.currency), 0))} a year up for renewal`} icon={<CalendarDays size={15} />} delay={0.12} />
        <Kpi label="Visits due, 30 days" value={maintVisitsDue(30)} sub="Planned preventative and inspections" icon={<ClipboardCheck size={15} />} delay={0.16} />
        <Kpi label="Open defects and quotes" value={openValue} format={(v) => eur(v)} sub={`${openDefects.length} defects not yet repaired`} icon={<ShieldAlert size={15} />} delay={0.2} />
      </div>

      <div className="mt-5">
        <RevenueLoop onOpen={setOpenContract} />
      </div>

      <div className="mt-5">
        <ContractsTable onOpen={setOpenContract} />
      </div>

      <div className="mt-5">
        <Schedule onOpen={setOpenContract} />
      </div>

      <div className="mt-5">
        <InspectionReports onOpen={setOpenContract} />
      </div>

      <div className="mt-5">
        <DefectKanban />
      </div>

      {createPortal(<ContractDrawer id={openContract} onClose={() => setOpenContract(null)} />, document.body)}
    </div>
  );
}

// ---------------------------------------------------------------- loop
const LOOP: { label: string; sub: string; icon: LucideIcon }[] = [
  { label: 'Install', sub: 'Design, prefab, install', icon: Hammer },
  { label: 'Test & handover', sub: 'Certs, O&M, as-builts', icon: TestTube2 },
  { label: 'Maintenance contract', sub: 'Offered at handover', icon: FileSignature },
  { label: 'Inspections', sub: 'Planned, to BS 8490', icon: ClipboardCheck },
  { label: 'Defects', sub: 'Found and photographed', icon: ShieldAlert },
  { label: 'Quotes', sub: 'Drafted by the agent', icon: Sparkles },
  { label: 'Repairs', sub: 'Scheduled and closed', icon: Wrench },
];

function RevenueLoop({ onOpen }: { onOpen: (id: string) => void }) {
  const defects = useStore((s) => s.defects);
  const [active, setActive] = useState(0);
  useInterval(() => setActive((a) => (a + 1) % LOOP.length), 1400);
  const converted = MAINT_CONTRACTS.filter((c) => c.fromInstall);
  const convertedArv = converted.reduce((a, c) => a + toEur(c.annualValue, c.currency), 0);
  const totalArv = MAINT_CONTRACTS.reduce((a, c) => a + toEur(c.annualValue, c.currency), 0);
  const nchBuildings = NCH.buildingIds.map((id) => buildingById.get(id)!).filter(Boolean);
  const nchDefects = defects.filter((d) => d.contractId === 'MC-501');
  const named = MAINT_CONTRACTS.filter((c) => c.fromInstall && c.id !== 'MC-501').slice(0, 4);

  return (
    <Card strong>
      <CardHeader title="Install becomes recurring revenue" subtitle="The loop every completed Capcon job can enter. Highlighted step moves through the cycle." icon={<Repeat size={15} />} />
      <div className="relative grid grid-cols-7 gap-2">
        {LOOP.map((s, i) => {
          const I = s.icon;
          const on = i === active;
          return (
            <div key={s.label} className="relative flex flex-col items-center text-center">
              {i < LOOP.length - 1 && (
                <div className="absolute left-[calc(50%+26px)] right-[calc(-50%+26px)] top-[25px] h-[2px] overflow-hidden rounded-full bg-sunk">
                  <motion.div
                    className="absolute top-0 h-full w-8 rounded-full bg-brand-2"
                    initial={{ x: '-100%' }}
                    animate={{ x: '400%' }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
                  />
                </div>
              )}
              <motion.div
                animate={{ scale: on ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={clsx('relative z-[1] grid h-[52px] w-[52px] place-items-center rounded-2xl transition-colors', on ? 'bg-brand text-white shadow-[0_8px_20px_-8px_var(--c-brand)] dark:text-[#06101e]' : 'bg-brand-soft text-brand')}
              >
                <I size={21} />
              </motion.div>
              <div className={clsx('mt-2 text-[13px] font-semibold', on ? 'text-brand' : 'text-ink')}>{s.label}</div>
              <div className="text-[11.5px] text-ink-3">{s.sub}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sunk px-3 py-1 text-[11.5px] text-ink-3">
          <Repeat size={12} /> Repairs feed the next inspection and the renewal
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl bg-brand-soft p-4 lg:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Pill tone="brand">MC-501</Pill>
                <span className="text-[12px] text-ink-3">Converted from a completed install</span>
              </div>
              <div className="mt-1.5 text-[17px] font-semibold tracking-[-0.01em] text-ink">National Children’s Hospital, Dublin</div>
              <div className="mt-0.5 text-[12.5px] text-ink-2">7-year install, 7.5 km of HDPE gravity drainage. Now on a 4-visit planned maintenance contract.</div>
            </div>
            <Button size="sm" variant="primary" onClick={() => onOpen('MC-501')} icon={<ArrowRight size={13} />}>
              Open contract
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Annual value" value={<Money amount={NCH.annualValue} currency={NCH.currency} />} />
            <Stat label="Buildings" value={nchBuildings.length} sub={`${num(nchBuildings.reduce((a, b) => a + b.outlets, 0))} outlets`} />
            <Stat label="Visits a year" value={NCH.visitsPerYear} />
            <Stat label="Open defects" value={nchDefects.filter((d) => d.stage !== 'Complete').length} />
            <Stat label="Renews" value={fmtDate(NCH.renewal)} sub={`in ${daysUntil(NCH.renewal)} days`} />
          </div>
        </div>
        <div className="rounded-2xl bg-sunk p-4 lg:col-span-5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-[13px] font-semibold text-ink">Converted installs</div>
            <div className="text-[12px] text-ink-3">
              {converted.length} contracts · {eur(convertedArv)} a year ({totalArv > 0 ? Math.round((convertedArv / totalArv) * 100) : 0}% of ARV)
            </div>
          </div>
          <div className="mt-2.5 space-y-1.5">
            {named.map((c) => (
              <button key={c.id} onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-surface-strong">
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{c.site}</span>
                <span className="shrink-0 text-[11.5px] text-ink-3">from {c.fromInstall}</span>
                <Money amount={c.annualValue} currency={c.currency} className="w-16 shrink-0 text-right text-[12.5px] font-medium text-ink-2" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- contracts
function ContractsTable({ onOpen }: { onOpen: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<'all' | 'IE' | 'UK'>('all');
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return MAINT_CONTRACTS.filter((c) => (region === 'all' || c.region === region) && (!s || `${c.site} ${c.client} ${c.sector} ${c.id}`.toLowerCase().includes(s))).sort((a, b) => a.renewal.localeCompare(b.renewal));
  }, [q, region]);
  return (
    <Card>
      <CardHeader
        title="Maintenance contracts"
        subtitle="Sorted by renewal date. Amber renews within 90 days."
        action={
          <div className="flex items-center gap-2">
            <label className="flex h-8 items-center gap-1.5 rounded-full bg-sunk px-3 text-[12.5px] text-ink-3">
              <Search size={13} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search site or client" className="w-40 bg-transparent text-ink outline-none placeholder:text-ink-3" />
            </label>
            <Segmented
              size="sm"
              value={region}
              onChange={setRegion}
              options={[
                { value: 'all', label: 'All' },
                { value: 'IE', label: 'IE' },
                { value: 'UK', label: 'UK' },
              ]}
            />
          </div>
        }
      />
      <Table className="max-h-[440px] overflow-y-auto">
        <thead>
          <tr>
            <Th>Site</Th>
            <Th>Sector</Th>
            <Th align="center">Region</Th>
            <Th align="right">Buildings</Th>
            <Th align="right">Annual value</Th>
            <Th>Renewal</Th>
            <Th align="right">Visits / yr</Th>
            <Th>Standard</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const d = daysUntil(c.renewal);
            const soon = d >= 0 && d <= 90;
            return (
              <Tr key={c.id} onClick={() => onOpen(c.id)} highlight={c.id === 'MC-501'}>
                <Td className="max-w-[320px]">
                  <div className="truncate font-medium text-ink">{c.site}</div>
                  <div className="truncate text-[11.5px] text-ink-3">
                    {c.id} · {c.client}
                    {c.fromInstall ? ` · from install ${c.fromInstall}` : ''}
                  </div>
                </Td>
                <Td className="whitespace-nowrap">{c.sector}</Td>
                <Td align="center">{c.region}</Td>
                <Td align="right">{c.buildingIds.length}</Td>
                <Td align="right">
                  <Money amount={c.annualValue} currency={c.currency} className="font-medium text-ink" />
                </Td>
                <Td className="whitespace-nowrap">
                  <span className={clsx(soon ? 'font-semibold text-warn' : 'text-ink-2')}>{fmtDate(c.renewal, { year: true })}</span>
                  {soon && <span className="ml-1.5 text-[11px] text-warn">{d} days</span>}
                </Td>
                <Td align="right">{c.visitsPerYear}</Td>
                <Td className="text-[11.5px] leading-tight">
                  {c.standard.split(' & ').map((x) => (
                    <div key={x} className="whitespace-nowrap">
                      {x}
                    </div>
                  ))}
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      <Note className="mt-3">{rows.length} contracts. Click a contract for its building asset register, visits and defects.</Note>
    </Card>
  );
}

function ContractDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const defects = useStore((s) => s.defects);
  const c = id ? contractById.get(id) : undefined;
  const buildings = c ? c.buildingIds.map((b) => buildingById.get(b)!).filter(Boolean) : [];
  const visits = c ? MAINT_VISITS.filter((v) => v.contractId === c.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const ds = c ? defects.filter((d) => d.contractId === c.id) : [];
  return (
    <Drawer open={!!c} onClose={onClose} width={840} title={c?.site ?? ''} subtitle={c ? `${c.id} · ${c.client} · ${c.sector} · ${c.standard}` : ''}>
      {c && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Annual value" value={<Money amount={c.annualValue} currency={c.currency} />} />
            <Stat label="Visits a year" value={c.visitsPerYear} />
            <Stat label="Renewal" value={fmtDate(c.renewal, { year: true })} sub={`in ${daysUntil(c.renewal)} days`} />
            <Stat label="Origin" value={c.fromInstall ? `Install ${c.fromInstall}` : 'Direct contract'} />
          </div>

          <div>
            <div className="mb-2 text-[13px] font-semibold text-ink">Building asset register</div>
            <Table>
              <thead>
                <tr>
                  <Th>Building</Th>
                  <Th align="right">Outlets</Th>
                  <Th align="right">Gratings</Th>
                  <Th align="right">Gutters</Th>
                  <Th align="right">Pipe runs</Th>
                  <Th>System</Th>
                  <Th>Condition</Th>
                  <Th>Last inspected</Th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((b) => (
                  <Tr key={b.id}>
                    <Td className="max-w-[170px]">
                      <div className="truncate text-ink">{bShort(b.id)}</div>
                      <div className="text-[11px] text-ink-3">{b.id}</div>
                    </Td>
                    <Td align="right">{b.outlets}</Td>
                    <Td align="right">{b.gratings}</Td>
                    <Td align="right">{num(b.gutterM)} m</Td>
                    <Td align="right">{num(b.pipeRunM)} m</Td>
                    <Td className="whitespace-nowrap text-[12px]">{b.system}</Td>
                    <Td>
                      <Pill tone={conditionTone[b.condition]} dot>
                        {b.condition}
                      </Pill>
                    </Td>
                    <Td className="whitespace-nowrap">{fmtDate(b.lastInspection, { year: true })}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <div className="mb-2 text-[13px] font-semibold text-ink">Visits</div>
              <div className="space-y-1.5">
                {visits.map((v) => (
                  <div key={v.id} className="flex items-center gap-2 rounded-xl bg-sunk px-3 py-2 text-[12.5px]">
                    <span className={clsx('h-2 w-2 shrink-0 rounded-full', v.type === 'Emergency callout' ? 'bg-bad' : 'bg-brand')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">{v.type}</span>
                      <span className="block truncate text-[11.5px] text-ink-3">
                        {bShort(v.buildingId)} · {v.technician}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-ink-2">{fmtDate(v.date)}</span>
                      <span className="block text-[11px] text-ink-3">{v.status}</span>
                    </span>
                  </div>
                ))}
                {visits.length === 0 && <div className="text-[12.5px] text-ink-3">No visits in the last or next 60 days.</div>}
              </div>
            </div>
            <div>
              <div className="mb-2 text-[13px] font-semibold text-ink">Defects</div>
              <div className="space-y-1.5">
                {ds.map((d) => (
                  <div key={d.id} className="rounded-xl bg-sunk px-3 py-2 text-[12.5px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-ink">{d.title}</span>
                      <Pill tone={sevTone[d.severity]}>{d.severity}</Pill>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11.5px] text-ink-3">
                      <span className="truncate">
                        {d.id} · {bShort(d.buildingId)}
                      </span>
                      <span className="shrink-0">
                        {d.stage} · <Money amount={d.quoteValue} currency={c.currency} />
                      </span>
                    </div>
                  </div>
                ))}
                {ds.length === 0 && <div className="text-[12.5px] text-ink-3">No defects recorded on this contract.</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------- schedule calendar
/** Planned work is booked Monday to Friday: weekend dates in the seed roll to the nearest weekday. Callouts stay where they happened. */
function displayDate(v: MaintenanceVisit) {
  if (v.type === 'Emergency callout') return v.date;
  const dow = new Date(v.date + 'T00:00:00').getDay();
  return dow === 6 ? isoAdd(-1, v.date) : dow === 0 ? isoAdd(1, v.date) : v.date;
}
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function Schedule({ onOpen }: { onOpen: (id: string) => void }) {
  const [month, setMonth] = useState<'2026-10' | '2026-11'>('2026-10');
  const [day, setDay] = useState<string>(TODAY_ISO);
  const byDay = useMemo(() => {
    const m = new Map<string, MaintenanceVisit[]>();
    for (const v of MAINT_VISITS) {
      const d = displayDate(v);
      m.set(d, [...(m.get(d) ?? []), v]);
    }
    return m;
  }, []);
  const [y, mo] = month.split('-').map(Number);
  const first = new Date(y, mo - 1, 1);
  const daysIn = new Date(y, mo, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  while (cells.length % 7) cells.push(null);
  const monthVisits = MAINT_VISITS.filter((v) => displayDate(v).startsWith(month));
  const callouts = monthVisits.filter((v) => v.type === 'Emergency callout').length;
  const selected = (byDay.get(day) ?? []).slice().sort((a, b) => Number(b.type === 'Emergency callout') - Number(a.type === 'Emergency callout'));

  return (
    <Card>
      <CardHeader
        title="Planned preventative schedule"
        subtitle={`${monthVisits.length} visits in ${month === '2026-10' ? 'October' : 'November'} · ${callouts} emergency ${callouts === 1 ? 'callout' : 'callouts'}`}
        icon={<CalendarDays size={15} />}
        action={
          <Segmented
            size="sm"
            value={month}
            onChange={(m) => {
              setMonth(m);
              setDay(m === '2026-10' ? TODAY_ISO : '2026-11-02');
            }}
            options={[
              { value: '2026-10', label: 'October' },
              { value: '2026-11', label: 'November' },
            ]}
          />
        }
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <div className="grid grid-cols-7 gap-1.5">
            {WD.map((d) => (
              <div key={d} className="px-1 pb-1 text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">
                {d}
              </div>
            ))}
            {cells.map((c, i) => {
              if (!c) return <div key={`e${i}`} className="h-[84px] rounded-xl" />;
              const vs = byDay.get(c) ?? [];
              const isToday = c === TODAY_ISO;
              const sel = c === day;
              return (
                <button
                  key={c}
                  onClick={() => setDay(c)}
                  className={clsx('flex h-[84px] flex-col overflow-hidden rounded-xl p-1.5 text-left transition', sel ? 'bg-brand-soft ring-1 ring-[var(--c-brand)]' : 'bg-sunk hover:brightness-95')}
                >
                  <span className={clsx('mb-1 grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold', isToday ? 'bg-brand text-white dark:text-[#06101e]' : 'text-ink-2')}>{Number(c.slice(8))}</span>
                  {vs.slice(0, 2).map((v) => (
                    <span
                      key={v.id}
                      className={clsx('mb-0.5 truncate rounded-md px-1 py-[1px] text-[10.5px] font-medium', v.type === 'Emergency callout' ? 'bg-bad-soft text-bad' : v.type === 'Annual inspection' ? 'bg-brand-soft text-brand-2' : 'bg-brand-soft text-brand')}
                    >
                      {contractById.get(v.contractId)?.site.split(',')[0]}
                    </span>
                  ))}
                  {vs.length > 2 && <span className="text-[10.5px] text-ink-3">+{vs.length - 2} more</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand" /> Planned preventative
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-2" /> Annual inspection
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-bad" /> Emergency callout
            </span>
          </div>
        </div>
        <div className="xl:col-span-4">
          <div className="mb-2 text-[13px] font-semibold text-ink">{fmtDate(day, { weekday: true, year: true })}</div>
          <div className="space-y-1.5">
            {selected.map((v) => {
              const c = contractById.get(v.contractId)!;
              return (
                <button key={v.id} onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 rounded-xl bg-sunk px-3 py-2 text-left transition hover:brightness-95">
                  <span className={clsx('h-8 w-1 shrink-0 rounded-full', v.type === 'Emergency callout' ? 'bg-bad' : v.type === 'Annual inspection' ? 'bg-brand-2' : 'bg-brand')} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{buildingById.get(v.buildingId)?.name}</span>
                    <span className="block truncate text-[11.5px] text-ink-3">
                      {v.type} · {v.technician}
                    </span>
                  </span>
                  <Pill tone={v.status === 'Scheduled' ? 'brand' : v.status === 'In progress' ? 'warn' : 'ok'}>{v.status}</Pill>
                </button>
              );
            })}
            {selected.length === 0 && <div className="rounded-xl border border-dashed hairline px-3 py-6 text-center text-[12.5px] text-ink-3">No visits booked this day.</div>}
          </div>
          <Note className="mt-3">Visits are booked by the Maintenance Agent from each contract’s frequency and the technicians’ routes.</Note>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- inspection reports
function InspectionReports({ onOpen }: { onOpen: (id: string) => void }) {
  const defects = useStore((s) => s.defects);
  const reports = useMemo(() => {
    const issued = MAINT_VISITS.filter((v) => v.status === 'Report issued' && v.type !== 'Emergency callout').sort((a, b) => b.date.localeCompare(a.date));
    const withDefects = issued.filter((v) => defects.some((d) => d.buildingId === v.buildingId));
    const nch = MAINT_VISITS.filter((v) => v.contractId === 'MC-501' && (v.status === 'Report issued' || v.status === 'Completed')).sort((a, b) => b.date.localeCompare(a.date))[0];
    const seen = new Set<string>();
    return [...(nch ? [nch] : []), ...withDefects, ...issued].filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true))).slice(0, 3);
  }, [defects]);
  return (
    <Card>
      <CardHeader title="Inspection reports" subtitle="Issued by the maintenance technicians from the app, with photos and defects found" icon={<ClipboardCheck size={15} />} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {reports.map((v, i) => {
          const c = contractById.get(v.contractId)!;
          const b = buildingById.get(v.buildingId)!;
          const ds = defects.filter((d) => d.buildingId === v.buildingId);
          return (
            <div key={v.id} className="flex flex-col rounded-2xl bg-sunk p-3.5">
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((k) => (
                  <PhotoPlaceholder key={k} seed={`p${i * 3 + k + 1}`} className="h-[74px]" label={k === 0 ? 'Outlet' : k === 1 ? 'Gutter' : 'Pipe run'} />
                ))}
              </div>
              <div className="mt-3 min-w-0">
                <div className="truncate text-[13.5px] font-semibold text-ink">{b.name}</div>
                <div className="truncate text-[11.5px] text-ink-3">
                  {v.type} · {fmtDate(v.date)} · {v.technician}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
                <Pill tone={conditionTone[b.condition]} dot>
                  {b.condition}
                </Pill>
                <Pill>{b.outlets} outlets checked</Pill>
                <Pill>{num(b.gutterM)} m gutter</Pill>
              </div>
              <div className="mt-3 flex-1 space-y-1">
                {ds.slice(0, 3).map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-[12px]">
                    <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', d.severity === 'High' ? 'bg-bad' : d.severity === 'Medium' ? 'bg-warn' : 'bg-ink-3')} />
                    <span className="truncate text-ink-2">{d.title}</span>
                  </div>
                ))}
                {ds.length === 0 && <div className="text-[12px] text-ok">No defects found. System clear and flowing.</div>}
              </div>
              <Button size="sm" className="mt-3 self-start" onClick={() => onOpen(c.id)}>
                Open {c.id}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- defect kanban + quote agent
function quoteLines(d: Defect) {
  const v = d.quoteValue;
  const access = v >= 1000 ? Math.round((v * 0.2) / 10) * 10 : 0;
  const labourHours = Math.max(2, Math.round((v * 0.45) / 68));
  const labour = labourHours * 68;
  const disposal = Math.round((v * 0.04) / 5) * 5;
  const materials = v - access - labour - disposal;
  return [
    { label: `Labour: 2 technicians, ${labourHours} hours at contract rate`, amount: labour },
    ...(access > 0 ? [{ label: 'Access: MEWP hire incl. delivery and operator', amount: access }] : []),
    { label: 'Materials: replacement parts to match installed system', amount: materials },
    { label: 'Waste removal and site clean-up', amount: disposal },
  ];
}

function DefectKanban() {
  const defects = useStore((s) => s.defects);
  const advanceDefect = useStore((s) => s.advanceDefect);
  const toast = useStore((s) => s.toast);
  const pushLog = useStore((s) => s.pushLog);
  const [quoteFor, setQuoteFor] = useState<string | null>(null);
  const qd = defects.find((d) => d.id === quoteFor);

  const advance = (d: Defect) => {
    const next = STAGES[Math.min(STAGES.length - 1, STAGES.indexOf(d.stage) + 1)];
    advanceDefect(d.id);
    pushLog({ agent: 'maintenance', text: `${d.id} moved to ${next}: ${d.title}, ${contractById.get(d.contractId)?.site}` });
    toast({ title: `${d.id} moved to ${next}`, detail: d.title, tone: 'success' });
  };

  return (
    <Card>
      <CardHeader title="Defect to quote to repair" subtitle="Every defect found on an inspection becomes a quote. Maintenance Agent drafts it, Robert approves." icon={<Wrench size={15} />} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STAGES.map((stage) => {
          const list = defects.filter((d) => d.stage === stage);
          const value = list.reduce((a, d) => a + toEur(d.quoteValue, contractById.get(d.contractId)?.currency ?? 'EUR'), 0);
          return (
            <div key={stage} className="flex min-w-0 flex-col rounded-2xl bg-sunk p-2.5">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[12.5px] font-semibold text-ink">{stage}</span>
                <span className="text-[11.5px] text-ink-3">
                  {list.length} · {eur(value)}
                </span>
              </div>
              <div className="scroll-thin max-h-[440px] space-y-2 overflow-y-auto pr-0.5">
                {list.map((d) => {
                  const c = contractById.get(d.contractId)!;
                  return (
                    <motion.div layout key={d.id} className="glass-strong rounded-xl p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[12.5px] font-medium leading-snug text-ink">{d.title}</span>
                        <Pill tone={sevTone[d.severity]} className="!px-2 !text-[10.5px]">
                          {d.severity}
                        </Pill>
                      </div>
                      <div className="mt-1 truncate text-[11.5px] text-ink-3">{c.site}</div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <Money amount={d.quoteValue} currency={c.currency} className="text-[12.5px] font-semibold text-ink" />
                        {stage === 'Defect found' ? (
                          <Button size="sm" variant="primary" className="!h-7 !px-2.5 !text-[11.5px]" icon={<Sparkles size={12} />} onClick={() => setQuoteFor(d.id)}>
                            Draft quote
                          </Button>
                        ) : stage !== 'Complete' ? (
                          <Button size="sm" className="!h-7 !px-2.5 !text-[11.5px]" icon={<ArrowRight size={12} />} onClick={() => advance(d)}>
                            Advance
                          </Button>
                        ) : (
                          <span className="flex items-center gap-1 text-[11.5px] text-ok">
                            <Check size={12} /> Closed
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {list.length === 0 && <div className="rounded-xl border border-dashed hairline px-2 py-5 text-center text-[11.5px] text-ink-3">Nothing here</div>}
              </div>
            </div>
          );
        })}
      </div>
      {createPortal(
        <Modal open={!!qd} onClose={() => setQuoteFor(null)} width={620} title={qd ? `Quote for ${qd.id}` : ''} subtitle={qd ? `${contractById.get(qd.contractId)?.site} · ${bShort(qd.buildingId)}` : ''}>
          {qd && (
            <QuoteDraft
              key={qd.id}
              defect={qd}
              contract={contractById.get(qd.contractId)!}
              onApprove={() => {
                advanceDefect(qd.id);
                pushLog({ agent: 'maintenance', text: `Quote for ${qd.id} approved and sent to ${contractById.get(qd.contractId)?.client}: ${qd.title}` });
                toast({ title: 'Quote sent', detail: `${qd.id} to ${contractById.get(qd.contractId)?.client}. Moved to Quote raised.`, tone: 'success' });
                setQuoteFor(null);
              }}
            />
          )}
        </Modal>,
        document.body,
      )}
    </Card>
  );
}

function QuoteDraft({ defect, contract, onApprove }: { defect: Defect; contract: MaintenanceContract; onApprove: () => void }) {
  const [ready, setReady] = useState(false);
  useInterval(() => setReady(true), ready ? null : 1300);
  const lines = quoteLines(defect);
  return (
    <div>
      <div className="flex items-center gap-2 rounded-2xl bg-sunk px-4 py-3 text-[12.5px] text-ink-2">
        {ready ? <Check size={14} className="text-ok" /> : <Loader2 size={14} className="animate-spin text-brand" />}
        {ready ? 'Maintenance Agent drafted this from the inspection photos, the asset register and the contract schedule of rates.' : 'Maintenance Agent is reading the inspection report and contract rates…'}
      </div>
      {ready && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className="mb-3 flex gap-3">
            <PhotoPlaceholder seed={`p${defect.id.slice(-1)}`} className="h-[80px] w-[120px] shrink-0" label="From inspection" />
            <div className="min-w-0 text-[12.5px]">
              <div className="text-[14px] font-semibold text-ink">{defect.title}</div>
              <div className="mt-0.5 text-ink-3">
                Found {fmtDate(defect.found, { year: true })} · severity {defect.severity.toLowerCase()} · {contract.standard}
              </div>
              <div className="mt-1 text-ink-2">Repair to restore design flow capacity. Works within normal hours, permit to work by client.</div>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border hairline">
            {lines.map((l) => (
              <div key={l.label} className="flex items-center justify-between gap-3 border-b hairline px-4 py-2 text-[13px]">
                <span className="text-ink-2">{l.label}</span>
                <Money amount={l.amount} currency={contract.currency} className="text-ink" />
              </div>
            ))}
            <div className="flex items-center justify-between bg-brand-soft px-4 py-2.5 text-[14px] font-semibold text-ink">
              <span>Total (ex VAT)</span>
              <Money amount={defect.quoteValue} currency={contract.currency} className="text-brand" />
            </div>
          </div>
          <Note className="mt-2">Within the contract schedule of rates. Valid 30 days.</Note>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="primary" icon={<Check size={14} />} onClick={onApprove}>
              Approve and send quote
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
