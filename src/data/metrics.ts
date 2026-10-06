// Pure selectors/derived metrics. Everything on screen should come through
// these so numbers reconcile across pages.
import type { Allocation, AttentionItem, DayKey, Job, Sector, Technician, Tender, TicketType, Valuation } from './types';
import { DAYS, SECTORS } from './types';
import { CREWS, HS_ITEMS, MAINT_CONTRACTS, MAINT_VISITS, MONTHS_12, RFIS, TECHNICIANS, VARIATIONS, techById } from './seed';
import { toEur } from '../lib/format';
import { TODAY_ISO, daysBetween, daysUntil, isoAdd } from '../lib/dates';

export const designed = (j: Job) => j.siphonicDesigned + j.gravityDesigned;
export const installed = (j: Job) => j.siphonicInstalled + j.gravityInstalled;
/** % complete: installed / designed for install jobs, design progress for design-only. */
export const jobPct = (j: Job) => (j.designOnly ? j.designProgress : designed(j) > 0 ? installed(j) / designed(j) : 0);
export const ratePerMetre = (j: Job) => (designed(j) > 0 ? j.contractValue / designed(j) : 0);
export const earned = (j: Job) => j.contractValue * jobPct(j);

export const agreedVarsFor = (jobId: string) =>
  VARIATIONS.filter((v) => v.jobId === jobId && v.status === 'Agreed').reduce((a, v) => a + v.value, 0);

export const TODAY_DAY: DayKey = 'Tue';
export const TOMORROW_DAY: DayKey = 'Wed';

export function crewsOn(alloc: Allocation, jobId: string, day: DayKey): string[] {
  return Object.entries(alloc)
    .filter(([, row]) => row[day] === jobId)
    .map(([crewId]) => crewId);
}

export function peopleOn(alloc: Allocation, jobId: string, day: DayKey): number {
  return crewsOn(alloc, jobId, day).reduce((a, c) => a + (CREWS.find((x) => x.id === c)?.memberIds.length ?? 0), 0);
}

/** Install-stage sites with work ready and nobody booked on the given day. */
export function sitesWithNoCrew(jobs: Job[], alloc: Allocation, day: DayKey): Job[] {
  // Showcase (real, public) jobs are planned around their own programmes and never listed as gaps.
  return jobs.filter((j) => j.stage === 'Install' && j.workReady && !j.showcase && j.health !== 'blocked' && crewsOn(alloc, j.id, day).length === 0);
}

export function crewUtilisation(alloc: Allocation): number {
  let booked = 0;
  let total = 0;
  for (const [crewId, row] of Object.entries(alloc)) {
    if (crewId === 'MT-01') continue;
    for (const d of DAYS) {
      total++;
      if (row[d]) booked++;
    }
  }
  return total ? booked / total : 0;
}

export function regionSplit(jobs: Job[]) {
  return {
    IE: jobs.filter((j) => j.region === 'IE').length,
    UK: jobs.filter((j) => j.region === 'UK').length,
    overseas: jobs.filter((j) => j.region !== 'IE' && j.region !== 'UK').length,
  };
}

/** Week-by-week metres installed (12 completed weeks + this week to date). */
export function weeklyMetres(jobs: Job[], region?: 'IE' | 'UK') {
  const js = jobs.filter((j) => !region || j.region === region);
  const out: number[] = Array(12).fill(0);
  for (const j of js) j.weeklyInstalled.forEach((v, i) => (out[i] += v));
  return out;
}
export const weekToDate = (jobs: Job[]) => jobs.reduce((a, j) => a + j.weekToDate, 0);
export const plannedThisWeek = (jobs: Job[]) => jobs.reduce((a, j) => a + j.plannedThisWeek, 0);

// ---------------------------------------------------------------- money
export function certifiedTotal(vals: Valuation[], jobId: string) {
  return vals.filter((v) => v.jobId === jobId).reduce((a, v) => a + (v.certified ?? 0), 0);
}
export function appliedTotal(vals: Valuation[], jobId: string) {
  return vals.filter((v) => v.jobId === jobId).reduce((a, v) => a + v.applied, 0);
}
export function paidTotal(vals: Valuation[], jobId: string) {
  return vals.filter((v) => v.jobId === jobId).reduce((a, v) => a + (v.paid ?? 0), 0);
}

