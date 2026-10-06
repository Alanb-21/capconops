// Capcon Assistant: a deterministic intent engine over live Capcon OS data.
// Every answer is computed from the zustand store at the moment it is asked,
// so it reflects whatever has changed during the demo (crew moves, installs,
// approvals). Unmatched questions get a graceful fallback with close suggestions.
import type { Currency, DayKey, Job, Sector, TicketType } from '../data/types';
import { CREWS, MAINT_CONTRACTS, RFIS, VARIATIONS, techById } from '../data/seed';
import {
  OPEN_STAGES,
  TODAY_DAY,
  TOMORROW_DAY,
  appsOverDays,
  crewsOn,
  designed,
  earned,
  expiringTickets,
  installed,
  jobPct,
  marginBySector,
  peopleOn,
  sitesWithNoCrew,
  weeklyMetres,
} from '../data/metrics';
import { currentIso, useStore } from '../store/useStore';
import { TODAY_ISO, ago, daysBetween, daysUntil, fmtDate, isoAdd, parse, weekLabel } from '../lib/dates';
import { money, num, pct, toEur } from '../lib/format';

// ---------------------------------------------------------------- answer model
export type Tone = 'ok' | 'warn' | 'bad' | 'brand';

export type Block =
  | { kind: 'text'; text: string }
  | { kind: 'stats'; items: { label: string; value: string; sub?: string; tone?: Tone }[] }
  | {
      kind: 'table';
      columns: { label: string; align?: 'left' | 'right'; wrap?: boolean }[];
      rows: { cells: string[]; to?: string; tone?: Tone }[];
      foot?: string[];
    }
  | { kind: 'chart'; type: 'bar' | 'line'; data: { label: string; value: number; highlight?: boolean }[]; unit: 'm' | '%'; caption?: string }
  | { kind: 'links'; links: { label: string; to: string }[] }
  | { kind: 'email'; to: string; subject: string; body: string; jobId: string; contractor: string; jobName: string };

export interface Answer {
  blocks: Block[];
  sources: string[];
  /** false when the engine did not recognise the question (eligible for the Claude API path) */
  confident: boolean;
  suggestions?: string[];
}

export const SUGGESTED = [
  'Where are we on Dexcom?',
  'Which sites have nobody on them tomorrow?',
  'What applications for payment are over 60 days?',
  'Whose IPAF expires this month?',
  'How many metres did we install in the UK last week?',
  "What's blocking NLHPP?",
];

export const MORE_QUESTIONS = [
  'Which tenders close this week and who’s pricing them?',
  'What’s our margin on pharma jobs this year?',
  'Which maintenance contracts renew in the next 90 days?',
  'Draft an update email to John Paul Construction on Dexcom.',
  'How many live jobs do we have?',
  'What’s at risk this week?',
];

const ALL_QUESTIONS = [...SUGGESTED, ...MORE_QUESTIONS];

// ---------------------------------------------------------------- helpers
const DAY_DATE: Record<DayKey, string> = { Mon: '2026-10-05', Tue: '2026-10-06', Wed: '2026-10-07', Thu: '2026-10-08', Fri: '2026-10-09' };
const DAY_NAME: Record<DayKey, string> = { Mon: 'Monday', Tue: 'today', Wed: 'tomorrow', Thu: 'Thursday', Fri: 'Friday' };

function state() {
  return useStore.getState();
}
function fmtMoney(amount: number, currency: Currency, compact = true) {
  return money(amount, currency, { mode: state().currencyMode, compact });
}
const eurC = (v: number) => money(v, 'EUR', { compact: true });

