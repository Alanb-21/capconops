// Finance derivations used by the Commercial & Finance page. Everything is
// computed from store jobs + store valuations so it reconciles with WIP,
// installed metres and the Command Centre.
import type { Job, Valuation, Variation } from '../../data/types';
import { MAINT_CONTRACTS, TECHNICIANS, VARIATIONS } from '../../data/seed';
import { certifiedTotal, installed, jobPct, ratePerMetre } from '../../data/metrics';
import { toEur } from '../../lib/format';
import { TODAY_ISO, WEEK_START, daysBetween, daysUntil, isoAdd } from '../../lib/dates';

const pad = (n: number) => String(n).padStart(2, '0');

/** This month's (October 2026) main contractor cut-off date for a job. */
export const cutoffThisMonth = (j: Job) => `2026-10-${pad(Math.min(28, Math.max(1, j.mcCutoffDay)))}`;

export const jobVals = (vals: Valuation[], jobId: string) =>
  vals.filter((v) => v.jobId === jobId).sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : a.appNo - b.appNo));

export const latestVal = (vals: Valuation[], jobId: string): Valuation | undefined => {
  const l = jobVals(vals, jobId);
  return l[l.length - 1];
};

export interface DraftLine {
  key: string;
  label: string;
  detail?: string;
  amount: number;
  kind: 'work' | 'variation' | 'prelims' | 'subtotal' | 'deduction' | 'total';
}

export interface DraftApplication {
  job: Job;
  appNo: number;
  rate: number;
  siphonicValue: number;
  gravityValue: number;
  prelims: number;
  variations: Variation[];
  variationsTotal: number;
  gross: number;
  retention: number;
  previouslyCertified: number;
  awaitingCert: number;
  net: number;
  lines: DraftLine[];
  dueOn: string;
}

/**
 * Draft application for payment. Gross to date = installed metres × contract
 * rate per metre + agreed variations (+ any prelims Valerie adds). Less
 * retention, less what has already been certified (or applied and awaiting
 * certification) gives the net due on this application.
 */
export function draftApplication(job: Job, vals: Valuation[], prelims = 0): DraftApplication {
  const rate = ratePerMetre(job);
  const siphonicValue = job.siphonicInstalled * rate;
  const gravityValue = job.gravityInstalled * rate;
  const variations = VARIATIONS.filter((v) => v.jobId === job.id && v.status === 'Agreed');
  const variationsTotal = variations.reduce((a, v) => a + v.value, 0);
  const gross = siphonicValue + gravityValue + variationsTotal + prelims;
  const retention = gross * job.retentionPct;
  const prior = jobVals(vals, job.id);
  const previouslyCertified = certifiedTotal(vals, job.id);
  const awaitingCert = prior.filter((v) => v.certified === null).reduce((a, v) => a + v.applied, 0);
  const net = gross - retention - previouslyCertified - awaitingCert;
  const appNo = prior.reduce((a, v) => Math.max(a, v.appNo), 0) + 1;
  const sym = job.currency === 'GBP' ? '£' : '€';
  const rateTxt = `${sym}${rate.toFixed(2)}/m`;
  const lines: DraftLine[] = [
    { key: 'sip', label: 'Siphonic pipework installed', detail: `${job.siphonicInstalled.toLocaleString('en-IE')} m × ${rateTxt}`, amount: siphonicValue, kind: 'work' },
    { key: 'grav', label: 'Gravity pipework installed', detail: `${job.gravityInstalled.toLocaleString('en-IE')} m × ${rateTxt}`, amount: gravityValue, kind: 'work' },
    { key: 'prelims', label: 'Preliminaries', detail: prelims > 0 ? 'Added by Valerie' : 'None claimed this month', amount: prelims, kind: 'prelims' },
    ...variations.map((v) => ({ key: v.id, label: `${v.id} ${v.description}`, detail: 'Agreed variation', amount: v.value, kind: 'variation' as const })),
    { key: 'gross', label: 'Gross valuation to date', amount: gross, kind: 'subtotal' },
    { key: 'ret', label: `Less retention ${(job.retentionPct * 100).toFixed(job.retentionPct * 100 % 1 ? 1 : 0)}%`, amount: -retention, kind: 'deduction' },
    { key: 'cert', label: 'Less previously certified', detail: `${prior.filter((v) => v.certified !== null).length} applications`, amount: -previouslyCertified, kind: 'deduction' },
  ];
  if (awaitingCert > 0) lines.push({ key: 'await', label: 'Less previously applied, awaiting certificate', amount: -awaitingCert, kind: 'deduction' });
  lines.push({ key: 'net', label: 'Net due this application', amount: net, kind: 'total' });
  return {
    job,
    appNo,
    rate,
    siphonicValue,
    gravityValue,
    prelims,
    variations,
    variationsTotal,
    gross,
    retention,
    previouslyCertified,
    awaitingCert,
    net,
    lines,
    dueOn: isoAdd(job.region === 'UK' ? 35 : 30, TODAY_ISO),
  };
}

/** Jobs that need an October application drafted (Draft / Not started with value to claim). */
export function jobsNeedingApplication(jobs: Job[], vals: Valuation[]) {
  return jobs
    .filter((j) => !j.designOnly && (j.valuationStatus === 'Draft' || j.valuationStatus === 'Not started') && installed(j) > 0)
    .map((j) => ({ job: j, draft: draftApplication(j, vals), cutoff: cutoffThisMonth(j) }))
    .filter((x) => x.draft.net >= 1000)
    .sort((a, b) => {
      if (a.job.id === 'CE-2309') return -1;
      if (b.job.id === 'CE-2309') return 1;
      return a.cutoff < b.cutoff ? -1 : a.cutoff > b.cutoff ? 1 : b.draft.net - a.draft.net;
    });
}

