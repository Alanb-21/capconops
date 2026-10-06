import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BadgeCheck, CheckCircle2, CircleDashed, ClipboardList, CloudRain, Download, Factory, HardHat, Leaf, Recycle, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, CardHeader, Kpi, Note, PageHeader, Pill, Segmented, Stat, Table, Td, Th, Tr, clsx, type Tone } from '../components/ui';
import { CHART, ChartTooltip, axisProps } from '../components/charts';
import { useStore } from '../store/useStore';
import { HS_ITEMS, NCRS, RAMS } from '../data/seed';
import { installed, nearMisses30 } from '../data/metrics';
import type { HsItem, Job, Material, RamsRecord, Sector, Spool } from '../data/types';
import { num } from '../lib/format';
import { TODAY_ISO, WEEK_START, daysBetween, daysUntil, fmtDate, isoAdd } from '../lib/dates';

// ---------------------------------------------------------------- sustainability derivations
/** Indicative cradle-to-site factors, kgCO2e per metre installed incl. fittings, brackets and transport. */
const CARBON_FACTOR: Record<Material, number> = {
  HDPE: 6,
  PVC: 5,
  Aluminium: 18,
  'Stainless steel': 15,
  'Cast iron': 22,
};
const RAINFALL_M = 0.8; // ~800 mm annual rainfall
const RUNOFF = 0.9;
const HARVEST_SECTORS: Sector[] = ['Warehouse', 'Data Centre', 'Education', 'Commercial'];
/** Offcut waste: ~9% when cut on site vs ~2% cut and fused in the prefab shop. */
const PREFAB_WASTE_SAVING = 0.07;
const PREFAB_SHARE = 0.6;
const HDPE_KG_PER_M = 1.9; // average across 56 to 315 mm
const compactM3 = (v: number) => (v >= 10_000 ? `${num(v / 1000)}k m³` : `${num(v)} m³`);

const isHarvesting = (j: Job) => !j.designOnly && (j.region === 'IE' || j.region === 'UK') && HARVEST_SECTORS.includes(j.sector) && parseInt(j.id.slice(3), 10) % 3 === 0;
const harvestM3 = (j: Job) => j.roofArea * RAINFALL_M * RUNOFF;
const jobCarbonKg = (j: Job) => installed(j) * CARBON_FACTOR[j.material];

function sustainability(jobs: Job[], spools: Spool[]) {
  const carbon = jobs
    .filter((j) => !j.designOnly && installed(j) > 0)
    .map((j) => ({ job: j, kg: jobCarbonKg(j), m: installed(j) }))
    .sort((a, b) => b.kg - a.kg);
  const totalKg = carbon.reduce((a, c) => a + c.kg, 0);
  const totalM = carbon.reduce((a, c) => a + c.m, 0);
  // ~60% of HDPE installed is cut and fused off site; the live spool schedule shows what is in the shop now
  const hdpeInstalled = jobs.filter((j) => j.material === 'HDPE' && !j.designOnly).reduce((a, j) => a + installed(j), 0);
  const prefabM = hdpeInstalled * PREFAB_SHARE;
  const prefabKg = prefabM * HDPE_KG_PER_M;
  const wasteSavedKg = prefabKg * PREFAB_WASTE_SAVING;
  const inShopM = spools.filter((s) => s.stage !== 'On site').reduce((a, s) => a + s.length, 0);
  const harvest = jobs.filter(isHarvesting).map((j) => ({ job: j, m3: harvestM3(j) })).sort((a, b) => b.m3 - a.m3);
  const harvestTotal = harvest.reduce((a, h) => a + h.m3, 0);
  return { carbon, totalKg, totalM, intensity: totalM > 0 ? totalKg / totalM : 0, prefabM, prefabKg, wasteSavedKg, inShopM, harvest, harvestTotal };
}

const CERTS: { name: string; scope: string; label: string; tone: Tone }[] = [
  { name: 'ISO 9001', scope: 'Quality management', label: 'Certified', tone: 'ok' },
  { name: 'ISO 14001', scope: 'Environmental management', label: 'Certified', tone: 'ok' },
  { name: 'ISO 45001', scope: 'Occupational health and safety', label: 'Certified', tone: 'ok' },
  { name: 'EcoVadis', scope: 'Sustainability rating', label: 'Rated', tone: 'brand' },
];