function norm(s: string) {
  return ` ${s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/'s\b/g, 's')
    .replace(/[^a-z0-9%\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}
const has = (q: string, phrase: string) => q.includes(` ${phrase.trim()} `);

/** Real, public contractors: never shown with debts, disputes or delays. */
const isRealContractor = (j: Job) => j.mainContractorPublic && j.mainContractor !== 'Undisclosed' && j.mainContractor !== 'Design only';
const contractorLabel = (j: Job) => (j.mainContractor === 'Design only' ? (j.consultant ?? 'Design only') : j.mainContractor);
const forContractor = (j: Job) => (j.mainContractor === 'Undisclosed' ? '' : ` for ${contractorLabel(j)}`);

function crewLabel(id: string) {
  return CREWS.find((c) => c.id === id)?.name ?? id;
}
function crewForeman(id: string) {
  const c = CREWS.find((x) => x.id === id);
  return c ? (techById(c.foremanId)?.name ?? '') : '';
}
function jobShort(j: Job) {
  // "Hyperscale data centre, Clonee" reads better than the short name "Hyperscale data centre"
  return j.shortName.length <= 14 ? j.shortName : j.name;
}
function nowDate() {
  return parse(currentIso(state().clockMinutes));
}
function milestoneText(j: Job) {
  const d = daysUntil(j.nextMilestone.date);
  const when = d === 0 ? 'today' : d === 1 ? 'tomorrow' : d > 0 ? `in ${d} days` : `${-d} days ago`;
  return `**${j.nextMilestone.name}**, ${fmtDate(j.nextMilestone.date, { weekday: true })} (${when})`;
}

// ---------------------------------------------------------------- entity matching
const JOB_ALIASES: Record<string, string> = {
  nlhpp: 'CE-2304',
  'north london': 'CE-2304',
  'heat and power': 'CE-2304',
  edmonton: 'CE-2304',
  changi: 'CE-2337',
  t5: 'CE-2337',
  'terminal 5': 'CE-2337',
  clonee: 'CE-2333',
  thurrock: 'CE-2309',
  slough: 'CE-2298',
  'milton keynes': 'CE-2340',
  mk: 'CE-2340',
  ringaskiddy: 'CE-2321',
  carrigtwohill: 'CE-2326',
  'grange castle': 'CE-2315',
  athenry: 'CE-2291',
  'dexcom campus': 'CE-2291',
  laya: 'CE-2318',
  'laya arena': 'CE-2318',
  'aviva': 'CE-2318',
  anglesea: 'CE-2242',
  rds: 'CE-2242',
  diageo: 'CE-2276',
  connacht: 'CE-2329',
  'connacht rugby': 'CE-2329',
  'dexcom stadium': 'CE-2329',
  'sportsground': 'CE-2329',
  oriel: 'CE-2312',
  'project oriel': 'CE-2312',
  'st pancras': 'CE-2312',
  moorfields: 'CE-2312',
  sittingbourne: 'CE-2347',
  tuas: 'CE-2351',
};

export function findJob(qn: string, jobs: Job[]): Job | undefined {
  return findJobScored(qn, jobs)?.j;
}

function findJobScored(qn: string, jobs: Job[]): { j: Job; s: number } | undefined {
  let best: { j: Job; s: number } | undefined;
  const consider = (j: Job | undefined, s: number) => {
    if (!j) return;
    if (!best || s > best.s) best = { j, s };
  };
  // explicit ids: "CE-2291" or "2291"
  const idm = qn.match(/\b(?:ce\s?)?(2\d{3}|1\d{3})\b/);
  if (idm) consider(jobs.find((j) => j.id === `CE-${idm[1]}`), 200);
  for (const [alias, id] of Object.entries(JOB_ALIASES)) {
    if (has(qn, alias)) consider(jobs.find((j) => j.id === id), 60 + alias.length);
  }
  for (const j of jobs) {
    const sn = norm(j.shortName).trim();
    if (sn.length >= 4 && has(qn, sn)) consider(j, 50 + sn.length);
    const full = norm(j.name).trim();
    if (has(qn, full)) consider(j, 90 + full.length);
    const town = norm(j.location.split(',')[0]).trim();
    const nameTown = norm(j.name.split(',').slice(1).join(' ')).trim();
    for (const t of [town, nameTown]) {
      if (t.length >= 4 && has(qn, t)) consider(j, 20 + t.length + (j.stage === 'Install' ? 2 : 0));
    }
  }
  return best;
}

const CONTRACTOR_SUFFIX = /\b(construction|contracting|contracts|building|build group|build|group|projects|main contractors|main contracting|uk|ltd)\b/g;

export function findContractor(qn: string, jobs: Job[]): string | undefined {
  const names = [...new Set(jobs.map((j) => j.mainContractor))].filter((m) => m !== 'Undisclosed' && m !== 'Design only');
  let best: { m: string; s: number } | undefined;
  for (const m of names) {
    const full = norm(m).trim();
    const core = norm(m).replace(CONTRACTOR_SUFFIX, ' ').replace(/\s+/g, ' ').trim();
    let s = 0;
    if (has(qn, full)) s = 100 + full.length;
    else if (core.length >= 4 && has(qn, core)) s = 50 + core.length;
    else if (/^john paul/.test(full) && (has(qn, 'jpc') || has(qn, 'john paul'))) s = 60;
    if (s && (!best || s > best.s)) best = { m, s };
  }
  return best?.m;
}

function findRegion(qn: string): 'IE' | 'UK' | undefined {
  if (/ (uk|u k|britain|british|england|gb|scotland|wales) /.test(qn)) return 'UK';
  if (/ (ie|ireland|irish|roi|republic) /.test(qn)) return 'IE';
  return undefined;
}

const SECTOR_WORDS: [RegExp, Sector][] = [
  [/ pharma(ceutical)?s? | life sciences? | biologics? /, 'Pharmaceutical'],
  [/ data cent(re|er)s? | dcs? | hyperscale /, 'Data Centre'],
  [/ airports? | aviation /, 'Airports'],
  [/ commercial | offices? /, 'Commercial'],
  [/ education | schools? | universit(y|ies) /, 'Education'],
  [/ hospitals? | healthcare | health /, 'Hospitals'],
  [/ residential | housing | apartments? | resi /, 'Residential'],
  [/ specialist | industrial | energy /, 'Specialist'],
  [/ stadiums? | arenas? | sports? /, 'Stadiums'],
  [/ warehous(e|es|ing) | logistics | distribution /, 'Warehouse'],
];
function findSector(qn: string): Sector | undefined {
  for (const [re, s] of SECTOR_WORDS) if (re.test(qn)) return s;
  return undefined;
}

function findDay(qn: string): DayKey {
  if (has(qn, 'today')) return 'Tue';
  if (has(qn, 'tomorrow')) return 'Wed';
  if (/ (mon|monday) /.test(qn)) return 'Mon';
  if (/ (tue|tues|tuesday) /.test(qn)) return 'Tue';
  if (/ (wed|weds|wednesday) /.test(qn)) return 'Wed';
  if (/ (thu|thur|thurs|thursday) /.test(qn)) return 'Thu';
  if (/ (fri|friday) /.test(qn)) return 'Fri';
  return TOMORROW_DAY;
}

const TICKET_WORDS: [RegExp, TicketType][] = [
  [/ ipaf /, 'IPAF 3a/3b'],
  [/ pasma /, 'PASMA'],
  [/ cscs /, 'CSCS'],
  [/ safe ?pass /, 'Safe Pass'],
  [/ manual handling /, 'Manual handling'],
  [/ working at height /, 'Working at height'],
  [/ first aid /, 'First aid'],
  [/ induction /, 'Site induction'],
];

// ---------------------------------------------------------------- public entry
export function answer(question: string): Answer {
  try {
    return route(question);
  } catch {
    return fallback(question);
  }
}

function route(question: string): Answer {
  const qn = norm(question);
  const s = state();
  const jobs = s.jobs;
  const hit = findJobScored(qn, jobs);
  const contractor = findContractor(qn, jobs);
  // a town name alone ("weather in Galway") is a weak match: only use it when the
  // question is clearly about a job
  const jobWords = / (where are we|status|progress|update|how is|hows|how are|whats happening|blocking|blocked|holding|stuck|risk|job|site|project|email|draft|crew on|on site|percent|complete|done|milestone|rfis?) /.test(qn);
  const offTopic = / (weather|rain forecast|joke|football|match|score|news|traffic|lunch) /.test(qn);
  const job = hit && !offTopic && (hit.s >= 50 || jobWords) ? hit.j : undefined;
  if (offTopic && !/ (metres?|tenders?|ipaf|margin|crews?) /.test(qn)) return fallback(question);

  if (/^ (hi|hello|hey|hiya|morning|good (morning|afternoon|evening)|dia dhuit|howya|thanks|thank you|cheers) /.test(qn) && qn.trim().split(' ').length <= 5) {
    return /thank|cheers/.test(qn) ? thanks() : greeting();
  }
  if (/ (help|what can you do|what can i ask|what do you know|how does this work|examples?) /.test(qn)) return help();

  if (/ (draft|write|compose|prepare|send)\b/.test(qn) || / (email|e mail|letter|note) to /.test(qn) || has(qn, 'update email')) {
    if (job || contractor) return draftEmail(job, contractor);
  }
  if (TICKET_WORDS.some(([re]) => re.test(qn)) || / (tickets?|certs?|certificates?|cards?|training) /.test(qn)) {
    if (/ (expir|due|renew|lapse|run out|out of date|valid)/.test(qn) || / (ipaf|pasma|cscs) /.test(qn)) return tickets(qn);
  }
  if (/ (applications?|apps?|afps?|valuations?|payments?|debts?|debtors|owed|owing|unpaid|overdue|outstanding) /.test(qn) && / (\d+ ?days?|overdue|unpaid|owed|owing|late|aged|outstanding) /.test(qn)) {
    return appsOver(qn);
  }
  if (/ (nobody|no one|noone|no crew|no crews|nobody on|unmanned|without (a )?crew|empty|uncovered|no one on|no labour|need(s)? a crew) /.test(qn)) {
    return noCrew(findDay(qn));
  }
  if (/ (tenders?|bids?|pricing|estimat\w*|quotes?|enquir\w*) /.test(qn)) return tendersClosing(qn);
  if (/ (maintenance|renewals?|renew|renewing) /.test(qn) && !job) return maintRenewals(qn);
  if (/ (metres?|meters?|m of pipe|productivity|install rate|installed) /.test(qn) && !/ where are we /.test(qn) && (!job || / (uk|ireland|ie|we|group|total) /.test(qn))) {
    return metresInstalled(qn);
  }
  if (/ (margins?|profit\w*|gp|gross profit|making money) /.test(qn)) return margin(qn);
  if (job && / (block\w*|holding (it|us|things)? ?up|held up|stuck|stopping|delay\w*|problem\w*|issues?|wrong|risk) /.test(qn)) return blocking(job);
  if (job) return jobStatus(job);
  if (contractor) return contractorSummary(contractor);
  if (/ (at risk|risks?|attention|worry|worried|problems?|issues?|behind|blocked|fires?) /.test(qn)) return atRisk();
  if (/ how many /.test(qn) || / (count|number of|live jobs|active jobs|live sites|order book|overview|summary) /.test(qn)) return counts(qn);
  if (/ (crews?|who is where|whos where|allocation|schedule) /.test(qn)) return noCrew(findDay(qn));
  return fallback(question);
}

// ---------------------------------------------------------------- small talk
function greeting(): Answer {
  return {
    confident: true,
    sources: ['Capcon OS'],
    blocks: [
      {
        kind: 'text',
        text: 'Morning, Donnacha. I answer from live Capcon OS data: jobs, crews, valuations, tenders, tickets and maintenance. Ask me anything in plain English, or try one of these.',
      },
    ],
    suggestions: SUGGESTED.slice(0, 4),
  };
}
function thanks(): Answer {
  return { confident: true, sources: ['Capcon OS'], blocks: [{ kind: 'text', text: 'No problem. Anything else you want to check?' }], suggestions: MORE_QUESTIONS.slice(0, 3) };
}
function help(): Answer {
  return {
    confident: true,
    sources: ['Capcon OS'],
    blocks: [
      { kind: 'text', text: 'I read the same live data as every page in Capcon OS, so the numbers always reconcile. Things I can answer today:' },
      {
        kind: 'text',
        text: [
          '- **Jobs**: progress, crew on site, last update, next milestone, what’s blocking a site',
          '- **Crews**: sites with nobody booked on a given day, and who is free',
          '- **Money**: overdue applications, margin by sector, valuation status',
          '- **Tenders**: what closes this week and who is pricing it',
          '- **People**: expiring IPAF, PASMA, CSCS and Safe Pass tickets',
          '- **Production**: metres installed by region and week',
          '- **Maintenance**: contracts renewing soon',
          '- **Drafting**: progress update emails to main contractors, sent to the approval queue',
        ].join('\n'),
      },
    ],
    suggestions: [...SUGGESTED.slice(0, 3), MORE_QUESTIONS[3]],
  };
}

// ---------------------------------------------------------------- 1. where are we on <job>
function jobStatus(j: Job): Answer {
  const s = state();
  const crewsToday = crewsOn(s.allocation, j.id, TODAY_DAY);
  const heads = peopleOn(s.allocation, j.id, TODAY_DAY);
  const rfis = RFIS.filter((r) => r.jobId === j.id && r.status === 'Open');
  const vars = VARIATIONS.filter((v) => v.jobId === j.id && v.status !== 'Agreed' && v.status !== 'Rejected');
  const vals = s.valuations.filter((v) => v.jobId === j.id).sort((a, b) => b.appNo - a.appNo);
  const latest = vals[0];
  const p = jobPct(j);
  const lu = j.lastUpdate;
  const blocks: Block[] = [];

  if (j.designOnly) {
    blocks.push({
      kind: 'text',
      text: `**${j.name}** is a design-only commission${j.consultant ? ` for ${j.consultant}` : ''}, **${pct(p)} through design**. Stage: ${j.stage}. ${j.healthReason && !isRealContractor(j) ? j.healthReason + '.' : 'Design is on programme.'}`,
    });
    blocks.push({
      kind: 'stats',
      items: [
        { label: 'Design progress', value: pct(p), tone: 'brand' },
        { label: 'Roof area', value: `${num(j.roofArea)} m²` },
        { label: 'Siphonic designed', value: `${num(j.siphonicDesigned)} m` },
      ],
    });
    blocks.push({ kind: 'text', text: `Next milestone: ${milestoneText(j)}.` });
    blocks.push({ kind: 'links', links: [{ label: `Open ${j.shortName}`, to: `/projects/${j.id}` }, { label: 'Design register', to: '/design' }] });
    return { confident: true, sources: ['Jobs', 'Design'], blocks };
  }

  const healthWord = j.health === 'on-track' ? 'on track' : j.health === 'at-risk' ? 'at risk' : 'blocked';
  blocks.push({
    kind: 'text',
    text: `**${j.name}**${forContractor(j)} is **${pct(p)} complete** and ${healthWord}${j.health !== 'on-track' && j.healthReason ? `: ${j.healthReason.charAt(0).toLowerCase() + j.healthReason.slice(1)}` : ''}. Stage: ${j.stage}.`,
  });
  blocks.push({
    kind: 'stats',
    items: [
      { label: 'Complete', value: pct(p), tone: j.health === 'on-track' ? 'ok' : j.health === 'at-risk' ? 'warn' : 'bad' },
      { label: 'Installed', value: `${num(installed(j))} m`, sub: `of ${num(designed(j))} m` },
      { label: 'This week', value: `${num(j.weekToDate)} m`, sub: `of ${num(j.plannedThisWeek)} m planned` },
      { label: 'On site today', value: heads > 0 ? `${heads}` : 'None', sub: heads > 0 ? (heads === 1 ? 'person' : 'people') : 'no crew booked', tone: heads > 0 ? undefined : 'warn' },
    ],
  });
  const sp = j.siphonicDesigned > 0 ? j.siphonicInstalled / j.siphonicDesigned : 0;
  const gp = j.gravityDesigned > 0 ? j.gravityInstalled / j.gravityDesigned : 0;
  blocks.push({
    kind: 'table',
    columns: [{ label: 'System' }, { label: 'Installed', align: 'right' }, { label: 'Designed', align: 'right' }, { label: '%', align: 'right' }],
    rows: [
      { cells: [`Siphonic (${j.system})`, `${num(j.siphonicInstalled)} m`, `${num(j.siphonicDesigned)} m`, pct(sp)] },
      { cells: ['Gravity', `${num(j.gravityInstalled)} m`, `${num(j.gravityDesigned)} m`, pct(gp)] },
    ],
  });

  const lines: string[] = [];
  lines.push(
    crewsToday.length
      ? `- **Crew today**: ${crewsToday.map((c) => `${crewLabel(c)}${crewForeman(c) ? ` (${crewForeman(c)})` : ''}`).join(', ')}`
      : '- **Crew today**: nobody booked',
  );
  lines.push(`- **Last update**: ${ago(lu.at, nowDate())} via ${lu.source}${lu.by && lu.by !== lu.source ? `, from ${lu.by}` : ''}: “${lu.note}”`);
  lines.push(`- **Next milestone**: ${milestoneText(j)}`);
  if (rfis.length || vars.length) {
    const parts: string[] = [];
    if (rfis.length) parts.push(`${rfis.length} open RFI${rfis.length > 1 ? 's' : ''} (${rfis.map((r) => r.id).join(', ')})`);
    if (vars.length) parts.push(`${vars.length} variation${vars.length > 1 ? 's' : ''} in progress (${vars.map((v) => `${v.id} ${fmtMoney(v.value, j.currency)}, ${v.status.toLowerCase()}`).join('; ')})`);
    lines.push(`- **Open items**: ${parts.join(' and ')}`);
  } else {
    lines.push('- **Open items**: no open RFIs or unagreed variations');
  }
  if (latest) {
    const st =
      latest.paid !== null
        ? `paid ${fmtMoney(latest.paid, j.currency)}`
        : latest.certified !== null
          ? `certified at ${fmtMoney(latest.certified, j.currency)}`
          : `applied ${fmtMoney(latest.applied, j.currency)}, awaiting certification`;
    lines.push(`- **Valuation**: application ${latest.appNo} ${st}. October status: ${j.valuationStatus}, cut-off day ${j.mcCutoffDay}`);
  } else {
    lines.push(`- **Valuation**: ${j.valuationStatus}, cut-off day ${j.mcCutoffDay}`);
  }
  blocks.push({ kind: 'text', text: lines.join('\n') });
  blocks.push({
    kind: 'links',
    links: [
      { label: `Open ${j.shortName.length > 22 ? 'job' : j.shortName}`, to: `/projects/${j.id}` },
      { label: 'Crew planner', to: '/crews' },
    ],
  });
  return { confident: true, sources: ['Jobs', 'Crew allocation', 'Diary', 'RFIs', 'Variations', 'Valuations'], blocks, suggestions: [`What's blocking ${j.shortName}?`, `Draft an update email to ${isRealContractor(j) || !['Undisclosed', 'Design only'].includes(j.mainContractor) ? j.mainContractor : 'the main contractor'} on ${j.shortName}.`] };
}

