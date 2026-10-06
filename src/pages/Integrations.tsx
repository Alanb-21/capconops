import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Box,
  Calculator,
  FileSpreadsheet,
  FileStack,
  FolderOpen,
  KeyRound,
  Landmark,
  LayoutGrid,
  Lock,
  Mail,
  MessageCircle,
  MessagesSquare,
  ScrollText,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, Drawer, LinkButton, Note, PageHeader, Pill, type Tone } from '../components/ui';
import { AGENT_ICONS } from '../components/agents/agentIcons';
import { AGENTS } from '../data/agents';

type Sync = 'Live' | 'Nightly' | 'On approval';

interface Tool {
  id: string;
  name: string;
  kind: string;
  icon: LucideIcon;
  sync: Sync;
  dataIn: string[];
  dataOut: string[];
  why: string;
  flow: { who: string; text: string }[];
}

const TOOLS: Tool[] = [
  {
    id: 'outlook',
    name: 'Microsoft 365 / Outlook',
    kind: 'Email and calendar',
    icon: Mail,
    sync: 'Live',
    dataIn: ['Emails to projects@ and site inboxes', 'Attachments: drawings, instructions, notices', 'Calendar invites for site meetings'],
    dataOut: ['Drafted replies, sent only on approval', 'Meeting actions filed to the job'],
    why: 'Most of the day’s information still arrives by email. The Inbox Agent reads it once, so nobody has to forward, rename and file it by hand.',
    flow: [
      { who: 'Outlook', text: 'Email arrives at projects@ from the main contractor: “Revised roof drainage drawings, Athenry”, 4 PDFs attached' },
      { who: 'Inbox Agent', text: 'Classifies it as a drawing issue and matches it to CE-2291 Dexcom campus, Athenry' },
      { who: 'Capcon OS', text: 'Files the 4 drawings at rev C2 to the Dexcom job, updates the drawing register and flags the change to Design' },
      { who: 'Stephen', text: 'Sees one line in his Design home: “4 drawings at rev C2 received for Dexcom”. Drafted acknowledgement waits for his approval' },
    ],
  },
  {
    id: 'sharepoint',
    name: 'SharePoint / OneDrive',
    kind: 'Documents',
    icon: FolderOpen,
    sync: 'Live',
    dataIn: ['Existing project folders', 'RAMS, method statements, certificates', 'O&M templates'],
    dataOut: ['Documents filed to the right job folder', 'Compiled handover packs (PDF)'],
    why: 'Your folders stay where they are. Capcon OS indexes them, so a job page shows its documents without moving a single file.',
    flow: [
      { who: 'SharePoint', text: 'Revised RAMS uploaded to the Ringaskiddy project folder' },
      { who: 'Compliance Agent', text: 'Reads it, checks the permit-to-work section and the operatives named' },
      { who: 'Capcon OS', text: 'Links it to CE-2321 and files it as ISO 45001 evidence' },
      { who: 'Julia', text: 'Evidence count for the audit goes up by one, no spreadsheet to update' },
    ],
  },
  {
    id: 'excel',
    name: 'Excel',
    kind: 'Existing trackers',
    icon: FileSpreadsheet,
    sync: 'Nightly',
    dataIn: ['Tender register', 'Valuation and cash trackers', 'Crew plans and ticket lists'],
    dataOut: ['Any table exported back to Excel'],
    why: 'The spreadsheets people trust keep working during the switch-over. They are read nightly until each one is retired, never ripped out on day one.',
    flow: [
      { who: 'Excel', text: 'Valuation tracker workbook in the Finance folder is updated by Valerie' },
      { who: 'Capcon OS', text: 'Reads it overnight and reconciles each line against the job’s installed metres' },
      { who: 'Valuation Agent', text: 'Flags any job where the tracker and site progress disagree' },
      { who: 'Valerie', text: 'Starts the morning with the differences, not the whole sheet' },
    ],
  },
  {
    id: 'teams',
    name: 'Teams',
    kind: 'Chat and approvals',
    icon: MessagesSquare,
    sync: 'Live',
    dataIn: ['Replies to approval cards', 'Mentions of job numbers'],
    dataOut: ['Approval cards to the right person', 'Alerts to channels (e.g. #operations)'],
    why: 'Approvals can be given where people already are. Approve in Teams on a phone and Capcon OS acts the same way.',
    flow: [
      { who: 'Scheduler Agent', text: 'Clonee has work ready Wednesday and no crew. Proposes moving IE Crew 8 Wed to Fri' },
      { who: 'Teams', text: 'Approval card appears for Donnacha in the Operations channel' },
      { who: 'Donnacha', text: 'Taps Approve on his phone between meetings' },
      { who: 'Capcon OS', text: 'Dispatch calendar updated, crew notified, decision written to the audit log' },
    ],
  },
  {
    id: 'sage',
    name: 'Sage',
    kind: 'Accounts',
    icon: Landmark,
    sync: 'On approval',
    dataIn: ['Invoices and payments received', 'Cost codes and supplier costs'],
    dataOut: ['Approved applications posted as sales invoices'],
    why: 'Accounts stay the book of record. Capcon OS only posts what Finance has approved, and reads back what was paid.',
    flow: [
      { who: 'Valuation Agent', text: 'Drafts the October application for Thurrock from installed metres and agreed variations' },
      { who: 'Valerie', text: 'Reviews and approves before the Thursday cut-off' },
      { who: 'Sage', text: 'Posted as a GBP sales invoice against the job’s cost code' },
      { who: 'Capcon OS', text: 'Outstanding applications and cash forecast update straight away' },
    ],
  },
  {
    id: 'xero',
    name: 'Xero',
    kind: 'Accounts (other entities)',
    icon: Calculator,
    sync: 'Nightly',
    dataIn: ['Bank feed payments', 'Invoices for overseas entities'],
    dataOut: ['Payment matches back to applications'],
    why: 'If an overseas office runs its own books, it can stay on them. Group figures still roll up in one place.',
    flow: [
      { who: 'Xero', text: 'Payment lands on the Singapore entity’s bank feed' },
      { who: 'Capcon OS', text: 'Matches it to the application on the right job overnight' },
      { who: 'Valuation Agent', text: 'Marks the application paid and updates debtor days' },
      { who: 'Valerie', text: 'Sees the group cash position in euro the next morning' },
    ],
  },
  {
    id: 'acc',
    name: 'Autodesk Revit / ACC',
    kind: 'Design, BIM and Construction Cloud',
    icon: Box,
    sync: 'Nightly',
    dataIn: ['Sheet revisions and issue status', 'Pipe and outlet schedules from the model'],
    dataOut: ['Design register status', 'Spool lists to prefabrication'],
    why: 'Design keeps working in Revit. Capcon OS reads what changed so prefab and site always build from the current revision.',
    flow: [
      { who: 'Construction Cloud', text: 'Stephen’s team issues roof drainage sheets at rev C3 for NLHPP' },
      { who: 'Capcon OS', text: 'Design register updated overnight, superseded revisions marked' },
      { who: 'Capcon OS', text: 'Prefab spools built from rev C2 are flagged for a check' },
      { who: 'Robert', text: 'Sees which spools are affected before anything leaves the shop' },
    ],
  },
  {
    id: 'procore',
    name: 'Procore',
    kind: 'Main contractor platform',
    icon: LayoutGrid,
    sync: 'On approval',
    dataIn: ['RFIs and responses', 'Drawings and programme updates'],
    dataOut: ['RFI responses and daily reports, on approval'],
    why: 'Where a main contractor runs the job in Procore, Capcon OS reads it instead of someone copying it across.',
    flow: [
      { who: 'Procore', text: 'An RFI about outlet setting-out is posted on a main contractor project' },
      { who: 'Inbox Agent', text: 'Links it to the job and starts the response clock' },
      { who: 'Stephen', text: 'Drafts the answer in Capcon OS and approves it' },
      { who: 'Procore', text: 'Response posted back, RFI closed in both places' },
    ],
  },
  {
    id: 'aconex',
    name: 'Aconex',
    kind: 'Document control',
    icon: FileStack,
    sync: 'Nightly',
    dataIn: ['Transmittals and document registers'],
    dataOut: ['Submittals prepared for approval'],
    why: 'Large projects often live in Aconex. Transmittals are read and filed automatically to the right job.',
    flow: [
      { who: 'Aconex', text: 'Transmittal with 4 drawings at rev C3 for NLHPP' },
      { who: 'Inbox Agent', text: 'Reads the transmittal and the register' },
      { who: 'Capcon OS', text: 'Drawing register for CE-2304 updated' },
      { who: 'Design', text: 'One notification, nothing re-keyed' },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    kind: 'Site groups',
    icon: MessageCircle,
    sync: 'Live',
    dataIn: ['Foremen’s photos and messages from site groups'],
    dataOut: ['Nudges when a site has gone quiet, on approval'],
    why: 'Foremen already send photos. The Site Progress Agent turns those into diary entries and % complete, so nobody rings round for status.',
    flow: [
      { who: 'WhatsApp', text: 'Barry McEvoy sends 2 photos and “Zone B collector done, 42 m today” to the Dexcom group' },
      { who: 'Site Progress Agent', text: 'Reads the photos and message, matches them to the Zone B collector run' },
      { who: 'Capcon OS', text: 'Diary entry written and installed metres updated on CE-2291' },
      { who: 'Donnacha', text: 'Command Centre shows Dexcom updated 08:24, no call needed' },
    ],
  },
  {
    id: 'powerbi',
    name: 'Power BI',
    kind: 'Reporting',
    icon: BarChart3,
    sync: 'Nightly',
    dataIn: ['Your existing report definitions, so figures match'],
    dataOut: ['Clean, reconciled datasets for existing reports'],
    why: 'If you already report in Power BI, those reports get better data instead of being replaced.',
    flow: [
      { who: 'Capcon OS', text: 'Jobs, valuations, crews and tenders published as a nightly dataset' },
      { who: 'Power BI', text: 'Existing board report refreshes from it' },
      { who: 'Eugene', text: 'Same numbers in the board pack as on the Command Centre' },
      { who: 'Finance', text: 'No month-end copy and paste' },
    ],
  },
];

const syncTone = (s: Sync): Tone => (s === 'Live' ? 'ok' : s === 'On approval' ? 'brand' : 'neutral');

export default function Integrations() {
  const [open, setOpen] = useState<Tool | null>(null);
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Integrations"
        title="Keep what works. Connect it. Stop re-keying."
        subtitle="Capcon OS sits on top of the tools your teams already use, so information is typed in once and appears everywhere it is needed."
        actions={
          <LinkButton to="/agents" variant="secondary" size="sm" icon={<Sparkles size={14} />}>
            Meet the agents
          </LinkButton>
        }
      />

      <Card strong className="relative overflow-hidden" delay={0.02}>
        <div className="absolute inset-y-0 left-0 w-1 bg-brand" />
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3 pl-2">
          <div className="min-w-[220px] text-[12px] font-semibold uppercase tracking-[0.06em] text-brand">“Your own software, or AI on what we have?”</div>
          <p className="min-w-0 flex-1 text-[17px] font-medium leading-snug tracking-[-0.01em] text-ink">
            Both. Capcon OS is your own platform, connected into the tools you already use, with AI agents doing specific jobs under human approval.
          </p>
        </div>
      </Card>

      <Card className="mt-5" delay={0.06}>
        <CardHeader title="How it fits together" subtitle="Your tools feed Capcon OS. Agents work inside it. People see one picture and approve what matters." />
        <Diagram />
      </Card>

      <h2 className="mb-1 mt-8 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3">Connections</h2>
      <Note className="mb-3">Illustrative. The actual list and how each one connects are confirmed during discovery. Click any tile for an example.</Note>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 min-[1700px]:grid-cols-4!">
        {TOOLS.map((t, i) => (
          <ToolTile key={t.id} tool={t} delay={0.02 * i} onClick={() => setOpen(t)} />
        ))}
      </div>

      <Card className="mt-6" delay={0.1}>
        <CardHeader icon={<Lock size={15} />} title="Security and control" subtitle="The same rules apply to every connection and every agent" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Lock, t: 'Stays in your tenant', d: 'Data stays in your own Microsoft tenant, hosted in the EU region. Nothing is used to train public models.' },
            { icon: KeyRound, t: 'Role-based access', d: 'Technicians see their site, Finance sees finance, directors see everything. Agents get the same limits.' },
            { icon: ScrollText, t: 'Full audit log', d: 'Every read, draft, approval and change is recorded with who, what and when.' },
            { icon: ShieldCheck, t: 'Approval before action', d: 'Nothing is sent, submitted, booked or paid by an agent without a person saying yes.' },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl bg-sunk p-4">
              <x.icon size={18} className="text-brand" />
              <div className="mt-2 text-[13.5px] font-semibold text-ink">{x.t}</div>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-3">{x.d}</p>
            </div>
          ))}
        </div>
      </Card>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''} subtitle={open ? `${open.kind} · example connection, confirmed on discovery` : undefined} width={560}>
        {open && <ToolDetail tool={open} />}
      </Drawer>
    </div>
  );
}