const ECOVADIS: { theme: string; item: string; source: string; ready: boolean }[] = [
  { theme: 'Environment', item: 'ISO 14001 certificate and surveillance audit report', source: 'Document register', ready: true },
  { theme: 'Environment', item: 'Embodied carbon per job (indicative factors)', source: 'Capcon OS, this page', ready: true },
  { theme: 'Environment', item: 'Waste records and prefabrication offcut savings', source: 'Prefab shop log', ready: true },
  { theme: 'Environment', item: 'Scope 1 and 2 fuel and electricity data, 2026', source: 'Fleet cards and utility bills', ready: false },
  { theme: 'Labour & human rights', item: 'ISO 45001 certificate, incident and near-miss statistics', source: 'Capcon OS HSQE', ready: true },
  { theme: 'Labour & human rights', item: 'Training and ticket records for all technicians', source: 'Crews & tickets', ready: true },
  { theme: 'Ethics', item: 'Anti-bribery and whistleblowing policies, signed by MD', source: 'Policy register', ready: true },
  { theme: 'Sustainable procurement', item: 'Supplier code of conduct and pipe manufacturer EPDs', source: 'Purchasing', ready: false },
];

// ---------------------------------------------------------------- page
export default function Hsqe() {
  const jobs = useStore((s) => s.jobs);
  const spools = useStore((s) => s.spools);
  const toast = useStore((s) => s.toast);
  const jobById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const sus = useMemo(() => sustainability(jobs, spools), [jobs, spools]);

  const incidents12m = HS_ITEMS.filter((h) => h.type === 'Incident').length;
  const ramsApproved = RAMS.filter((r) => r.status === 'Approved').length;
  const permits = RAMS.reduce((a, r) => a + r.permits, 0);
  const toolbox14 = HS_ITEMS.filter((h) => h.type === 'Toolbox talk' && daysUntil(h.date) >= -14).length;
  const audits30 = HS_ITEMS.filter((h) => h.type === 'Audit' && daysUntil(h.date) >= -30).length;
  const openNcrs = NCRS.filter((n) => n.status === 'Open').length;

  const exportEsg = () => {
    const html = buildEsgHtml({ sus, incidents12m, nearMisses: nearMisses30(), ramsApproved, ramsTotal: RAMS.length, toolbox14, audits30, openNcrs, closedNcrs: NCRS.length - openNcrs });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Capcon-ESG-summary-Oct-2026.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ title: 'ESG summary exported', detail: 'Capcon-ESG-summary-Oct-2026.html downloaded. Ready for EcoVadis and client questionnaires.', tone: 'success' });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Julia Cavanaugh · Sustainability and Technical Design Engineer"
        title="HSQE & Sustainability"
        subtitle="ISO 45001, 9001 and 14001 evidence collected as the work happens, plus the carbon and water story clients and EcoVadis ask for."
        actions={
          <Button variant="primary" icon={<Download size={15} />} onClick={exportEsg}>
            Export ESG summary
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CERTS.map((c) => (
          <Card key={c.name} className="flex items-center gap-3 !p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{c.name === 'EcoVadis' ? <Leaf size={19} /> : <Award size={19} />}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-ink">{c.name}</div>
              <div className="truncate text-[12px] text-ink-3">{c.scope}</div>
            </div>
            <Pill tone={c.tone} dot>
              {c.label}
            </Pill>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Near misses, 30 days" value={nearMisses30()} sub="Reported from the technician app" icon={<TriangleAlert size={15} />} />
        <Kpi label="Incidents, 12 months" value={incidents12m} sub="All first aid only, no lost time" icon={<HardHat size={15} />} delay={0.04} />
        <Kpi label="RAMS approved" value={ramsApproved} sub={`of ${RAMS.length} live sites`} icon={<ClipboardList size={15} />} delay={0.08} />
        <Kpi label="Live permits" value={permits} sub="Hot works, roof access, MEWP" icon={<ShieldCheck size={15} />} delay={0.12} />
        <Kpi label="Embodied carbon installed" value={sus.totalKg / 1000} format={(v) => `${num(v)} t`} sub={`${num(sus.intensity, 1)} kgCO2e per metre`} icon={<Factory size={15} />} delay={0.16} />
        <Kpi label="Rainwater harvest designed" value={sus.harvestTotal} format={compactM3} sub={`per year across ${sus.harvest.length} jobs`} icon={<CloudRain size={15} />} delay={0.2} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SafetyTrend toolbox14={toolbox14} audits30={audits30} permits={permits} />
        </div>
        <div className="xl:col-span-5">
          <HsList jobById={jobById} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <RamsTable jobById={jobById} />
        </div>
        <div className="xl:col-span-5">
          <NcrList jobById={jobById} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <CarbonCard sus={sus} />
        </div>
        <div className="flex flex-col gap-5 xl:col-span-5">
          <WasteCard sus={sus} />
          <HarvestCard sus={sus} />
        </div>
      </div>

      <div className="mt-5">
        <EcoVadisCard onExport={exportEsg} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- safety
function SafetyTrend({ toolbox14, audits30, permits }: { toolbox14: number; audits30: number; permits: number }) {
  const data = useMemo(() => {
    const weeks = Array.from({ length: 12 }, (_, i) => {
      const start = isoAdd(-7 * (11 - i), WEEK_START);
      const d = new Date(start + 'T00:00:00');
      return { start, week: `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`, nearMiss: 0, incident: 0 };
    });
    for (const h of HS_ITEMS) {
      const w = Math.floor(daysBetween(weeks[0].start, h.date) / 7);
      if (w < 0 || w > 11) continue;
      if (h.type === 'Near miss') weeks[w].nearMiss++;
      if (h.type === 'Incident') weeks[w].incident++;
    }
    return weeks;
  }, []);
  return (
    <Card className="h-full">
      <CardHeader title="ISO 45001: incidents and near misses" subtitle="Weekly, last 12 weeks. Near-miss reporting jumped once it moved into the technician app: a healthy sign." icon={<HardHat size={15} />} />
      <div className="mb-3 grid grid-cols-3 gap-4">
        <Stat label="Toolbox talks, 14 days" value={toolbox14} />
        <Stat label="Audits, 30 days" value={audits30} />
        <Stat label="Permits issued, live" value={permits} />
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="week" {...axisProps} interval={1} />
            <YAxis {...axisProps} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={<ChartTooltip labelFormat={(l) => `Week of ${l}`} />} />
            <Bar dataKey="nearMiss" name="Near misses" stackId="s" fill={CHART.warn} barSize={22} />
            <Bar dataKey="incident" name="Incidents (first aid)" stackId="s" fill={CHART.bad} radius={[6, 6, 0, 0]} barSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

type HsFilter = 'all' | HsItem['type'];
function HsList({ jobById }: { jobById: Map<string, Job> }) {
  const [f, setF] = useState<HsFilter>('all');
  const navigate = useNavigate();
  const items = HS_ITEMS.filter((h) => (f === 'all' ? h.type !== 'Toolbox talk' : h.type === f)).sort((a, b) => Number(b.status === 'Open') - Number(a.status === 'Open') || b.date.localeCompare(a.date));
  return (
    <Card className="h-full">
      <CardHeader
        title="Safety log"
        subtitle={`${HS_ITEMS.filter((h) => h.status === 'Open').length} open items`}
        action={
          <Segmented<HsFilter>
            size="sm"
            value={f}
            onChange={setF}
            options={[
              { value: 'all', label: 'All' },
              { value: 'Near miss', label: 'Near misses' },
              { value: 'Incident', label: 'Incidents' },
              { value: 'Audit', label: 'Audits' },
              { value: 'Toolbox talk', label: 'Toolbox' },
            ]}
          />
        }
      />
      <div className="scroll-thin max-h-[330px] space-y-1.5 overflow-y-auto pr-1">
        {items.map((h) => {
          const j = jobById.get(h.jobId);
          return (
            <button key={h.id} onClick={() => j && navigate(`/projects/${j.id}`)} className="flex w-full items-center gap-3 rounded-xl bg-sunk px-3 py-2 text-left transition hover:brightness-95">
              <span className={clsx('h-2 w-2 shrink-0 rounded-full', h.type === 'Incident' ? 'bg-bad' : h.type === 'Near miss' ? 'bg-warn' : 'bg-brand')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-ink">{h.title}</span>
                <span className="block truncate text-[11.5px] text-ink-3">
                  {h.type} · {j?.name} · {fmtDate(h.date)}
                </span>
              </span>
              <Pill tone={h.status === 'Open' ? 'warn' : 'neutral'}>{h.status}</Pill>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

const ramsTone: Record<RamsRecord['status'], Tone> = { Approved: 'ok', Submitted: 'brand', 'Revision required': 'warn', Missing: 'bad' };
function RamsTable({ jobById }: { jobById: Map<string, Job> }) {
  const navigate = useNavigate();
  const order: RamsRecord['status'][] = ['Missing', 'Revision required', 'Submitted', 'Approved'];
  const rows = [...RAMS].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.permits - a.permits);
  return (
    <Card className="h-full">
      <CardHeader title="RAMS and permits by site" subtitle="Method statements, revision and live permits on every active site" icon={<ClipboardList size={15} />} />
      <Table className="max-h-[520px] overflow-y-auto">
        <thead>
          <tr>
            <Th>Site</Th>
            <Th>RAMS</Th>
            <Th align="center">Rev</Th>
            <Th>Reviewed</Th>
            <Th align="right">Permits</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const j = jobById.get(r.jobId);
            return (
              <Tr key={r.jobId} onClick={() => navigate(`/projects/${r.jobId}`)}>
                <Td className="max-w-[280px]">
                  <div className="truncate text-ink">{j?.name}</div>
                  <div className="truncate text-[11.5px] text-ink-3">
                    {r.jobId} · {j?.sector}
                    {r.jobId === 'CE-2340' ? ' · revised sequence after roof deck delay' : ''}
                  </div>
                </Td>
                <Td>
                  <Pill tone={ramsTone[r.status]} dot>
                    {r.status}
                  </Pill>
                </Td>
                <Td align="center">{r.rev}</Td>
                <Td className="whitespace-nowrap">{fmtDate(r.reviewed)}</Td>
                <Td align="right">{r.permits}</Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}

function NcrList({ jobById }: { jobById: Map<string, Job> }) {
  const open = NCRS.filter((n) => n.status === 'Open');
  const rows = [...NCRS].sort((a, b) => Number(b.status === 'Open') - Number(a.status === 'Open') || b.raised.localeCompare(a.raised));
  return (
    <Card className="h-full">
      <CardHeader title="ISO 9001: non-conformances" subtitle="Raised on site or in prefab, closed with evidence" icon={<BadgeCheck size={15} />} />
      <div className="mb-3 grid grid-cols-3 gap-4">
        <Stat label="Open" value={open.length} />
        <Stat label="Closed" value={NCRS.length - open.length} />
        <Stat label="Oldest open" value={open.length ? `${Math.max(...open.map((n) => -daysUntil(n.raised)))} days` : 'None'} />
      </div>
      <div className="space-y-1.5">
        {rows.map((n) => (
          <div key={n.id} className="flex items-center gap-3 rounded-xl bg-sunk px-3 py-2">
            <span className="w-[62px] shrink-0 text-[12px] font-medium text-ink-2">{n.id}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-ink">{n.title}</span>
              <span className="block truncate text-[11.5px] text-ink-3">
                {jobById.get(n.jobId)?.name} · clause {n.clause} · {fmtDate(n.raised)}
              </span>
            </span>
            <Pill tone={n.status === 'Open' ? 'warn' : 'ok'} dot>
              {n.status}
            </Pill>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- sustainability
type Sus = ReturnType<typeof sustainability>;

function CarbonCard({ sus }: { sus: Sus }) {
  const data = sus.carbon.slice(0, 10).map((c) => ({ name: c.job.name.length > 26 ? c.job.name.slice(0, 25).trimEnd() + '…' : c.job.name, t: Math.round(c.kg / 100) / 10, m: c.m, material: c.job.material }));
  return (
    <Card className="h-full">
      <CardHeader title="ISO 14001: embodied carbon per job" subtitle="Installed metres × material factor, tonnes CO2e. Top 10 jobs." icon={<Leaf size={15} />} />
      <div className="mb-3 grid grid-cols-3 gap-4">
        <Stat label="Installed to date" value={`${num(sus.totalKg / 1000)} tCO2e`} />
        <Stat label="Metres installed" value={`${num(sus.totalM)} m`} />
        <Stat label="Average intensity" value={`${num(sus.intensity, 1)} kg/m`} />
      </div>
      <div className="h-[380px]">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={CHART.grid} />
            <XAxis type="number" {...axisProps} tickFormatter={(v) => `${v} t`} />
            <YAxis type="category" dataKey="name" {...axisProps} width={178} interval={0} tick={<OneLineTick />} />
            <Tooltip cursor={{ fill: 'var(--c-surface-sunk)' }} content={<ChartTooltip format={(v) => `${v.toLocaleString('en-IE')} tCO2e`} />} />
            <Bar dataKey="t" name="Embodied carbon" fill={CHART.brand2} radius={[0, 8, 8, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Note className="mt-2">
        Methodology: indicative factors, kgCO2e per metre installed incl. fittings, brackets and transport: HDPE 6, PVC 5, stainless 15, aluminium 18, cast iron 22. Replace with manufacturer EPD values for formal reporting.
      </Note>
    </Card>
  );
}

function OneLineTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text x={x - 6} y={y} dy={4} textAnchor="end" fontSize={11} fill="var(--c-ink-3)">
      {payload?.value}
    </text>
  );
}

function WasteCard({ sus }: { sus: Sus }) {
  return (
    <Card>
      <CardHeader title="Waste saved through prefabrication" subtitle="HDPE spools cut and fused in the prefab shop instead of on the roof" icon={<Recycle size={15} />} />
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Prefabricated to date" value={`${num(sus.prefabM)} m`} sub={`${num(sus.inShopM)} m in the shop now`} />
        <Stat label="Offcut avoided" value={`${num(sus.wasteSavedKg / 1000, 1)} t`} sub="9% site vs 2% shop" />
        <Stat label="Carbon avoided" value={`${num((sus.wasteSavedKg * 2.0) / 1000, 1)} tCO2e`} sub="at ~2 kgCO2e/kg HDPE" />
      </div>
      <Note className="mt-3">Assumes ~60% of HDPE installed is prefabricated, at ~1.9 kg/m. Shop offcuts are segregated for regrind.</Note>
    </Card>
  );
}

function HarvestCard({ sus }: { sus: Sus }) {
  const navigate = useNavigate();
  return (
    <Card className="flex-1">
      <CardHeader title="Rainwater harvesting designed" subtitle="Roof area × ~800 mm annual rainfall × 0.9 runoff" icon={<CloudRain size={15} />} />
      <div className="space-y-1.5">
        {sus.harvest.slice(0, 5).map((h) => (
          <button key={h.job.id} onClick={() => navigate(`/projects/${h.job.id}`)} className="flex w-full items-center gap-3 rounded-xl bg-sunk px-3 py-2 text-left transition hover:brightness-95">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-ink">{h.job.name}</span>
              <span className="block truncate text-[11.5px] text-ink-3">{num(h.job.roofArea)} m² roof · {h.job.sector}</span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-ink tnum">{num(h.m3)} m³/yr</span>
          </button>
        ))}
      </div>
      <Note className="mt-3">
        {sus.harvest.length} jobs with harvesting outlets, {num(sus.harvestTotal)} m³ a year of potable water offset.
      </Note>
    </Card>
  );
}

function EcoVadisCard({ onExport }: { onExport: () => void }) {
  const ready = ECOVADIS.filter((e) => e.ready).length;
  return (
    <Card>
      <CardHeader
        title="EcoVadis evidence checklist"
        subtitle={`${ready} of ${ECOVADIS.length} evidence items ready for the next submission`}
        icon={<Leaf size={15} />}
        action={
          <Button size="sm" icon={<Download size={13} />} onClick={onExport}>
            Export ESG summary
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {ECOVADIS.map((e) => (
          <div key={e.item} className="flex items-center gap-3 rounded-xl bg-sunk px-3 py-2.5">
            {e.ready ? <CheckCircle2 size={17} className="shrink-0 text-ok" /> : <CircleDashed size={17} className="shrink-0 text-warn" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-ink">{e.item}</span>
              <span className="block truncate text-[11.5px] text-ink-3">
                {e.theme} · {e.source}
              </span>
            </span>
            <Pill tone={e.ready ? 'ok' : 'warn'}>{e.ready ? 'Ready' : 'To collect'}</Pill>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- ESG export
function buildEsgHtml(p: {
  sus: Sus;
  incidents12m: number;
  nearMisses: number;
  ramsApproved: number;
  ramsTotal: number;
  toolbox14: number;
  audits30: number;
  openNcrs: number;
  closedNcrs: number;
}) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const row = (k: string, v: string) => `<tr><td>${esc(k)}</td><td class="n">${esc(v)}</td></tr>`;
  const carbonRows = p.sus.carbon
    .slice(0, 10)
    .map((c) => `<tr><td>${esc(c.job.name)}</td><td>${esc(c.job.material)}</td><td class="n">${num(c.m)} m</td><td class="n">${num(c.kg / 1000, 1)} t</td></tr>`)
    .join('');
  const harvestRows = p.sus.harvest.map((h) => `<tr><td>${esc(h.job.name)}</td><td class="n">${num(h.job.roofArea)} m²</td><td class="n">${num(h.m3)} m³</td></tr>`).join('');
  const eco = ECOVADIS.map((e) => `<tr><td>${esc(e.theme)}</td><td>${esc(e.item)}</td><td>${e.ready ? 'Ready' : 'To collect'}</td></tr>`).join('');
  return `<!doctype html><html lang="en-IE"><head><meta charset="utf-8"><title>Capcon Engineering ESG summary, October 2026</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;color:#0b1b2e;max-width:860px;margin:40px auto;padding:0 24px;line-height:1.5}
h1{font-size:26px;margin:0 0 4px;letter-spacing:-.02em}h2{font-size:16px;margin:32px 0 8px;color:#0d4f8b}
.sub{color:#6b7a8c;font-size:13px}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
td,th{padding:7px 8px;border-bottom:1px solid #e3e8ef;text-align:left}th{color:#6b7a8c;font-weight:500;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em}
.n{text-align:right;font-variant-numeric:tabular-nums}.badges span{display:inline-block;margin:4px 6px 0 0;padding:3px 10px;border-radius:99px;background:#e8f0f8;color:#0d4f8b;font-size:12px;font-weight:600}
.note{color:#6b7a8c;font-size:12px;margin-top:6px}
</style></head><body>
<h1>Capcon Engineering: ESG summary</h1>
<div class="sub">Siphonic and gravity rainwater drainage · Maynooth, Co. Kildare · Generated from Capcon OS on ${fmtDate(TODAY_ISO, { year: true })}</div>
<div class="badges"><span>ISO 9001 Certified</span><span>ISO 14001 Certified</span><span>ISO 45001 Certified</span><span>EcoVadis Rated</span></div>
<h2>Health and safety (ISO 45001)</h2><table>
${row('Incidents, last 12 months (first aid only, no lost time)', String(p.incidents12m))}
${row('Near misses reported, last 30 days', String(p.nearMisses))}
${row('Sites with approved RAMS', `${p.ramsApproved} of ${p.ramsTotal}`)}
${row('Toolbox talks, last 14 days', String(p.toolbox14))}
${row('Audits, last 30 days', String(p.audits30))}
</table>
<h2>Quality (ISO 9001)</h2><table>
${row('Non-conformances open', String(p.openNcrs))}
${row('Non-conformances closed', String(p.closedNcrs))}
</table>
<h2>Environment (ISO 14001)</h2><table>
${row('Embodied carbon, installed to date', `${num(p.sus.totalKg / 1000)} tCO2e`)}
${row('Metres installed', `${num(p.sus.totalM)} m`)}
${row('Average intensity', `${num(p.sus.intensity, 1)} kgCO2e/m`)}
${row('HDPE pipe prefabricated off site, to date (est.)', `${num(p.sus.prefabM)} m`)}
${row('Offcut waste avoided through prefabrication', `${num(p.sus.wasteSavedKg / 1000, 1)} t`)}
${row('Rainwater harvesting capacity designed', `${num(p.sus.harvestTotal)} m³ per year`)}
</table>
<h2>Embodied carbon, top 10 jobs</h2><table><tr><th>Job</th><th>Material</th><th class="n">Installed</th><th class="n">tCO2e</th></tr>${carbonRows}</table>
<p class="note">Indicative factors, kgCO2e per metre installed incl. fittings, brackets and transport: HDPE 6, PVC 5, stainless steel 15, aluminium 18, cast iron 22. To be replaced with manufacturer EPD values for formal reporting.</p>
<h2>Rainwater harvesting designed</h2><table><tr><th>Job</th><th class="n">Roof area</th><th class="n">Yield per year</th></tr>${harvestRows}</table>
<p class="note">Roof area × ~800 mm annual rainfall × 0.9 runoff coefficient.</p>
<h2>EcoVadis evidence</h2><table><tr><th>Theme</th><th>Evidence</th><th>Status</th></tr>${eco}</table>
<p class="note">Demo data. Prepared by Julia Cavanaugh, Sustainability and Technical Design Engineer.</p>
</body></html>`;
}