// ---------------------------------------------------------------- 2. sites with no crew
function noCrew(day: DayKey): Answer {
  const s = state();
  const list = sitesWithNoCrew(s.jobs, s.allocation, day);
  const dayText = `${DAY_NAME[day]} (${fmtDate(DAY_DATE[day], { weekday: true })})`;
  const free = Object.keys(s.allocation).filter((c) => c !== 'MT-01' && !s.allocation[c][day]);
  if (!list.length) {
    return {
      confident: true,
      sources: ['Jobs', 'Crew allocation'],
      blocks: [
        { kind: 'text', text: `Every work-ready install site has a crew booked for ${dayText}.${free.length ? ` ${free.length} crew${free.length > 1 ? 's are' : ' is'} still free that day: ${free.map(crewLabel).join(', ')}.` : ''}` },
        { kind: 'links', links: [{ label: 'Open crew planner', to: '/crews' }] },
      ],
    };
  }
  const blocks: Block[] = [
    {
      kind: 'text',
      text: `**${list.length} work-ready site${list.length > 1 ? 's have' : ' has'} nobody booked ${dayText}.**`,
    },
    {
      kind: 'table',
      columns: [{ label: 'Site' }, { label: 'Contractor', wrap: true }, { label: 'Done', align: 'right' }, { label: 'Next milestone', wrap: true }],
      rows: list.map((j) => ({
        cells: [jobShort(j), contractorLabel(j).split(' ')[0], pct(jobPct(j)), `${j.nextMilestone.name}, ${fmtDate(j.nextMilestone.date)}`],
        to: `/projects/${j.id}`,
        tone: j.health === 'at-risk' ? 'warn' : j.health === 'blocked' ? 'bad' : undefined,
      })),
    },
  ];
  // suggestion: free crews in the same region, IE-08 for Clonee by preference
  const used = new Set<string>();
  const sugg: string[] = [];
  const ordered = [...list].sort((a, b) => (a.health === 'at-risk' ? -1 : 0) - (b.health === 'at-risk' ? -1 : 0));
  for (const j of ordered) {
    const pref = j.id === 'CE-2333' && free.includes('IE-08') && !used.has('IE-08') ? 'IE-08' : free.find((c) => c.startsWith(j.region) && !used.has(c));
    if (!pref) continue;
    used.add(pref);
    const restFree = (['Thu', 'Fri'] as DayKey[]).filter((d) => DAYS_AFTER(day).includes(d) && !s.allocation[pref][d]);
    sugg.push(
      `- **${crewLabel(pref)}**${crewForeman(pref) ? ` (${crewForeman(pref)})` : ''} is free ${DAY_NAME[day]}${restFree.length ? ` and ${restFree.join(', ')}` : ''}: could cover **${jobShort(j)}**${j.id === 'CE-2333' ? '. The Scheduler Agent has this queued for your approval' : ''}.`,
    );
  }
  for (const j of list) {
    const later = DAYS_AFTER(day).find((d) => crewsOn(s.allocation, j.id, d).length > 0);
    if (later) sugg.push(`- **${jobShort(j)}**: ${crewLabel(crewsOn(s.allocation, j.id, later)[0]).replace(/ · .*/, '')} is booked from ${later === 'Thu' ? 'Thursday' : later === 'Fri' ? 'Friday' : later}, so it’s a one-day gap.`);
  }
  if (sugg.length) blocks.push({ kind: 'text', text: `Suggestion:\n${sugg.join('\n')}` });
  else blocks.push({ kind: 'text', text: 'No crews are free in the same region that day. Worth checking whether a Thursday start works.' });
  blocks.push({ kind: 'links', links: [{ label: 'Open crew planner', to: '/crews' }, ...(list.some((j) => j.id === 'CE-2333') ? [{ label: 'Clonee data centre', to: '/projects/CE-2333' }] : [])] });
  return { confident: true, sources: ['Jobs', 'Crew allocation', 'Scheduler Agent'], blocks };
}
function DAYS_AFTER(d: DayKey): DayKey[] {
  const all: DayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  return all.slice(all.indexOf(d) + 1);
}

