// Core domain types for Capcon OS. All seed data is demo data generated
// deterministically in src/data/seed.ts.

export type Region = 'IE' | 'UK' | 'SG' | 'MY' | 'EU';
export type Currency = 'EUR' | 'GBP';

export type Sector =
  | 'Airports'
  | 'Commercial'
  | 'Data Centre'
  | 'Education'
  | 'Hospitals'
  | 'Pharmaceutical'
  | 'Residential'
  | 'Specialist'
  | 'Stadiums'
  | 'Warehouse';

export const SECTORS: Sector[] = [
  'Airports',
  'Commercial',
  'Data Centre',
  'Education',
  'Hospitals',
  'Pharmaceutical',
  'Residential',
  'Specialist',
  'Stadiums',
  'Warehouse',
];

export type Health = 'on-track' | 'at-risk' | 'blocked';

export type JobStage =
  | 'Design'
  | 'Prefabrication'
  | 'Install'
  | 'Testing & commissioning'
  | 'Handover';

export type InstallSystem =
  | 'Valsir Rainplus'
  | 'Geberit Pluvia'
  | 'Terrain Hydromax'
  | 'Blucher stainless';

export type Material = 'HDPE' | 'Aluminium' | 'Stainless steel' | 'Cast iron' | 'PVC';

export type UpdateSource = 'Foreman app' | 'Email' | 'Site Progress Agent' | 'Phone call' | 'Technician app';

export type ValuationStatus =
  | 'Not started'
  | 'Draft'
  | 'Submitted'
  | 'Certified'
  | 'Paid'
  | 'Missed cut-off';

export interface Job {
  id: string; // e.g. "CE-2417"
  name: string;
  shortName: string;
  sector: Sector;
  region: Region;
  location: string; // "Athenry, Co. Galway"
  lat: number;
  lng: number;
  client: string;
  mainContractor: string;
  /** true when the contractor relationship is public / real */
  mainContractorPublic: boolean;
  consultant?: string;
  showcase: boolean; // a real public Capcon project
  designOnly: boolean;
  stage: JobStage;
  system: InstallSystem;
  material: Material;
  currency: Currency;
  contractValue: number; // local currency, original contract sum (ex variations)
  roofArea: number; // m²
  siphonicDesigned: number; // m
  gravityDesigned: number; // m
  siphonicInstalled: number; // m
  gravityInstalled: number; // m
  /** metres installed per completed week, oldest first, last 12 weeks (last entry = last week) */
  weeklyInstalled: number[];
  /** metres installed so far this week (Mon to now) */
  weekToDate: number;
  /** planned metres for the current week */
  plannedThisWeek: number;
  /** design progress 0..1 (design-only jobs use this for % complete) */
  designProgress: number;
  costToDate: number; // local currency
  forecastMarginPct: number; // e.g. 0.18
  health: Health;
  healthReason?: string;
  start: string; // ISO date
  mcProgrammeEnd: string; // main contractor programme completion for our package
  forecastEnd: string; // our forecast completion
  foremanId?: string;
  workReady: boolean; // work face available
  nextMilestone: { name: string; date: string };
  mcCutoffDay: number; // day of month valuations must be in
  valuationStatus: ValuationStatus;
  lastUpdate: { at: string; source: UpdateSource; by: string; note: string };
  retentionPct: number;
  handoverReadiness: number; // 0..1
  ytd: boolean; // started this calendar year (for "this year" queries)
}

export interface Person {
  id: string;
  name: string;
  role: string;
  email?: string;
}

export type TicketType =
  | 'Safe Pass'
  | 'CSCS'
  | 'IPAF 3a/3b'
  | 'PASMA'
  | 'Manual handling'
  | 'Working at height'
  | 'First aid'
  | 'Site induction';

export interface Ticket {
  type: TicketType;
  ref: string;
  expires: string; // ISO date
  note?: string; // e.g. "Dexcom induction"
}

export interface Technician {
  id: string;
  name: string;
  role: 'Foreman' | 'Lead Technician' | 'Technician' | 'Apprentice' | 'Maintenance Technician';
  region: 'IE' | 'UK';
  crewId: string;
  base: string;
  tickets: Ticket[];
  utilisation: number; // 0..1 last 4 weeks
  travelHoursWeek: number;
  phone: string;
}

export interface Crew {
  id: string; // "IE-03"
  name: string; // "Crew 3 · Galway"
  region: 'IE' | 'UK';
  foremanId: string;
  memberIds: string[];
  colour: string;
}

export type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
export const DAYS: DayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** allocation[crewId][day] = jobId | null */
export type Allocation = Record<string, Record<DayKey, string | null>>;

export type TenderStage =
  | 'Enquiry received'
  | 'Drawings reviewed'
  | 'Design / value engineering'
  | 'Priced'
  | 'Submitted'
  | 'Won'
  | 'Lost';

export const TENDER_STAGES: TenderStage[] = [
  'Enquiry received',
  'Drawings reviewed',
  'Design / value engineering',
  'Priced',
  'Submitted',
  'Won',
  'Lost',
];

export interface Tender {
  id: string;
  name: string;
  sector: Sector;
  region: 'IE' | 'UK';
  location: string;
  mainContractor: string;
  consultant?: string;
  currency: Currency;
  value: number;
  received: string;
  closeDate: string;
  stage: TenderStage;
  estimator: string; // person name
  turnaroundDays?: number; // for submitted/won/lost
  hoursEstimate: number;
  veSaving: number; // value-engineering saving offered to client
  roofArea: number;
  system: 'Siphonic' | 'Gravity' | 'Siphonic + gravity';
}

export interface Rfi {
  id: string;
  jobId: string;
  subject: string;
  raised: string;
  to: string;
  status: 'Open' | 'Answered';
  answered?: string;
}