/** WIP = value earned to date (incl. agreed variations) not yet certified. Group EUR. */
export function wipEur(jobs: Job[], vals: Valuation[]) {
  let t = 0;
  for (const j of jobs) {
    const e = earned(j) + agreedVarsFor(j.id);
    const c = certifiedTotal(vals, j.id);
    t += toEur(Math.max(0, e - c), j.currency);
  }
  return t;
}

/** Applications submitted but not yet paid. */
export function outstandingApps(jobs: Job[], vals: Valuation[]) {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const list = vals.filter((v) => v.paid === null && byId.has(v.jobId));
  const value = list.reduce((a, v) => a + toEur(v.certified ?? v.applied, byId.get(v.jobId)!.currency), 0);
  return { count: list.length, value, list };
}

export function appsOverDays(jobs: Job[], vals: Valuation[], days: number) {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  return vals
    .filter((v) => v.paid === null && daysBetween(v.submitted, TODAY_ISO) > days && byId.has(v.jobId))
    .map((v) => ({ v, job: byId.get(v.jobId)!, age: daysBetween(v.submitted, TODAY_ISO) }))
    .sort((a, b) => b.age - a.age);
}

export function cashReceived(jobs: Job[], vals: Valuation[], sinceDays = 30) {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const from = isoAdd(-sinceDays);
  return vals
    .filter((v) => v.paid !== null && v.paidOn && v.paidOn >= from && v.paidOn <= TODAY_ISO)
    .reduce((a, v) => a + toEur(v.paid!, byId.get(v.jobId)?.currency ?? 'EUR'), 0);
}

export function retentionHeld(jobs: Job[], vals: Valuation[]) {
  return jobs.reduce((a, j) => a + toEur(certifiedTotal(vals, j.id) * j.retentionPct * (j.stage === 'Handover' ? 0.5 : 1), j.currency), 0);
}

export function agedDebt(jobs: Job[], vals: Valuation[]) {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const buckets = { current: 0, '31-60': 0, '61-90': 0, '90+': 0 } as Record<string, number>;
  for (const v of vals) {
    if (v.certified === null || v.paid !== null) continue;
    const age = daysBetween(v.submitted, TODAY_ISO);
    const val = toEur(v.certified, byId.get(v.jobId)?.currency ?? 'EUR');
    if (age <= 30) buckets.current += val;
    else if (age <= 60) buckets['31-60'] += val;
    else if (age <= 90) buckets['61-90'] += val;
    else buckets['90+'] += val;
  }
  return buckets;
}

/** Revenue (certified/applied value by month) vs cost, group EUR, last 12 months. */
export function revenueVsCost(jobs: Job[], vals: Valuation[]) {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  return MONTHS_12.map((m) => {
    let rev = 0;
    let cost = 0;
    for (const v of vals) {
      if (v.month !== m) continue;
      const j = byId.get(v.jobId);
      if (!j) continue;
      const r = toEur(v.applied, j.currency);
      rev += r;
      cost += r * (1 - j.forecastMarginPct);
    }
    // jobs completed since (no longer in the live list) keep the early months honest
    const i = MONTHS_12.indexOf(m);
    const floor = 1_520_000 * (1 + i * 0.012) * (1 + Math.sin(i * 1.7) * 0.04);
    if (rev < floor) {
      cost += (floor - rev) * 0.83;
      rev = floor;
    }
    // maintenance recurring revenue
    const maint = MAINT_CONTRACTS.reduce((a, c) => a + toEur(c.annualValue, c.currency), 0) / 12;
    rev += maint;
    cost += maint * 0.62;
    return { month: m, revenue: Math.round(rev), cost: Math.round(cost) };
  });
}