// ---------------------------------------------------------------- 3. applications over N days
function appsOver(qn: string): Answer {
  const s = state();
  const m = qn.match(/ (\d{1,3}) ?days? /);
  const days = m ? Number(m[1]) : 60;
  const list = appsOverDays(s.jobs, s.valuations, days).filter((x) => !x.job.mainContractorPublic);
  if (!list.length) {
    return {
      confident: true,
      sources: ['Valuations', 'Jobs'],
      blocks: [{ kind: 'text', text: `No applications for payment are unpaid beyond ${days} days. Debt is in good shape.` }, { kind: 'links', links: [{ label: 'Open finance', to: '/finance' }] }],
    };
  }
  const total = list.reduce((a, x) => a + toEur(x.v.certified ?? x.v.applied, x.job.currency), 0);
  const oldest = list[0];
  return {
    confident: true,
    sources: ['Valuations', 'Jobs'],
    blocks: [
      {
        kind: 'text',
        text: `**${list.length} application${list.length > 1 ? 's are' : ' is'} unpaid beyond ${days} days**, worth **${eurC(total)}** in group terms. The oldest is ${jobShort(oldest.job)} (${oldest.job.mainContractor}) at ${oldest.age} days.`,
      },
      {
        kind: 'table',
        columns: [{ label: 'Job' }, { label: 'Contractor' }, { label: 'App', align: 'right' }, { label: 'Certified', align: 'right' }, { label: 'Days', align: 'right' }],
        rows: list.map((x) => ({
          cells: [jobShort(x.job), x.job.mainContractor.split(' ')[0], String(x.v.appNo), x.v.certified !== null ? fmtMoney(x.v.certified, x.job.currency) : `${fmtMoney(x.v.applied, x.job.currency)} applied`, String(x.age)],
          to: `/projects/${x.job.id}`,
          tone: x.age > 70 ? 'bad' : 'warn',
        })),
        foot: ['Total', '', '', eurC(total), ''],
      },
      {
        kind: 'text',
        text: list.some((x) => x.job.id === 'CE-2298')
          ? 'Slough is past the final date for payment with no pay less notice from Maresfield, so the full certified sum is due. The Valuation Agent can draft a formal reminder for Valerie.'
          : 'The Valuation Agent can draft reminders for Valerie to approve.',
      },
      { kind: 'links', links: [{ label: 'Open finance', to: '/finance' }] },
    ],
  };
}