export interface Variation {
  id: string;
  jobId: string;
  description: string;
  value: number; // local currency
  status: 'Instructed (verbal)' | 'Pending pricing' | 'Submitted' | 'Agreed' | 'Rejected';
  date: string;
  instructedBy: string;
}

export interface Valuation {
  id: string;
  jobId: string;
  month: string; // "2026-09"
  appNo: number;
  applied: number; // gross cumulative applied this app
  certified: number | null;
  paid: number | null;
  submitted: string;
  certifiedOn?: string;
  paidOn?: string;
  dueOn: string; // payment due date
}

export interface DiaryEntry {
  id: string;
  jobId: string;
  at: string; // ISO datetime
  author: string;
  source: UpdateSource;
  text: string;
  metres?: number;
  photo?: string; // placeholder key
  weather?: string;
}

export interface Drawing {
  id: string;
  jobId: string;
  number: string;
  title: string;
  rev: string;
  status: 'For comment' | 'For construction' | 'As built' | 'Superseded' | 'In progress';
  date: string;
}

export interface DesignRecord {
  jobId: string;
  hydraulicCalcs: 'Not started' | 'In progress' | 'Checked' | 'Approved';
  signOff: 'Pending' | 'Internal' | 'Client approved';
  bimStatus: 'LOD 300' | 'LOD 350' | 'LOD 400' | 'As built' | 'Not required';
  clashTrend: number[]; // 8 weeks
  designHoursBudget: number;
  designHoursUsed: number;
  designer: string;
}

export interface Spool {
  id: string;
  jobId: string;
  material: Material;
  diameter: number; // mm
  length: number; // m
  stage: SpoolStage;
  due: string; // site need date
  weightKg: number;
}

export type SpoolStage =
  | 'Cut'
  | 'Fused / welded'
  | 'Pressure tested'
  | 'QC passed'
  | 'Packed'
  | 'Dispatched'
  | 'On site';

export const SPOOL_STAGES: SpoolStage[] = [
  'Cut',
  'Fused / welded',
  'Pressure tested',
  'QC passed',
  'Packed',
  'Dispatched',
  'On site',
];

export interface StockItem {
  id: string;
  material: Material;
  diameter: number;
  onHand: number; // m
  reorderLevel: number; // m
  onOrder: number;
  supplier: string;
}

export interface HsItem {
  id: string;
  jobId: string;
  type: 'Near miss' | 'Incident' | 'Observation' | 'Toolbox talk' | 'Audit' | 'Permit';
  title: string;
  date: string;
  status: 'Open' | 'Closed';
  severity?: 'Low' | 'Medium' | 'High';
}

export interface RamsRecord {
  jobId: string;
  status: 'Approved' | 'Submitted' | 'Revision required' | 'Missing';
  rev: string;
  reviewed: string;
  permits: number;
}

export interface Ncr {
  id: string;
  jobId: string;
  title: string;
  raised: string;
  status: 'Open' | 'Closed';
  clause: string;
}

export interface MaintenanceContract {
  id: string;
  client: string;
  site: string;
  sector: Sector;
  region: 'IE' | 'UK';
  currency: Currency;
  annualValue: number;
  renewal: string;
  visitsPerYear: number;
  buildingIds: string[];
  fromInstall?: string; // jobId if it came from a Capcon install
  standard: 'BS EN 12056-3' | 'BS 8490' | 'BS EN 12056-3 & BS 8490';
}

export interface Building {
  id: string;
  contractId: string;
  name: string;
  outlets: number;
  gratings: number;
  gutterM: number;
  pipeRunM: number;
  system: 'Siphonic' | 'Gravity' | 'Siphonic + gravity';
  lastInspection: string;
  condition: 'Good' | 'Fair' | 'Needs attention';
}

export interface MaintenanceVisit {
  id: string;
  contractId: string;
  buildingId: string;
  date: string;
  type: 'Planned preventative' | 'Annual inspection' | 'Emergency callout' | 'Survey' | 'Repair';
  technician: string;
  status: 'Scheduled' | 'Completed' | 'Report issued' | 'In progress';
}

export interface Defect {
  id: string;
  contractId: string;
  buildingId: string;
  title: string;
  found: string;
  severity: 'Low' | 'Medium' | 'High';
  stage: 'Defect found' | 'Quote raised' | 'Approved' | 'Scheduled' | 'Complete';
  quoteValue: number;
}

export type AgentId =
  | 'inbox'
  | 'takeoff'
  | 'progress'
  | 'valuation'
  | 'compliance'
  | 'scheduler'
  | 'maintenance'
  | 'handover';

export interface AgentDef {
  id: AgentId;
  name: string;
  job: string;
  touches: { key: string; label: string; on: boolean }[];
  actionsToday: number;
  hoursSavedWeek: number;
  logTemplates: string[];
}

export interface AgentLogEntry {
  id: string;
  agent: AgentId;
  at: string;
  text: string;
  jobId?: string;
}

export interface Approval {
  id: string;
  agent: AgentId;
  title: string;
  detail: string;
  jobId?: string;
  route?: string;
  value?: number;
  currency?: Currency;
  created: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  kind: 'valuation' | 'email' | 'schedule' | 'quote' | 'diary' | 'boq' | 'handover' | 'compliance';
}

export interface AttentionItem {
  id: string;
  severity: 'high' | 'medium' | 'low';
  agent: AgentId;
  title: string;
  detail: string;
  route: string;
  jobId?: string;
  roles: RoleId[];
}

export type RoleId =
  | 'eugene'
  | 'donnacha'
  | 'robert'
  | 'stephen'
  | 'aaron'
  | 'valerie'
  | 'julia'
  | 'technician';

export interface HandoverItem {
  key: string;
  label: string;
  done: boolean;
}
