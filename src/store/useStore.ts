import { create } from 'zustand';
import type {
  AgentId,
  AgentLogEntry,
  Allocation,
  Approval,
  DayKey,
  Defect,
  DiaryEntry,
  Job,
  RoleId,
  Spool,
  SpoolStage,
  Tender,
  TenderStage,
  Valuation,
} from '../data/types';
import {
  ALLOCATION,
  DEFECTS,
  DIARY,
  JOBS,
  SPOOLS,
  TENDERS,
  VALUATIONS,
} from '../data/seed';
import { AGENTS, INITIAL_APPROVALS } from '../data/agents';
import type { CurrencyMode } from '../lib/format';

export interface Toast {
  id: number;
  title: string;
  detail?: string;
  tone?: 'success' | 'info' | 'warning';
}

function initialLog(): AgentLogEntry[] {
  // 14 recent entries, newest first, at fixed times this morning
  const items: [AgentId, string, string, string?][] = [
    ['progress', '08:24', 'Read 2 photos from Barry McEvoy on Dexcom, diary entry written', 'CE-2291'],
    ['inbox', '08:19', 'Classified email from Kilcarra Construction as programme update, filed to Clonee data centre', 'CE-2333'],
    ['scheduler', '08:11', 'Clonee data centre has work ready Wednesday and no crew booked', 'CE-2333'],
    ['compliance', '08:02', 'IPAF for 2 technicians on Pharma expansion, Ringaskiddy expires next week', 'CE-2321'],
    ['valuation', '07:58', 'Cut-off for Distribution warehouse, Thurrock is Thursday, application still in draft', 'CE-2309'],
    ['inbox', '07:44', 'Payment notice from Tolka Building matched to application 9 on Grange Castle', 'CE-2315'],
    ['progress', '07:40', 'Updated Laya Arena installed metres from foreman message (+18 m)', 'CE-2318'],
    ['maintenance', '07:31', 'Booked annual inspection at National Children’s Hospital Block C for Tue 13 Oct'],
    ['inbox', '07:15', 'Tender invitation from Halden Build filed to Tenders as new enquiry'],
    ['takeoff', '07:02', 'Measured 14 roof areas on tender pack for Biologics expansion, Leixlip'],
    ['handover', '06:55', 'Compiled draft O&M for RDS Anglesea Stand, missing items listed for chasing', 'CE-2242'],
    ['compliance', '06:40', 'Checked 60 technicians’ tickets: 6 expire in the next 30 days'],
    ['progress', '06:31', 'No update from Carrigtwohill since Friday, nudged foreman', 'CE-2326'],
    ['inbox', '06:12', 'Drawing issue received for NLHPP: 4 drawings at rev C3, register updated', 'CE-2304'],
  ];
  return items.map(([agent, t, text, jobId], i) => ({ id: `L${i}`, agent, at: `2026-10-06T${t}:00`, text, jobId }));
}

interface DemoState {
  active: boolean;
  step: number;
}

export interface AppState {
  role: RoleId;
  signedIn: boolean;
  theme: 'light' | 'dark';
  currencyMode: CurrencyMode;
  sidebarCollapsed: boolean;
  assistantOpen: boolean;
  searchOpen: boolean;
  demo: DemoState;
  /** live clock offset in minutes (advances while demo runs, for agent log timestamps) */
  clockMinutes: number;

  jobs: Job[];
  diary: DiaryEntry[];
  allocation: Allocation;
  approvals: Approval[];
  agentLog: AgentLogEntry[];
  agentPerms: Record<string, boolean>; // `${agentId}.${key}`
  agentCounts: Record<AgentId, number>;
  valuations: Valuation[];
  tenders: Tender[];
  spools: Spool[];
  defects: Defect[];
  toasts: Toast[];
  /** job ids touched by the field app in this session (for highlight) */
  recentlyUpdated: string[];
  /** set when the takeoff agent has been run and sent */
  takeoffSent: boolean;
  /** RAMS sign-on done on field app */
  ramsSigned: boolean;

  setRole: (r: RoleId) => void;
  signIn: () => void;
  toggleTheme: () => void;
  setCurrencyMode: (m: CurrencyMode) => void;
  toggleSidebar: () => void;
  setAssistantOpen: (o: boolean) => void;
  setSearchOpen: (o: boolean) => void;
  setDemo: (d: Partial<DemoState>) => void;