// ---------------------------------------------------------------- 4. tenders closing
function tendersClosing(qn: string): Answer {
  const s = state();
  let from = TODAY_ISO;
  let to = '2026-10-11';
  let label = 'this week';
  if (/ next week /.test(qn)) {
    from = '2026-10-12';
    to = '2026-10-18';
    label = 'next week';
  } else if (/ (this month|october) /.test(qn)) {
    to = '2026-10-31';
    label = 'this month';
  } else if (/ (today) /.test(qn)) {
    to = TODAY_ISO;
    label = 'today';
  } else if (/ (tomorrow) /.test(qn)) {
    from = to = isoAdd(1);
    label = 'tomorrow';
  }
  const list = s.tenders.filter((t) => OPEN_STAGES.includes(t.stage) && t.stage !== 'Submitted' && t.closeDate >= from && t.closeDate <= to).sort((a, b) => a.closeDate.localeCompare(b.closeDate));
  if (!list.length) {
    return { confident: true, sources: ['Tenders'], blocks: [{ kind: 'text', text: `No open tenders close ${label}.` }, { kind: 'links', links: [{ label: 'Open tenders', to: '/tenders' }] }] };
  }
  const byEst = new Map<string, number>();
  for (const t of list) byEst.set(t.estimator, (byEst.get(t.estimator) ?? 0) + 1);
  const who = [...byEst.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `**${n}** ${c}`).join(', ');
  const total = list.reduce((a, t) => a + toEur(t.value, t.currency), 0);
  const top = [...byEst.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    confident: true,
    sources: ['Tenders'],
    blocks: [
      { kind: 'text', text: `**${list.length} tender${list.length > 1 ? 's close' : ' closes'} ${label}**, worth ${eurC(total)} in total. Pricing: ${who}.` },
      {
        kind: 'table',
        columns: [{ label: 'Tender' }, { label: 'Closes' }, { label: 'Stage', wrap: true }, { label: 'Estimator' }],
        rows: list.map((t) => ({
          cells: [t.name, fmtDate(t.closeDate, { weekday: true }), t.stage.replace('Design / value engineering', 'Design / VE'), t.estimator.split(' ')[0]],
          to: '/tenders',
          tone: daysUntil(t.closeDate) <= 1 ? 'warn' : undefined,
        })),
      },
      ...(top && top[1] >= 3
        ? [{ kind: 'text' as const, text: `${top[0].split(' ')[0]} has ${top[1]} of them. The Takeoff Agent can draft the BOQs today so he reviews rather than measures.` }]
        : []),
      { kind: 'links', links: [{ label: 'Open tenders', to: '/tenders' }] },
    ],
  };
}

// ---------------------------------------------------------------- 5. expiring tickets
function tickets(qn: string): Answer {
  const s = state();
  const types = TICKET_WORDS.filter(([re]) => re.test(qn)).map(([, t]) => t);
  const typeLabel = types.length ? types.map((t) => t.replace(' 3a/3b', '')).join(' / ') : 'Ticket';
  let list = expiringTickets(400, types.length ? types : undefined);
  let label = 'in the next 30 days';
  if (/ (this month|october) /.test(qn)) {
    list = list.filter((x) => x.expires.startsWith('2026-10'));
    label = 'this month';
  } else if (/ next month /.test(qn)) {
    list = list.filter((x) => x.expires.startsWith('2026-11'));
    label = 'next month';
  } else if (/ (next|this) week /.test(qn)) {
    const nw = / next week /.test(qn);
    list = list.filter((x) => (nw ? x.expires >= '2026-10-12' && x.expires <= '2026-10-18' : x.days >= 0 && x.expires <= '2026-10-11'));
    label = nw ? 'next week' : 'this week';
  } else {
    const m = qn.match(/ (\d{1,3}) days? /);
    const n = m ? Number(m[1]) : 30;
    list = list.filter((x) => x.days <= n && x.days >= -7);
    label = `in the next ${n} days`;
  }
  const typeWord = types.length ? `${typeLabel} ` : '';
  if (!list.length) {
    return { confident: true, sources: ['Technicians', 'Tickets'], blocks: [{ kind: 'text', text: `No ${typeWord}tickets expire ${label}.` }, { kind: 'links', links: [{ label: 'Open crews', to: '/crews' }] }] };
  }
  const siteThisWeek = (crewId: string) => {
    const row = s.allocation[crewId];
    if (!row) return crewId === 'MT-01' ? 'Maintenance visits' : '–';
    const id = row.Tue ?? row.Wed ?? row.Thu ?? row.Fri ?? row.Mon;
    const j = id ? s.jobs.find((x) => x.id === id) : undefined;
    return j ? jobShort(j) : 'Not booked';
  };
  const onRinga = list.filter((x) => s.allocation[x.tech.crewId] && Object.values(s.allocation[x.tech.crewId]).includes('CE-2321'));
  const blocks: Block[] = [
    {
      kind: 'text',
      text: `**${list.length} ${typeWord}ticket${list.length > 1 ? 's expire' : ' expires'} ${label}.**${onRinga.length ? ` ${onRinga.length === 1 ? onRinga[0].tech.name + ' is' : onRinga.map((x) => x.tech.name.split(' ')[0]).join(' and ') + ' are'} on Ringaskiddy, where the client permit-to-work needs valid IPAF.` : ''}`,
    },
    {
      kind: 'table',
      columns: [{ label: 'Name' }, ...(types.length === 1 ? [] : [{ label: 'Ticket' }]), { label: 'Crew' }, { label: 'Site this week', wrap: true }, { label: 'Expires', align: 'right' as const }],
      rows: list.slice(0, 10).map((x) => ({
        cells: [
          x.tech.name,
          ...(types.length === 1 ? [] : [x.type.replace(' 3a/3b', '')]),
          x.tech.crewId,
          siteThisWeek(x.tech.crewId),
          x.days < 0 ? `Expired ${fmtDate(x.expires)}` : fmtDate(x.expires, { weekday: true }),
        ],
        to: '/crews',
        tone: x.days <= 10 ? 'bad' : 'warn',
      })),
    },
  ];
  if (types.includes('IPAF 3a/3b') || !types.length) blocks.push({ kind: 'text', text: 'There’s an IPAF 3a/3b renewal course in Cork on **Thu 15 Oct**. The Compliance Agent can book places and update the permit-to-work pack once the new cards are in.' });
  blocks.push({ kind: 'links', links: [{ label: 'Open crews and tickets', to: '/crews' }, { label: 'HSQE', to: '/hsqe' }] });
  return { confident: true, sources: ['Technicians', 'Tickets', 'Crew allocation'], blocks };
}

// ---------------------------------------------------------------- 6. metres installed
function metresInstalled(qn: string): Answer {
  const s = state();
  const region = findRegion(qn);
  const scope = s.jobs.filter((j) => !region || j.region === region);
  const where = region === 'UK' ? 'in the UK' : region === 'IE' ? 'in Ireland' : 'across the group';
  const weeks = weeklyMetres(s.jobs, region);
  const chart: Block = {
    kind: 'chart',
    type: 'bar',
    unit: 'm',
    data: weeks.map((v, i) => ({ label: weekLabel(i - 12), value: v, highlight: i === 11 })),
    caption: `Metres installed ${where}, last 12 completed weeks (w/c)`,
  };
  if (/ this week | so far | week to date | today /.test(qn)) {
    const wtd = scope.reduce((a, j) => a + j.weekToDate, 0);
    const plan = scope.reduce((a, j) => a + j.plannedThisWeek, 0);
    const top = [...scope].filter((j) => j.weekToDate > 0).sort((a, b) => b.weekToDate - a.weekToDate).slice(0, 3);
    return {
      confident: true,
      sources: ['Jobs', 'Diary', 'Foreman app'],
      blocks: [
        { kind: 'text', text: `**${num(wtd)} m installed ${where} so far this week** (Mon 5 Oct to now), against **${num(plan)} m** planned for the week (${pct(plan > 0 ? wtd / plan : 0)}). It’s Tuesday morning, so that’s roughly where we’d expect to be.` },
        {
          kind: 'table',
          columns: [{ label: 'Job' }, { label: 'Region' }, { label: 'This week', align: 'right' }, { label: 'Planned', align: 'right' }],
          rows: top.map((j) => ({ cells: [jobShort(j), j.region, `${num(j.weekToDate)} m`, `${num(j.plannedThisWeek)} m`], to: `/projects/${j.id}` })),
        },
        chart,
        { kind: 'links', links: [{ label: 'Open projects', to: '/projects' }] },
      ],
    };
  }
  const last = weeks[11] ?? 0;
  const prev = weeks[10] ?? 0;
  const diff = last - prev;
  const avg = weeks.reduce((a, v) => a + v, 0) / Math.max(1, weeks.length);
  const top = [...scope].filter((j) => (j.weeklyInstalled[11] ?? 0) > 0).sort((a, b) => (b.weeklyInstalled[11] ?? 0) - (a.weeklyInstalled[11] ?? 0)).slice(0, 3);
  return {
    confident: true,
    sources: ['Jobs', 'Diary', 'Foreman app'],
    blocks: [
      {
        kind: 'text',
        text: `We installed **${num(last)} m ${where} last week** (w/c ${weekLabel(-1)}), ${diff >= 0 ? 'up' : 'down'} **${num(Math.abs(diff))} m** on the week before (${num(prev)} m). The 12-week average is ${num(Math.round(avg))} m.`,
      },
      {
        kind: 'table',
        columns: [{ label: 'Top jobs last week' }, ...(region ? [] : [{ label: 'Region' }]), { label: 'Metres', align: 'right' as const }, { label: 'Share', align: 'right' as const }],
        rows: top.map((j) => ({
          cells: [jobShort(j), ...(region ? [] : [j.region]), `${num(j.weeklyInstalled[11] ?? 0)} m`, pct(last > 0 ? (j.weeklyInstalled[11] ?? 0) / last : 0)],
          to: `/projects/${j.id}`,
        })),
      },
      chart,
      { kind: 'links', links: [{ label: 'Open projects', to: '/projects' }] },
    ],
  };
}

