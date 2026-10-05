import { JOBS, TECHNICIANS, TENDERS, SPOOLS, MAINT_CONTRACTS, BUILDINGS, VALUATIONS, CREWS, ALLOCATION } from '../src/data/seed';
import * as M from '../src/data/metrics';
const errs: string[] = [];
for (const j of JOBS) {
  if (M.installed(j) > M.designed(j)) errs.push(`${j.id} installed>designed`);
  const p = M.jobPct(j); if (!Number.isFinite(p) || p < 0 || p > 1) errs.push(`${j.id} pct ${p}`);
  const wk = j.weeklyInstalled.reduce((a, b) => a + b, 0) + j.weekToDate;
  if (wk > M.installed(j) + 1) errs.push(`${j.id} weekly ${wk} > installed ${M.installed(j)}`);
  if (!Number.isFinite(j.contractValue) || j.contractValue <= 0) errs.push(`${j.id} value`);
}
const ids = new Set(JOBS.map(j => j.id)); if (ids.size !== JOBS.length) errs.push('dup job ids');
console.log({ jobs: JOBS.length, split: M.regionSplit(JOBS), techs: TECHNICIANS.length, crews: CREWS.length, openTenders: M.openTenders(TENDERS).length, tenders: TENDERS.length, spools: SPOOLS.length, contracts: MAINT_CONTRACTS.length, buildings: BUILDINGS.length, vals: VALUATIONS.length });
console.log('stages', Object.entries(JOBS.reduce((a: any, j) => (a[j.stage] = (a[j.stage] || 0) + 1, a), {})));
console.log('health', Object.entries(JOBS.reduce((a: any, j) => (a[j.health] = (a[j.health] || 0) + 1, a), {})));
console.log('weekly', M.weeklyMetres(JOBS), 'wtd', M.weekToDate(JOBS), 'plan', M.plannedThisWeek(JOBS));
console.log('util', M.crewUtilisation(ALLOCATION).toFixed(2), 'noCrewTomorrow', M.sitesWithNoCrew(JOBS, ALLOCATION, 'Wed').map(j => j.name));
console.log('wip', Math.round(M.wipEur(JOBS, VALUATIONS)), 'outstanding', M.outstandingApps(JOBS, VALUATIONS).count, Math.round(M.outstandingApps(JOBS, VALUATIONS).value), 'cash30', Math.round(M.cashReceived(JOBS, VALUATIONS)));
console.log('>60', M.appsOverDays(JOBS, VALUATIONS, 60).map(x => `${x.job.name} ${x.job.mainContractor} ${x.age}`));
console.log('pipeline', Math.round(M.pipelineValueEur(TENDERS)), 'win', M.winRate(TENDERS).toFixed(2));
console.log('ipaf', M.expiringTickets(30, ['IPAF 3a/3b']).map(x => `${x.tech.name} ${x.expires} ${x.tech.crewId}`));
console.log('margin', M.marginBySector(JOBS).map(m => `${m.sector} ${(m.margin*100).toFixed(1)}`).join(', '));
console.log('aged', M.agedDebt(JOBS, VALUATIONS));
console.log('rev', M.revenueVsCost(JOBS, VALUATIONS).map(r => Math.round(r.revenue/1000)).join(' '));
const dex = JOBS.find(j => j.id === 'CE-2291')!; console.log('dex', M.installed(dex), M.designed(dex), M.jobPct(dex).toFixed(3), dex.siphonicInstalled, dex.gravityInstalled);
console.log('totals contract EUR', Math.round(JOBS.reduce((a,j)=>a+(j.currency==='GBP'?1.16:1)*j.contractValue,0)));
console.log(errs.length ? errs : 'OK no errors');