// ------------------------------------------------------------------ tiles
function ToolTile({ tool, onClick, delay }: { tool: Tool; onClick: () => void; delay: number }) {
  return (
    <Card onClick={onClick} delay={delay} className="group flex flex-col">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sunk text-ink-2 transition group-hover:bg-brand-soft group-hover:text-brand">
          <tool.icon size={19} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-semibold text-ink">{tool.name}</div>
          <div className="truncate text-[12px] text-ink-3">{tool.kind}</div>
        </div>
        <Pill tone={syncTone(tool.sync)} dot>
          {tool.sync}
        </Pill>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <FlowList label="Into Capcon OS" items={tool.dataIn} />
        <FlowList label="Back out" items={tool.dataOut} />
      </div>
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="rounded-full border border-dashed hairline px-2 py-0.5 text-[10.5px] font-medium text-ink-3">Example connection, confirmed on discovery</span>
        <ArrowRight size={14} className="text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-brand" />
      </div>
    </Card>
  );
}

function FlowList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">{label}</div>
      <ul className="space-y-0.5">
        {items.slice(0, 3).map((x) => (
          <li key={x} className="line-clamp-2 text-[12px] leading-snug text-ink-2">
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToolDetail({ tool }: { tool: Tool }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
          <tool.icon size={22} strokeWidth={1.75} />
        </span>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone={syncTone(tool.sync)} dot>
            Sync: {tool.sync}
          </Pill>
          <Pill>Example connection</Pill>
        </div>
      </div>
      <p className="text-[13.5px] leading-relaxed text-ink-2">{tool.why}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-sunk p-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Into Capcon OS</div>
          <ul className="space-y-1">
            {tool.dataIn.map((x) => (
              <li key={x} className="text-[12.5px] text-ink-2">
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-sunk p-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Back out</div>
          <ul className="space-y-1">
            {tool.dataOut.map((x) => (
              <li key={x} className="text-[12.5px] text-ink-2">
                {x}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Example: one record, start to finish</div>
        <div className="flex flex-col">
          {tool.flow.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.12 }}>
              <div className="flex gap-3 rounded-2xl border hairline bg-surface-strong p-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white dark:text-[#06101e]">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-brand">{s.who}</div>
                  <div className="text-[12.5px] leading-snug text-ink-2">{s.text}</div>
                </div>
              </div>
              {i < tool.flow.length - 1 && (
                <div className="flex justify-center py-1 text-ink-3">
                  <ArrowDown size={14} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
      <Note>Illustrative example on demo data. How this connection works for Capcon is confirmed during discovery.</Note>
    </div>
  );
}

// ------------------------------------------------------------------ diagram
const W = 1100;
const H = 540;
const LEFT = [
  { label: 'Outlook / 365', icon: Mail },
  { label: 'SharePoint, Excel', icon: FolderOpen },
  { label: 'Teams, WhatsApp', icon: MessagesSquare },
  { label: 'Sage, Xero', icon: Landmark },
  { label: 'Revit, ACC', icon: Box },
  { label: 'Procore, Aconex', icon: FileStack },
  { label: 'Power BI', icon: BarChart3 },
];
const RIGHT = [
  { name: 'Donnacha', role: 'Operations' },
  { name: 'Robert', role: 'Prefab, maintenance' },
  { name: 'Valerie', role: 'Finance' },
  { name: 'Aaron', role: 'Estimating' },
  { name: 'Stephen', role: 'Design' },
  { name: 'Julia', role: 'HSQE, sustainability' },
  { name: 'Technicians', role: 'Phone app on site' },
];
const MODULES = ['Projects', 'Crews', 'Tenders', 'Design', 'Prefab', 'Finance', 'Maintenance', 'HSQE', 'Handover'];

const NODE_H = 46;
const NODE_GAP = 14;
const COL_TOP = 130;
const nodeY = (i: number) => COL_TOP + i * (NODE_H + NODE_GAP);
const LX = 20;
const LW = 200;
const RX = 880;
const RW = 200;
const CX = 380;
const CW = 340;
const CY = 200;
const CH = 300;
const AY = 20;
const AH = 92;

function FlowPath({ d, delay = 0, reverse }: { d: string; delay?: number; reverse?: boolean }) {
  return (
    <>
      <path d={d} fill="none" stroke="var(--c-hairline)" strokeWidth={2} />
      <motion.path
        d={d}
        fill="none"
        stroke="var(--c-brand-2)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeDasharray="3 9"
        initial={{ strokeDashoffset: 0, opacity: 0 }}
        animate={{ strokeDashoffset: reverse ? 48 : -48, opacity: 0.9 }}
        transition={{ strokeDashoffset: { duration: 2.4, repeat: Infinity, ease: 'linear', delay }, opacity: { duration: 0.6, delay: 0.3 + delay } }}
      />
    </>
  );
}

function Diagram() {
  const centreMidY = CY + CH / 2;
  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Existing tools connect to Capcon OS; agents work inside it; people see one picture">
        {/* connectors: tools -> centre */}
        {LEFT.map((_, i) => {
          const y1 = nodeY(i) + NODE_H / 2;
          const y2 = centreMidY - 90 + i * 30;
          return <FlowPath key={`l${i}`} d={`M${LX + LW},${y1} C${LX + LW + 90},${y1} ${CX - 90},${y2} ${CX},${y2}`} delay={i * 0.15} />;
        })}
        {/* centre -> people */}
        {RIGHT.map((_, i) => {
          const y1 = centreMidY - 90 + i * 30;
          const y2 = nodeY(i) + NODE_H / 2;
          return <FlowPath key={`r${i}`} d={`M${CX + CW},${y1} C${CX + CW + 90},${y1} ${RX - 90},${y2} ${RX},${y2}`} delay={i * 0.15} />;
        })}
        {/* agents <-> centre */}
        {[0, 1, 2].map((i) => {
          const x = CX + 90 + i * 80;
          return <FlowPath key={`a${i}`} d={`M${x},${AY + AH} L${x},${CY}`} delay={i * 0.3} reverse={i === 1} />;
        })}

        {/* column labels */}
        <text x={LX} y={COL_TOP - 16} fontSize={11} fontWeight={600} letterSpacing="0.08em" fill="var(--c-ink-3)">
          YOUR TOOLS TODAY
        </text>
        <text x={RX} y={COL_TOP - 16} fontSize={11} fontWeight={600} letterSpacing="0.08em" fill="var(--c-ink-3)">
          YOUR PEOPLE
        </text>

        {/* left tools */}
        {LEFT.map((t, i) => (
          <g key={t.label}>
            <rect x={LX} y={nodeY(i)} width={LW} height={NODE_H} rx={14} fill="var(--c-surface-strong)" stroke="var(--c-hairline)" />
            <t.icon x={LX + 14} y={nodeY(i) + 14} width={18} height={18} color="var(--c-ink-2)" strokeWidth={1.75} />
            <text x={LX + 44} y={nodeY(i) + NODE_H / 2 + 4.5} fontSize={13} fontWeight={500} fill="var(--c-ink)">
              {t.label}
            </text>
          </g>
        ))}

        {/* right people */}
        {RIGHT.map((p, i) => (
          <g key={p.name}>
            <rect x={RX} y={nodeY(i)} width={RW} height={NODE_H} rx={14} fill="var(--c-surface-strong)" stroke="var(--c-hairline)" />
            <circle cx={RX + 24} cy={nodeY(i) + NODE_H / 2} r={13} fill={i === 6 ? 'var(--c-surface-sunk)' : 'var(--c-brand)'} />
            <text x={RX + 24} y={nodeY(i) + NODE_H / 2 + 4} fontSize={10.5} fontWeight={600} textAnchor="middle" fill={i === 6 ? 'var(--c-ink-2)' : 'var(--c-bg)'}>
              {i === 6 ? 'T' : p.name[0]}
            </text>
            <text x={RX + 46} y={nodeY(i) + 20} fontSize={13} fontWeight={600} fill="var(--c-ink)">
              {p.name}
            </text>
            <text x={RX + 46} y={nodeY(i) + 35} fontSize={11} fill="var(--c-ink-3)">
              {p.role}
            </text>
          </g>
        ))}

        {/* agents bar */}
        <g>
          <rect x={CX - 40} y={AY} width={CW + 80} height={AH} rx={20} fill="var(--c-brand-soft)" stroke="var(--c-brand)" strokeOpacity={0.25} strokeDasharray="4 4" />
          <text x={CX - 20} y={AY + 24} fontSize={11} fontWeight={600} letterSpacing="0.08em" fill="var(--c-brand)">
            AI AGENTS · ONE JOB EACH · YOU APPROVE
          </text>
          {AGENTS.map((a, i) => {
            const x = CX - 25 + i * 50;
            const I = AGENT_ICONS[a.id];
            return (
              <g key={a.id}>
                <rect x={x} y={AY + 38} width={40} height={40} rx={12} fill="var(--c-surface-strong)" stroke="var(--c-hairline)" />
                <I x={x + 11} y={AY + 49} width={18} height={18} color="var(--c-brand)" strokeWidth={1.75} />
              </g>
            );
          })}
        </g>

        {/* centre */}
        <g>
          <rect x={CX} y={CY} width={CW} height={CH} rx={26} fill="var(--c-surface-strong)" stroke="var(--c-brand)" strokeOpacity={0.35} strokeWidth={1.5} />
          <rect x={CX + 24} y={CY + 24} width={34} height={34} rx={10} fill="var(--c-brand)" />
          <path
            d={`M${CX + 41} ${CY + 31.5}c3.4 4.3 5.6 7.4 5.6 10.2a5.6 5.6 0 1 1-11.2 0c0-2.8 2.2-5.9 5.6-10.2Z`}
            fill="var(--c-bg)"
          />
          <text x={CX + 70} y={CY + 39} fontSize={17} fontWeight={700} letterSpacing="0.06em" fill="var(--c-ink)">
            CAPCON OS
          </text>
          <text x={CX + 70} y={CY + 55} fontSize={11.5} fill="var(--c-ink-3)">
            Your own platform, one record per job
          </text>
          {MODULES.map((m, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const w = (CW - 48 - 16) / 3;
            const x = CX + 24 + col * (w + 8);
            const y = CY + 82 + row * 44;
            return (
              <g key={m}>
                <rect x={x} y={y} width={w} height={36} rx={11} fill="var(--c-surface-sunk)" />
                <text x={x + w / 2} y={y + 22} fontSize={12} fontWeight={500} textAnchor="middle" fill="var(--c-ink-2)">
                  {m}
                </text>
              </g>
            );
          })}
          <text x={CX + CW / 2} y={CY + CH - 30} fontSize={11} textAnchor="middle" fill="var(--c-ink-3)">
            Audit log · role-based access · EU region
          </text>
        </g>
      </svg>
    </div>
  );
}