export function marginBySector(jobs: Job[]) {
  return SECTORS.map((s) => {
    const js = jobs.filter((j) => j.sector === s && !j.designOnly && jobPct(j) > 0);
    const e = js.reduce((a, j) => a + toEur(earned(j), j.currency), 0);
    const c = js.reduce((a, j) => a + toEur(j.costToDate, j.currency), 0);
    return { sector: s, earned: e, cost: c, margin: e > 0 ? (e - c) / e : 0, jobs: js.length };
  }).filter((x) => x.jobs > 0);
}

// ---------------------------------------------------------------- tenders
export const OPEN_STAGES = ['Enquiry received', 'Drawings reviewed', 'Design / value engineering', 'Priced', 'Submitted'];
export const openTenders = (ts: Tender[]) => ts.filter((t) => OPEN_STAGES.includes(t.stage));
export const pipelineValueEur = (ts: Tender[]) => openTenders(ts).reduce((a, t) => a + toEur(t.value, t.currency), 0);
export function winRate(ts: Tender[]) {
  const w = ts.filter((t) => t.stage === 'Won').length;
  const l = ts.filter((t) => t.stage === 'Lost').length;
  return w + l > 0 ? w / (w + l) : 0;
}
export function winRateBySector(ts: Tender[]) {
  return SECTORS.map((s) => {
    const w = ts.filter((t) => t.sector === s && t.stage === 'Won').length;
    const l = ts.filter((t) => t.sector === s && t.stage === 'Lost').length;
    return { sector: s as Sector, won: w, lost: l, rate: w + l > 0 ? w / (w + l) : 0 };
  }).filter((x) => x.won + x.lost > 0);
}
export function winRateByContractor(ts: Tender[]) {
  const mcs = [...new Set(ts.map((t) => t.mainContractor))];
  return mcs
    .map((m) => {
      const w = ts.filter((t) => t.mainContractor === m && t.stage === 'Won').length;
      const l = ts.filter((t) => t.mainContractor === m && t.stage === 'Lost').length;
      return { mc: m, won: w, lost: l, rate: w + l > 0 ? w / (w + l) : 0 };
    })
    .filter((x) => x.won + x.lost > 0)
    .sort((a, b) => b.rate - a.rate);
}

// ---------------------------------------------------------------- people
export function expiringTickets(days: number, types?: TicketType[], techs: Technician[] = TECHNICIANS) {
  const out: { tech: Technician; type: TicketType; expires: string; days: number }[] = [];
  for (const t of techs) {
    for (const k of t.tickets) {
      if (types && !types.includes(k.type)) continue;
      const d = daysUntil(k.expires);
      if (d <= days) out.push({ tech: t, type: k.type, expires: k.expires, days: d });
    }
  }
  return out.sort((a, b) => a.days - b.days);
}

export function crewJobOn(alloc: Allocation, crewId: string, day: DayKey) {
  return alloc[crewId]?.[day] ?? null;
}

export function foremanName(crewId: string) {
  const c = CREWS.find((x) => x.id === crewId);
  return c ? techById(c.foremanId)?.name ?? '' : '';
}

// ---------------------------------------------------------------- HSQE / maint
export const nearMisses30 = () => HS_ITEMS.filter((h) => h.type === 'Near miss' && daysUntil(h.date) >= -30).length;
export const maintVisitsDue = (days = 30) => MAINT_VISITS.filter((v) => v.status === 'Scheduled' && daysUntil(v.date) >= 0 && daysUntil(v.date) <= days).length;
export const openRfis = (jobId?: string) => RFIS.filter((r) => r.status === 'Open' && (!jobId || r.jobId === jobId));

export function handoverOutstanding(jobs: Job[]) {
  return jobs.filter((j) => (j.stage === 'Testing & commissioning' || j.stage === 'Handover') && j.handoverReadiness < 1);
}