  logInstall: (p: { jobId: string; metres: number; system: 'siphonic' | 'gravity'; note: string; author: string; photo?: boolean }) => void;
  flagIssue: (p: { jobId: string; note: string; author: string }) => void;
  moveCrew: (crewId: string, day: DayKey, jobId: string | null) => void;
  assignCrewRange: (crewId: string, days: DayKey[], jobId: string) => void;
  decideApproval: (id: string, decision: 'Approved' | 'Rejected', edits?: Partial<Approval>) => void;
  addApproval: (a: Approval) => void;
  pushLog: (e: Omit<AgentLogEntry, 'id' | 'at'> & { at?: string }) => void;
  togglePerm: (key: string) => void;
  addValuation: (v: Valuation) => void;
  moveTender: (id: string, stage: TenderStage) => void;
  /** add a tender, or replace one with the same id (Takeoff Agent) */
  upsertTender: (t: Tender) => void;
  moveSpool: (id: string, stage: SpoolStage) => void;
  advanceDefect: (id: string) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  setTakeoffSent: (v: boolean) => void;
  setRamsSigned: (v: boolean) => void;
  tickClock: () => void;
}

const initialPerms: Record<string, boolean> = {};
for (const a of AGENTS) for (const t of a.touches) initialPerms[`${a.id}.${t.key}`] = t.on;
const initialCounts = Object.fromEntries(AGENTS.map((a) => [a.id, a.actionsToday])) as Record<AgentId, number>;

let toastId = 1;

const prefersDark = false; // default to light for screen-share clarity