// ---------------------------------------------------------------- 7. margin
function margin(qn: string): Answer {
  const s = state();
  const sector = findSector(qn);
  const ytd = / (this year|ytd|year to date|2026) /.test(qn);
  const bySector = marginBySector(s.jobs);
  const chart: Block = {
    kind: 'chart',
    type: 'bar',
    unit: '%',
    data: bySector.map((x) => ({ label: x.sector.replace('Pharmaceutical', 'Pharma').replace('Data Centre', 'DC'), value: Math.round(x.margin * 1000) / 10, highlight: x.sector === sector })),
    caption: 'Margin on earned value by sector, live jobs',
  };
  const groupE = bySector.reduce((a, x) => a + x.earned, 0);
  const groupC = bySector.reduce((a, x) => a + x.cost, 0);
  const groupM = groupE > 0 ? (groupE - groupC) / groupE : 0;
  if (!sector) {
    const best = [...bySector].sort((a, b) => b.margin - a.margin)[0];
    return {
      confident: true,
      sources: ['Jobs', 'Cost to date'],
      blocks: [
        { kind: 'text', text: `Group margin on earned value is **${pct(groupM, 1)}** across ${bySector.reduce((a, x) => a + x.jobs, 0)} live jobs. ${best ? `${best.sector} is strongest at ${pct(best.margin, 1)}.` : ''}` },
        chart,
        { kind: 'links', links: [{ label: 'Open finance', to: '/finance' }] },
      ],
    };
  }
  let js = s.jobs.filter((j) => j.sector === sector && !j.designOnly && jobPct(j) > 0);
  let scopeText = 'across live jobs';
  if (ytd) {
    const y = js.filter((j) => j.ytd);
    if (y.length) {
      js = y;
      scopeText = 'on jobs started this year';
    }
  }
  const e = js.reduce((a, j) => a + toEur(earned(j), j.currency), 0);
  const c = js.reduce((a, j) => a + toEur(j.costToDate, j.currency), 0);
  const m = e > 0 ? (e - c) / e : 0;
  const rows = js
    .map((j) => {
      const je = earned(j);
      return { j, je, jm: je > 0 ? (je - j.costToDate) / je : 0 };
    })
    .sort((a, b) => b.je - a.je)
    .slice(0, 8);
  const word = sector === 'Pharmaceutical' ? 'pharma' : sector.toLowerCase();
  return {
    confident: true,
    sources: ['Jobs', 'Cost to date', 'Valuations'],
    blocks: [
      {
        kind: 'text',
        text: `Margin on ${word} work ${scopeText} is **${pct(m, 1)}** on ${eurC(e)} earned to date (${js.length} job${js.length === 1 ? '' : 's'}). That’s ${m >= groupM ? 'ahead of' : 'behind'} the group at ${pct(groupM, 1)}.`,
      },
      {
        kind: 'table',
        columns: [{ label: 'Job' }, { label: 'Earned', align: 'right' }, { label: 'Cost', align: 'right' }, { label: 'Margin', align: 'right' }],
        rows: rows.map(({ j, je, jm }) => ({ cells: [jobShort(j), fmtMoney(je, j.currency), fmtMoney(j.costToDate, j.currency), pct(jm, 1)], to: `/projects/${j.id}`, tone: jm < 0.12 ? 'warn' : undefined })),
        foot: js.length > 8 ? [`+ ${js.length - 8} more`, '', '', ''] : undefined,
      },
      chart,
      { kind: 'links', links: [{ label: 'Open finance', to: '/finance' }] },
    ],
  };
}

// ---------------------------------------------------------------- 8. maintenance renewals
function maintRenewals(qn: string): Answer {
  const m = qn.match(/ (\d{1,3}) days? /);
  const months = qn.match(/ (\d{1,2}) months? /);
  const days = m ? Number(m[1]) : months ? Number(months[1]) * 30 : / (this month) /.test(qn) ? 25 : 90;
  const list = MAINT_CONTRACTS.filter((c) => {
    const d = daysUntil(c.renewal);
    return d >= 0 && d <= days;
  }).sort((a, b) => a.renewal.localeCompare(b.renewal));
  const total = list.reduce((a, c) => a + toEur(c.annualValue, c.currency), 0);
  if (!list.length) {
    return { confident: true, sources: ['Maintenance contracts'], blocks: [{ kind: 'text', text: `No maintenance contracts renew in the next ${days} days.` }, { kind: 'links', links: [{ label: 'Open maintenance', to: '/maintenance' }] }] };
  }
  const biggest = [...list].sort((a, b) => toEur(b.annualValue, b.currency) - toEur(a.annualValue, a.currency))[0];
  return {
    confident: true,
    sources: ['Maintenance contracts', 'Buildings'],
    blocks: [
      {
        kind: 'text',
        text: `**${list.length} maintenance contract${list.length > 1 ? 's renew' : ' renews'} in the next ${days} days**, worth **${eurC(total)} a year** between them. The largest is ${biggest.site} at ${fmtMoney(biggest.annualValue, biggest.currency)} a year.`,
      },
      {
        kind: 'table',
        columns: [{ label: 'Site' }, { label: 'Renews', wrap: true }, { label: 'Annual', align: 'right' }, { label: 'Visits', align: 'right' }],
        rows: list.slice(0, 8).map((c) => ({
          cells: [c.client === 'Confidential' ? c.site : `${c.site}`, `${fmtDate(c.renewal)} (${daysUntil(c.renewal)}d)`, fmtMoney(c.annualValue, c.currency), `${c.visitsPerYear}/yr`],
          to: '/maintenance',
          tone: daysUntil(c.renewal) <= 30 ? 'warn' : undefined,
        })),
        foot: list.length > 8 ? [`+ ${list.length - 8} more`, '', '', ''] : undefined,
      },
      { kind: 'text', text: 'The Maintenance Agent drafts each renewal pack with a condition summary from the last inspection, ready for Robert to review.' },
      { kind: 'links', links: [{ label: 'Open maintenance', to: '/maintenance' }] },
    ],
  };
}