// ---------------------------------------------------------------- attention
export function attentionItems(jobs: Job[], alloc: Allocation): AttentionItem[] {
  const items: AttentionItem[] = [];
  const noCrew = sitesWithNoCrew(jobs, alloc, TOMORROW_DAY);
  const clonee = jobs.find((j) => j.id === 'CE-2333')!;
  if (noCrew.some((j) => j.id === 'CE-2333')) {
    items.push({
      id: 'att-clonee',
      severity: 'high',
      agent: 'scheduler',
      title: `${clonee.name} is 6 days behind with no crew booked tomorrow`,
      detail: 'Kilcarra issued programme rev F: data hall 3 roof available from Wednesday. Scheduler Agent suggests IE Crew 8.',
      route: '/projects/CE-2333',
      jobId: 'CE-2333',
      roles: ['donnacha', 'eugene', 'robert'],
    });
  }
  items.push({
    id: 'att-thurrock',
    severity: 'high',
    agent: 'valuation',
    title: 'Thurrock application not submitted, Northwold cut-off is Thursday',
    detail: `Draft ready from ${installed(jobs.find((j) => j.id === 'CE-2309')!).toLocaleString('en-IE')} m installed and agreed variations. Needs Valerie’s approval before 8 Oct.`,
    route: '/finance',
    jobId: 'CE-2309',
    roles: ['donnacha', 'valerie', 'eugene'],
  });
  items.push({
    id: 'att-ipaf',
    severity: 'medium',
    agent: 'compliance',
    title: 'IPAF expires next week for 2 technicians on Ringaskiddy pharma site',
    detail: 'Client permit-to-work requires valid IPAF 3a/3b. Renewal course available in Cork on 15 Oct.',
    route: '/crews',
    jobId: 'CE-2321',
    roles: ['donnacha', 'julia', 'robert'],
  });
  items.push({
    id: 'att-rfi',
    severity: 'medium',
    agent: 'inbox',
    title: 'RFI-0412 unanswered for 9 days on Carrigtwohill',
    detail: 'Outlet setting-out vs revised roof falls. Zone 2 install cannot start. Chaser drafted to Slaney Build.',
    route: '/projects/CE-2326',
    jobId: 'CE-2326',
    roles: ['donnacha', 'stephen'],
  });
  items.push({
    id: 'att-vo',
    severity: 'medium',
    agent: 'inbox',
    title: 'Variation instructed verbally on Grange Castle, not yet priced',
    detail: 'Re-route around relocated AHUs, est. €18,400. Instructed on site walk 6 days ago. Confirm in writing and price.',
    route: '/finance',
    jobId: 'CE-2315',
    roles: ['donnacha', 'valerie', 'aaron'],
  });
  items.push({
    id: 'att-mk',
    severity: 'high',
    agent: 'progress',
    title: 'Milton Keynes logistics hub blocked: roof deck not handed over',
    detail: 'Zones 3 and 4 not available. Crew stood down. RAMS revision needed for revised sequence.',
    route: '/projects/CE-2340',
    jobId: 'CE-2340',
    roles: ['donnacha', 'eugene'],
  });
  items.push({
    id: 'att-slough',
    severity: 'medium',
    agent: 'valuation',
    title: 'Slough data hall application 74 days unpaid',
    detail: 'Certified, past final date for payment. No pay less notice received from Maresfield Contracting.',
    route: '/finance',
    jobId: 'CE-2298',
    roles: ['valerie', 'eugene', 'donnacha'],
  });
  items.push({
    id: 'att-nlhpp',
    severity: 'low',
    agent: 'progress',
    title: 'NLHPP Zone C waiting on 8 re-tested spools',
    detail: 'Prefab re-test booked for Thursday. 3 RFIs on outlet positions open with the design team.',
    route: '/projects/CE-2304',
    jobId: 'CE-2304',
    roles: ['donnacha', 'robert', 'stephen'],
  });
  items.push({
    id: 'att-aaron',
    severity: 'medium',
    agent: 'takeoff',
    title: 'Estimating over capacity: 4 tenders close this week',
    detail: "Aaron has 3 of them. Takeoff Agent can draft the BOQs today so he reviews instead of measures.",
    route: '/tenders',
    roles: ['donnacha', 'aaron', 'eugene'],
  });
  items.push({
    id: 'att-renew',
    severity: 'low',
    agent: 'maintenance',
    title: 'National Children’s Hospital maintenance renews in 74 days',
    detail: '€38,500 a year, 6 buildings. Renewal pack and condition summary drafted.',
    route: '/maintenance',
    roles: ['robert', 'eugene', 'donnacha'],
  });
  return items;
}