export const useStore = create<AppState>((set, get) => ({
  role: 'donnacha',
  signedIn: false,
  theme: prefersDark ? 'dark' : 'light',
  currencyMode: 'local',
  sidebarCollapsed: false,
  assistantOpen: false,
  searchOpen: false,
  demo: { active: false, step: 0 },
  clockMinutes: 0,

  jobs: JOBS.map((j) => ({ ...j, weeklyInstalled: [...j.weeklyInstalled], lastUpdate: { ...j.lastUpdate } })),
  diary: [...DIARY],
  allocation: JSON.parse(JSON.stringify(ALLOCATION)),
  approvals: [...INITIAL_APPROVALS],
  agentLog: initialLog(),
  agentPerms: initialPerms,
  agentCounts: initialCounts,
  valuations: [...VALUATIONS],
  tenders: TENDERS.map((t) => ({ ...t })),
  spools: SPOOLS.map((s) => ({ ...s })),
  defects: DEFECTS.map((d) => ({ ...d })),
  toasts: [],
  recentlyUpdated: [],
  takeoffSent: false,
  ramsSigned: false,

  setRole: (role) => set({ role }),
  signIn: () => set({ signedIn: true }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setCurrencyMode: (currencyMode) => set({ currencyMode }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setDemo: (d) => set((s) => ({ demo: { ...s.demo, ...d } })),

  logInstall: ({ jobId, metres, system, note, author, photo }) => {
    const now = currentIso(get().clockMinutes);
    set((s) => ({
      jobs: s.jobs.map((j) => {
        if (j.id !== jobId) return j;
        const sI = system === 'siphonic' ? Math.min(j.siphonicDesigned, j.siphonicInstalled + metres) : j.siphonicInstalled;
        const gI = system === 'gravity' ? Math.min(j.gravityDesigned, j.gravityInstalled + metres) : j.gravityInstalled;
        const added = sI - j.siphonicInstalled + (gI - j.gravityInstalled);
        return {
          ...j,
          siphonicInstalled: sI,
          gravityInstalled: gI,
          weekToDate: j.weekToDate + added,
          costToDate: Math.round(j.costToDate + (j.contractValue / (j.siphonicDesigned + j.gravityDesigned)) * added * (1 - j.forecastMarginPct)),
          lastUpdate: { at: now, source: 'Technician app', by: author, note },
        };
      }),
      diary: [
        { id: `D-live-${Date.now()}`, jobId, at: now, author, source: 'Technician app', text: note, metres, photo: photo ? 'p6' : undefined, weather: 'Overcast, 11°C' },
        ...s.diary,
      ],
      recentlyUpdated: [jobId, ...s.recentlyUpdated.filter((x) => x !== jobId)],
    }));
    get().pushLog({ agent: 'progress', text: `Read technician app update from ${author}: +${metres} m ${system}, % complete and diary updated`, jobId });
  },

  flagIssue: ({ jobId, note, author }) => {
    const now = currentIso(get().clockMinutes);
    set((s) => ({
      diary: [{ id: `D-issue-${Date.now()}`, jobId, at: now, author, source: 'Technician app', text: `Issue flagged: ${note}` }, ...s.diary],
    }));
    get().pushLog({ agent: 'progress', text: `Issue flagged by ${author}: ${note}`, jobId });
  },

  moveCrew: (crewId, day, jobId) =>
    set((s) => ({ allocation: { ...s.allocation, [crewId]: { ...s.allocation[crewId], [day]: jobId } } })),

  assignCrewRange: (crewId, days, jobId) =>
    set((s) => {
      const row = { ...s.allocation[crewId] };
      for (const d of days) row[d] = jobId;
      return { allocation: { ...s.allocation, [crewId]: row } };
    }),

  decideApproval: (id, decision, edits) => {
    const a = get().approvals.find((x) => x.id === id);
    if (!a) return;
    set((s) => ({ approvals: s.approvals.map((x) => (x.id === id ? { ...x, ...edits, status: decision } : x)) }));
    if (decision === 'Approved') {
      // side effects
      if (a.id === 'AP-2') get().assignCrewRange('IE-08', ['Wed', 'Thu', 'Fri'], 'CE-2333');
      if (a.kind === 'valuation' && a.jobId) {
        set((s) => ({ jobs: s.jobs.map((j) => (j.id === a.jobId ? { ...j, valuationStatus: 'Submitted' } : j)) }));
      }
      get().pushLog({ agent: a.agent, text: `Approved by ${roleName(get().role)}: ${a.title}`, jobId: a.jobId });
    } else {
      get().pushLog({ agent: a.agent, text: `Rejected: ${a.title}. Agent will not act.`, jobId: a.jobId });
    }
  },

  addApproval: (a) => set((s) => ({ approvals: [a, ...s.approvals.filter((x) => x.id !== a.id)] })),

  pushLog: (e) =>
    set((s) => ({
      agentLog: [{ id: `L-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: e.at ?? currentIso(s.clockMinutes), agent: e.agent, text: e.text, jobId: e.jobId }, ...s.agentLog].slice(0, 80),
      agentCounts: { ...s.agentCounts, [e.agent]: (s.agentCounts[e.agent] ?? 0) + 1 },
    })),

  togglePerm: (key) => set((s) => ({ agentPerms: { ...s.agentPerms, [key]: !s.agentPerms[key] } })),

  addValuation: (v) => set((s) => ({ valuations: [...s.valuations.filter((x) => x.id !== v.id), v] })),
  moveTender: (id, stage) => set((s) => ({ tenders: s.tenders.map((t) => (t.id === id ? { ...t, stage } : t)) })),
  upsertTender: (t) => set((s) => ({ tenders: s.tenders.some((x) => x.id === t.id) ? s.tenders.map((x) => (x.id === t.id ? t : x)) : [t, ...s.tenders] })),
  moveSpool: (id, stage) => set((s) => ({ spools: s.spools.map((t) => (t.id === id ? { ...t, stage } : t)) })),
  advanceDefect: (id) =>
    set((s) => ({
      defects: s.defects.map((d) => {
        if (d.id !== id) return d;
        const order: Defect['stage'][] = ['Defect found', 'Quote raised', 'Approved', 'Scheduled', 'Complete'];
        const i = order.indexOf(d.stage);
        return { ...d, stage: order[Math.min(order.length - 1, i + 1)] };
      }),
    })),

  toast: (t) => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => get().dismissToast(id), 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setTakeoffSent: (takeoffSent) => set({ takeoffSent }),
  setRamsSigned: (ramsSigned) => set({ ramsSigned }),
  tickClock: () => set((s) => ({ clockMinutes: s.clockMinutes + 1 })),
}));

/** Demo clock: 08:30 on Tue 6 Oct 2026 plus elapsed minutes. */
export function currentIso(clockMinutes: number): string {
  const d = new Date(new Date('2026-10-06T08:30:00').getTime() + clockMinutes * 60000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

function roleName(r: RoleId) {
  const m: Record<RoleId, string> = {
    eugene: 'Eugene',
    donnacha: 'Donnacha',
    robert: 'Robert',
    stephen: 'Stephen',
    aaron: 'Aaron',
    valerie: 'Valerie',
    julia: 'Julia',
    technician: 'Barry',
  };
  return m[r];
}

export const useJob = (id: string | undefined) => useStore((s) => s.jobs.find((j) => j.id === id));