// ---------------------------------------------------------------- 9. what's blocking <job>
function blocking(j: Job): Answer {
  const s = state();
  const held = s.spools.filter((x) => x.jobId === j.id && x.stage === 'Pressure tested');
  const rfis = RFIS.filter((r) => r.jobId === j.id && r.status === 'Open');
  const vars = VARIATIONS.filter((v) => v.jobId === j.id && (v.status === 'Instructed (verbal)' || v.status === 'Pending pricing'));
  const crewTomorrow = crewsOn(s.allocation, j.id, TOMORROW_DAY);
  const real = isRealContractor(j);
  const items: string[] = [];
  if (j.health !== 'on-track' && j.healthReason) items.push(`- **Status**: ${j.healthReason}`);
  if (held.length) items.push(`- **Spools held**: ${held.length} spool${held.length > 1 ? 's' : ''} (${num(held.reduce((a, x) => a + x.length, 0), 1)} m) at pressure test in prefab, waiting on re-test before QC and dispatch`);
  if (!real && rfis.length && !/rfi/i.test(j.healthReason ?? '')) items.push(`- **RFIs**: ${rfis.length} open`);
  if (!real && vars.length) items.push(`- **Variations**: ${vars.map((v) => `${v.id} ${v.status.toLowerCase()}`).join(', ')}`);
  if (!j.workReady && j.stage === 'Install') items.push('- **Work face**: not available yet');
  if (j.stage === 'Install' && j.workReady && j.health !== 'blocked' && crewTomorrow.length === 0) items.push('- **Labour**: no crew booked tomorrow');
  const blocks: Block[] = [];
  if (!items.length || (j.health === 'on-track' && !held.length)) {
    blocks.push({ kind: 'text', text: `Nothing is blocking **${j.name}**. It’s ${pct(jobPct(j))} complete and on track; next up is ${milestoneText(j)}.${rfis.length ? ` There ${rfis.length === 1 ? 'is 1 routine RFI' : `are ${rfis.length} routine RFIs`} open, none on the critical path.` : ''}` });
    blocks.push({ kind: 'links', links: [{ label: `Open ${j.shortName.length > 22 ? 'job' : j.shortName}`, to: `/projects/${j.id}` }] });
    return { confident: true, sources: ['Jobs', 'RFIs', 'Prefab'], blocks };
  }
  blocks.push({ kind: 'text', text: `**${j.name}** is ${j.health === 'blocked' ? 'blocked' : 'at risk'} at ${pct(jobPct(j))} complete. What’s holding it:\n${items.join('\n')}` });
  if (held.length) {
    blocks.push({
      kind: 'table',
      columns: [{ label: 'Spool' }, { label: 'Material' }, { label: 'Ø', align: 'right' }, { label: 'Length', align: 'right' }, { label: 'Site need', align: 'right' }],
      rows: held.slice(0, 6).map((x) => ({ cells: [x.id, x.material, `${x.diameter} mm`, `${num(x.length, 1)} m`, fmtDate(x.due)], to: '/prefab', tone: daysUntil(x.due) <= 7 ? 'warn' : undefined })),
      foot: held.length > 6 ? [`+ ${held.length - 6} more`, '', '', '', ''] : undefined,
    });
  }
  if (!real && rfis.length) {
    blocks.push({
      kind: 'table',
      columns: [{ label: 'RFI' }, { label: 'Subject', wrap: true }, { label: 'Open', align: 'right' }],
      rows: rfis.map((r) => ({ cells: [r.id, r.subject, `${Math.max(0, daysBetween(r.raised, TODAY_ISO))}d`], to: `/projects/${j.id}`, tone: daysBetween(r.raised, TODAY_ISO) > 7 ? 'warn' : undefined })),
    });
  }
  const next =
    j.id === 'CE-2304'
      ? 'The prefab re-test is booked for **Thursday**; if the spools pass QC they can be on site for the Zone C start. Chasing the three RFIs today keeps that date.'
      : j.id === 'CE-2340'
        ? 'The crew has been stood down until Halden hands over Zones 3 and 4. A RAMS revision for the revised sequence is needed before restart.'
        : j.id === 'CE-2333'
          ? 'Booking IE Crew 8 from Wednesday to Friday (approval AP-2) recovers most of the slippage.'
          : j.id === 'CE-2326'
            ? 'A chaser to Slaney Build is drafted in the approval queue asking for a response by Thursday.'
            : '';
  blocks.push({ kind: 'text', text: `Next milestone: ${milestoneText(j)}.${next ? `\n${next}` : ''}` });
  blocks.push({
    kind: 'links',
    links: [{ label: `Open ${j.shortName.length > 22 ? 'job' : j.shortName}`, to: `/projects/${j.id}` }, ...(held.length ? [{ label: 'Prefab', to: '/prefab' }] : []), ...(j.id === 'CE-2333' ? [{ label: 'Crew planner', to: '/crews' }] : [])],
  });
  return { confident: true, sources: ['Jobs', 'Prefab spools', 'RFIs', 'Variations', 'Crew allocation'], blocks };
}

// ---------------------------------------------------------------- 10. draft an email
function draftEmail(jobIn: Job | undefined, contractorIn: string | undefined): Answer {
  const s = state();
  let j = jobIn;
  if (!j && contractorIn) {
    const theirs = s.jobs.filter((x) => x.mainContractor === contractorIn);
    j = theirs.find((x) => x.showcase) ?? theirs.filter((x) => x.stage === 'Install').sort((a, b) => b.contractValue - a.contractValue)[0] ?? theirs[0];
  }
  if (!j) return fallback('');
  const contractor = contractorIn ?? j.mainContractor;
  const undisclosed = contractor === 'Undisclosed' || contractor === 'Design only';
  const real = isRealContractor(j);
  const crews = crewsOn(s.allocation, j.id, TODAY_DAY);
  const lastWeek = j.weeklyInstalled[11] ?? 0;
  const foreman = crews.length ? crewForeman(crews[0]) : '';
  const p = jobPct(j);
  const rfis = RFIS.filter((r) => r.jobId === j.id && r.status === 'Open');
  const subject = `${j.name}: progress update, week commencing 5 October`;
  const greet = undisclosed ? 'Hi all,' : `Hi ${contractor.replace(/ (Construction|Contracting|Ltd)$/, '')} team,`;
  const paras: string[] = [];
  if (j.designOnly) {
    paras.push(`A short update on our design package for ${j.name}. Design is now ${pct(p)} complete and on programme.`);
  } else {
    paras.push(
      `A short update on the rainwater drainage package at ${j.name.split(',')[0]}. We are now ${pct(p)} complete, with ${num(installed(j))} m of the ${num(designed(j))} m designed installed to date (siphonic ${num(j.siphonicInstalled)} m, gravity ${num(j.gravityInstalled)} m).`,
    );
    paras.push(
      `Last week the team installed ${num(lastWeek)} m, and a further ${num(j.weekToDate)} m is in so far this week against ${num(j.plannedThisWeek)} m planned.${crews.length ? ` ${crews.length === 1 ? crewLabel(crews[0]).replace(/ · .*/, '') : `${crews.length} crews`} ${crews.length === 1 ? 'is' : 'are'} on site${foreman ? `, led by ${foreman}` : ''}.` : ''}`,
    );
  }
  const steps: string[] = [];
  steps.push(`${j.nextMilestone.name} on ${fmtDate(j.nextMilestone.date, { weekday: true })}. We will confirm the time with your site team a couple of days ahead.`);
  if (!j.designOnly && j.stage === 'Install') steps.push('Continued collector and stack installation in line with the current programme.');
  if (!real && rfis.length) steps.push(`A response on ${rfis.map((r) => r.id).join(', ')} would help us keep the next zone on programme.`);
  if (j.valuationStatus === 'Draft' || j.valuationStatus === 'Not started') steps.push(`Our October application will be with you before the ${ordinal(j.mcCutoffDay)} cut-off.`);
  paras.push(`Next steps:\n${steps.map((x) => `- ${x}`).join('\n')}`);
  paras.push('If anything changes on your side, or you would like to walk the roof together, just let me know.');
  const body = [greet, '', ...paras.flatMap((x) => [x, '']), 'Kind regards,', '', 'Donnacha Tobin', 'Operations Director', 'Capcon Engineering Ltd, Maynooth, Co. Kildare'].join('\n');
  return {
    confident: true,
    sources: ['Jobs', 'Diary', 'Crew allocation', 'Programme'],
    blocks: [
      { kind: 'text', text: `Here’s a draft progress update to **${undisclosed ? 'the main contractor' : contractor}** on ${j.shortName}, built from this week’s live numbers. Edit, copy, or send it to the approval queue.` },
      { kind: 'email', to: undisclosed ? 'Main contractor (undisclosed)' : contractor, subject, body, jobId: j.id, contractor: undisclosed ? 'the main contractor' : contractor, jobName: j.shortName },
    ],
  };
}
function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ---------------------------------------------------------------- contractor, counts, risk
function contractorSummary(mc: string): Answer {
  const s = state();
  const js = s.jobs.filter((j) => j.mainContractor === mc);
  const live = js.filter((j) => j.stage === 'Install');
  return {
    confident: true,
    sources: ['Jobs'],
    blocks: [
      { kind: 'text', text: `We have **${js.length} job${js.length === 1 ? '' : 's'}** with ${mc}, ${live.length} on site.` },
      {
        kind: 'table',
        columns: [{ label: 'Job' }, { label: 'Stage', wrap: true }, { label: 'Done', align: 'right' }, { label: 'Value', align: 'right' }],
        rows: js.slice(0, 8).map((j) => ({ cells: [jobShort(j), j.stage, pct(jobPct(j)), fmtMoney(j.contractValue, j.currency)], to: `/projects/${j.id}`, tone: !isRealContractor(j) && j.health !== 'on-track' ? 'warn' : undefined })),
      },
      { kind: 'links', links: [{ label: 'Open projects', to: '/projects' }] },
    ],
    suggestions: js[0] ? [`Draft an update email to ${mc} on ${js[0].shortName}.`] : undefined,
  };
}

