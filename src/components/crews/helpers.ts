// Shared helpers for the Crews & Scheduling page.
import type { Allocation, Crew, DayKey, Job, Spool, Technician, TicketType } from '../../data/types';
import { DAYS } from '../../data/types';
import { techById } from '../../data/seed';
import { crewsOn } from '../../data/metrics';
import { WEEK_START, daysBetween, fmtDate, isoAdd } from '../../lib/dates';

export const dayIso = (d: DayKey) => isoAdd(DAYS.indexOf(d), WEEK_START);

/** Primary/secondary label for a job: showcase jobs by name, generic jobs by town. */
export function jobLabel(j: Job) {
  const town = j.location.split(',')[0];
  return j.showcase ? { primary: j.shortName, secondary: town } : { primary: town, secondary: j.shortName };
}

export const IPAF_SECTORS = ['Pharmaceutical', 'Data Centre'];

export interface ComplianceResult {
  level: 'ok' | 'warn' | 'bad';
  issues: string[];
  checked: number;
}

/** Compliance Agent check for a crew booked on a job on a given day. */
export function checkCompliance(crew: Crew, job: Job, day: DayKey): ComplianceResult {
  const date = dayIso(day);
  const members = crew.memberIds.map((id) => techById(id)).filter((t): t is Technician => !!t);
  const issues: string[] = [];
  let level: ComplianceResult['level'] = 'ok';
  const needsIpaf = IPAF_SECTORS.includes(job.sector);
  const ipafLate: { name: string; exp: string }[] = [];
  for (const m of members) {
    for (const t of m.tickets) {
      const left = daysBetween(date, t.expires);
      if (left < 0) {
        issues.push(`${m.name}'s ${t.type} expired ${fmtDate(t.expires)}`);
        level = 'bad';
      } else if (t.type === 'IPAF 3a/3b' && needsIpaf && left <= 14) {
        ipafLate.push({ name: m.name, exp: t.expires });
      } else if (left <= 7) {
        issues.push(`${m.name}'s ${t.type} expires ${fmtDate(t.expires)}`);
        if (level === 'ok') level = 'warn';
      }
    }
    if (needsIpaf && !m.tickets.some((t) => t.type === 'IPAF 3a/3b')) {
      issues.push(`${m.name} holds no IPAF 3a/3b`);
      level = 'bad';
    }
  }
  if (ipafLate.length) {
    const names = ipafLate.map((x) => `${x.name.split(' ')[0]} (${fmtDate(x.exp)})`).join(' and ');
    issues.unshift(
      `IPAF 3a/3b for ${names} expires within 2 weeks. ${job.sector === 'Pharmaceutical' ? 'Pharma' : 'Data centre'} permit-to-work needs valid IPAF; renewal course in Cork Thu 15 Oct`,
    );
    if (level === 'ok') level = 'warn';
  }
  return { level, issues, checked: members.reduce((a, m) => a + m.tickets.length, 0) };
}

/** Crew-level standing flag (any ticket within 14 days of today, IPAF on a pharma/DC booking). */
export function crewTicketFlags(crew: Crew): { name: string; type: TicketType; expires: string }[] {
  const out: { name: string; type: TicketType; expires: string }[] = [];
  for (const id of crew.memberIds) {
    const m = techById(id);
    if (!m) continue;
    for (const t of m.tickets) if (daysBetween(isoAdd(0), t.expires) <= 14) out.push({ name: m.name, type: t.type, expires: t.expires });
  }
  return out;
}

/** Crews booked Wed–Fri on jobs whose spools due by Mon 12 Oct are not yet dispatched. */
export function materialsGaps(jobs: Job[], alloc: Allocation, spools: Spool[], crews: Crew[]) {
  const cutoff = isoAdd(6); // Mon 12 Oct: first install day after this week
  const out: { job: Job; crewIds: string[]; days: DayKey[]; spools: Spool[] }[] = [];
  for (const j of jobs) {
    if (j.showcase && j.id !== 'CE-2304') continue;
    const pending = spools.filter((s) => s.jobId === j.id && s.stage !== 'Dispatched' && s.stage !== 'On site' && s.due <= cutoff);
    if (!pending.length) continue;
    const days = (['Wed', 'Thu', 'Fri'] as DayKey[]).filter((d) => crewsOn(alloc, j.id, d).length > 0);
    if (!days.length) continue;
    const crewIds = [...new Set(days.flatMap((d) => crewsOn(alloc, j.id, d)))].filter((c) => crews.some((x) => x.id === c));
    out.push({ job: j, crewIds, days, spools: pending });
  }
  return out.sort((a, b) => b.spools.length - a.spools.length);
}

export const TICKET_SHORT: Record<TicketType, string> = {
  'Safe Pass': 'SP',
  CSCS: 'CSCS',
  'IPAF 3a/3b': 'IPAF',
  PASMA: 'PASMA',
  'Manual handling': 'MH',
  'Working at height': 'WAH',
  'First aid': 'FA',
  'Site induction': 'IND',
};
