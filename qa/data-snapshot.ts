// Computes expected figures from the seed + metrics so the Playwright QA can reconcile the DOM.
// Run: npx -y tsx qa/data-snapshot.ts > qa/.expected.json
import { JOBS, TENDERS, VALUATIONS, ALLOCATION, MAINT_CONTRACTS, TECHNICIANS } from '../src/data/seed';
import * as M from '../src/data/metrics';
import { daysUntil } from '../src/lib/dates';

const job = (id: string) => {
  const j = JOBS.find((x) => x.id === id)!;
  return { id, name: j.name, installed: M.installed(j), designed: M.designed(j), pct: M.jobPct(j), designOnly: !!j.designOnly, weekToDate: j.weekToDate, mc: j.mainContractor };
};
const over60 = M.appsOverDays(JOBS, VALUATIONS, 60);
const out = {
  jobs: JOBS.length,
  split: M.regionSplit(JOBS),
  health: JOBS.reduce((a: Record<string, number>, j) => ((a[j.health] = (a[j.health] || 0) + 1), a), {}),
  weekToDate: M.weekToDate(JOBS),
  weekToDateUK: M.weekToDate(JOBS.filter((j) => j.region === 'UK')),
  weeklyUK: M.weeklyMetres(JOBS, 'UK'),
  weeklyAll: M.weeklyMetres(JOBS),
  showcase: Object.fromEntries(['CE-2291', 'CE-2337', 'CE-2304', 'CE-2333'].map((id) => [id, job(id)])),
  openTenders: M.openTenders(TENDERS).length,
  closingThisWeek: M.tendersClosingThisWeek(TENDERS).map((t) => ({ id: t.id, name: t.name, estimator: t.estimator, close: t.closeDate })),
  over60: { count: over60.length, valueEur: Math.round(over60.reduce((a, x) => a + (x.job.currency === 'GBP' ? 1.16 : 1) * (x.v.certified ?? x.v.applied), 0)), list: over60.map((x) => `${x.job.name} | ${x.job.mainContractor} | ${x.age}d`) },
  wipEur: Math.round(M.wipEur(JOBS, VALUATIONS)),
  outstanding: { count: M.outstandingApps(JOBS, VALUATIONS).count, value: Math.round(M.outstandingApps(JOBS, VALUATIONS).value) },
  noCrewWed: M.sitesWithNoCrew(JOBS, ALLOCATION, 'Wed').map((j) => `${j.id} ${j.name}`),
  ipafThisMonth: M.expiringTickets(25, ['IPAF 3a/3b']).filter((x) => x.days >= 0).map((x) => `${x.tech.name} ${x.expires}`),
  pharmaMargin: M.marginBySector(JOBS).find((m) => m.sector === 'Pharmaceutical'),
  renew90: MAINT_CONTRACTS.filter((c) => { const d = daysUntil(c.renewal); return d >= 0 && d <= 90; }).map((c) => `${(c as any).site ?? c.id} ${c.renewal}`),
  techs: TECHNICIANS.length,
};
console.log(JSON.stringify(out, null, 1));