function counts(qn: string): Answer {
  const s = state();
  const jobs = s.jobs;
  const region = findRegion(qn);
  const scope = jobs.filter((j) => !region || j.region === region);
  const onSite = scope.filter((j) => j.stage === 'Install');
  const atRiskN = scope.filter((j) => j.health !== 'on-track').length;
  const value = scope.reduce((a, j) => a + toEur(j.contractValue, j.currency), 0);
  const stages = ['Design', 'Prefabrication', 'Install', 'Testing & commissioning', 'Handover'] as const;
  const where = region === 'UK' ? ' in the UK' : region === 'IE' ? ' in Ireland' : '';
  return {
    confident: true,
    sources: ['Jobs'],
    blocks: [
      { kind: 'text', text: `We have **${scope.length} live jobs${where}**, ${onSite.length} of them on site installing. Contract value ${eurC(value)}; ${atRiskN} flagged at risk or blocked.` },
      {
        kind: 'stats',
        items: [
          { label: 'Live jobs', value: num(scope.length), tone: 'brand' },
          { label: 'On site', value: num(onSite.length) },
          { label: 'At risk', value: num(atRiskN), tone: atRiskN ? 'warn' : 'ok' },
        ],
      },
      {
        kind: 'table',
        columns: [{ label: 'Stage' }, { label: 'IE', align: 'right' }, { label: 'UK', align: 'right' }, { label: 'Overseas', align: 'right' }],
        rows: stages.map((st) => ({
          cells: [st, num(jobs.filter((j) => j.stage === st && j.region === 'IE').length), num(jobs.filter((j) => j.stage === st && j.region === 'UK').length), num(jobs.filter((j) => j.stage === st && j.region !== 'IE' && j.region !== 'UK').length)],
        })),
      },
      { kind: 'links', links: [{ label: 'Open projects', to: '/projects' }, { label: 'Command centre', to: '/command' }] },
    ],
  };
}

function atRisk(): Answer {
  const s = state();
  const list = s.jobs
    .filter((j) => j.health !== 'on-track')
    .sort((a, b) => (a.health === 'blocked' ? -1 : 0) - (b.health === 'blocked' ? -1 : 0) || b.contractValue - a.contractValue);
  const blocked = list.filter((j) => j.health === 'blocked').length;
  return {
    confident: true,
    sources: ['Jobs', 'Agents'],
    blocks: [
      { kind: 'text', text: `**${list.length} jobs need attention**: ${blocked} blocked and ${list.length - blocked} at risk. The ones that matter most this week are at the top.` },
      {
        kind: 'table',
        columns: [{ label: 'Job' }, { label: 'Why', wrap: true }],
        rows: list.slice(0, 8).map((j) => ({ cells: [jobShort(j), j.healthReason ?? 'Programme pressure'], to: `/projects/${j.id}`, tone: j.health === 'blocked' ? 'bad' : 'warn' })),
        foot: list.length > 8 ? [`+ ${list.length - 8} more`, ''] : undefined,
      },
      { kind: 'links', links: [{ label: 'Command centre', to: '/command' }, { label: 'Projects', to: '/projects' }] },
    ],
    suggestions: ["What's blocking NLHPP?", 'Which sites have nobody on them tomorrow?'],
  };
}

// ---------------------------------------------------------------- fallback
export function closestQuestions(question: string, n = 3): string[] {
  const words = new Set(norm(question).trim().split(' ').filter((w) => w.length > 3));
  const scored = ALL_QUESTIONS.map((q) => {
    const qw = norm(q).trim().split(' ');
    return { q, s: qw.filter((w) => words.has(w)).length };
  }).sort((a, b) => b.s - a.s);
  const top = scored.filter((x) => x.s > 0).slice(0, n).map((x) => x.q);
  for (const q of SUGGESTED) if (top.length < n && !top.includes(q)) top.push(q);
  return top;
}

export function fallback(question: string): Answer {
  return {
    confident: false,
    sources: ['Capcon OS'],
    blocks: [
      {
        kind: 'text',
        text: 'I don’t have a confident answer to that from Capcon OS data yet. I can tell you about jobs, crews, valuations, tenders, tickets, production and maintenance. These are close:',
      },
    ],
    suggestions: closestQuestions(question),
  };
}

// ---------------------------------------------------------------- data slice for the Claude API path
export function dataSlice() {
  const s = state();
  const jobs = s.jobs;
  return {
    today: 'Tuesday 6 October 2026, 08:30',
    totals: {
      liveJobs: jobs.length,
      onSite: jobs.filter((j) => j.stage === 'Install').length,
      atRisk: jobs.filter((j) => j.health !== 'on-track').length,
    },
    keyJobs: jobs.slice(0, 20).map((j) => ({
      id: j.id,
      name: j.name,
      contractor: j.mainContractor,
      sector: j.sector,
      region: j.region,
      stage: j.stage,
      pctComplete: Math.round(jobPct(j) * 100),
      health: j.health,
      reason: isRealContractor(j) ? undefined : j.healthReason,
      nextMilestone: `${j.nextMilestone.name} ${j.nextMilestone.date}`,
    })),
    tendersClosingThisWeek: s.tenders
      .filter((t) => OPEN_STAGES.includes(t.stage) && t.closeDate >= TODAY_ISO && t.closeDate <= '2026-10-11')
      .map((t) => ({ name: t.name, closes: t.closeDate, estimator: t.estimator, stage: t.stage })),
    pendingApprovals: s.approvals.filter((a) => a.status === 'Pending').map((a) => a.title),
  };
}