// ---------------------------------------------------------------- retentions
export function retentionRows(jobs: Job[], vals: Valuation[]) {
  return jobs
    .map((j) => {
      const cert = certifiedTotal(vals, j.id);
      const total = cert * j.retentionPct;
      const firstReleased = j.stage === 'Handover';
      const held = total * (firstReleased ? 0.5 : 1);
      const pc = j.forecastEnd;
      const defectsEnd = isoAdd(365, j.forecastEnd);
      return { job: j, total, held, firstReleased, pc, defectsEnd, half: total / 2 };
    })
    .filter((r) => r.held > 0)
    .sort((a, b) => {
      const da = a.firstReleased ? a.defectsEnd : a.pc;
      const db = b.firstReleased ? b.defectsEnd : b.pc;
      return da < db ? -1 : da > db ? 1 : 0;
    });
}

// ---------------------------------------------------------------- margin
export function marginRows(jobs: Job[]) {
  return jobs
    .filter((j) => !j.designOnly && jobPct(j) > 0.05)
    .map((j) => {
      const e = j.contractValue * jobPct(j);
      return { job: j, earned: e, cost: j.costToDate, margin: j.forecastMarginPct };
    });
}

// ---------------------------------------------------------------- cash forecast
export interface CashWeek {
  week: string; // label "5 Oct"
  start: string;
  receipts: number;
  outflows: number; // negative
  balance: number;
}

const avgWeekly = (j: Job) => {
  const w = j.weeklyInstalled.slice(-4);
  return w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0;
};

/**
 * Deterministic 13-week cash forecast, group EUR.
 * In: certified-unpaid apps at their due date (overdue assumed collected in
 * week 2 after chasing), submitted-uncertified apps at ~95% on their due date,
 * then each live job's next applications (recent run-rate × contract rate)
 * received 30 days (IE) / 35 days (UK) after cut-off, plus maintenance billing.
 * Out: weekly payroll, monthly supplier run and fixed overheads.
 */
export const OPENING_CASH = 1_650_000;

export function cashForecast(jobs: Job[], vals: Valuation[]): CashWeek[] {
  const N = 13;
  const receipts = Array(N).fill(0) as number[];
  const outflows = Array(N).fill(0) as number[];
  const weekOf = (date: string) => Math.floor(daysBetween(WEEK_START, date) / 7);
  const add = (date: string, v: number) => {
    let w = weekOf(date);
    if (w < 0) w = 1; // overdue: chased, expected week 2
    if (w < N) receipts[w] += v;
  };
  const byId = new Map(jobs.map((j) => [j.id, j]));
  for (const v of vals) {
    const j = byId.get(v.jobId);
    if (!j || v.paid !== null) continue;
    if (v.certified !== null) add(v.dueOn, toEur(v.certified, j.currency));
    else add(v.dueOn, toEur(v.applied * 0.95, j.currency));
  }
  let monthlyCost = 0;
  for (const j of jobs) {
    if (j.designOnly || j.health === 'blocked') continue;
    if (j.stage !== 'Install' && j.stage !== 'Testing & commissioning') continue;
    const monthly = avgWeekly(j) * (52 / 12) * ratePerMetre(j);
    monthlyCost += toEur(monthly * (1 - j.forecastMarginPct), j.currency);
    const hasOct = vals.some((v) => v.jobId === j.id && v.month === '2026-10');
    for (const [mi, ym] of [[10, '2026-10'], [11, '2026-11'], [12, '2026-12']] as const) {
      if (mi === 10 && hasOct) continue;
      const cut = `${ym}-${pad(Math.min(28, j.mcCutoffDay))}`;
      add(isoAdd(j.region === 'UK' ? 35 : 30, cut), toEur(monthly * 0.95 * (1 - j.retentionPct), j.currency));
    }
  }
  const maintWeekly = MAINT_CONTRACTS.reduce((a, c) => a + toEur(c.annualValue, c.currency), 0) / 52;
  // site teams (from the technician roster) plus office, design and prefab staff
  const payrollWeekly = Math.max(TECHNICIANS.length * 1_180 + 41_000, (monthlyCost * 0.46 * 12) / 52);
  const supplierMonthly = monthlyCost * 0.44;
  const overheadWeekly = 58_000;
  let bal = OPENING_CASH;
  const out: CashWeek[] = [];
  for (let w = 0; w < N; w++) {
    const start = isoAdd(w * 7, WEEK_START);
    receipts[w] += maintWeekly;
    // supplier run on the last Friday of the month
    const fri = isoAdd(w * 7 + 4, WEEK_START);
    const lastFri = isoAdd(7, fri).slice(5, 7) !== fri.slice(5, 7);
    outflows[w] = -(payrollWeekly + overheadWeekly + (lastFri ? supplierMonthly : 0));
    bal += receipts[w] + outflows[w];
    const d = new Date(start + 'T00:00:00');
    out.push({ week: `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`, start, receipts: Math.round(receipts[w]), outflows: Math.round(outflows[w]), balance: Math.round(bal) });
  }
  return out;
}

export const daysLeft = (d: string) => daysUntil(d);
