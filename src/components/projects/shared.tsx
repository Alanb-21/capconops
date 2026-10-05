// Shared bits for Projects, Job detail and the field app.
import { Bot, HardHat, Mail, Phone, Smartphone, PenLine } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Job, UpdateSource, ValuationStatus } from '../../data/types';
import { CREWS, DESIGN, DRAWINGS, techById } from '../../data/seed';
import { daysBetween } from '../../lib/dates';
import { clsx, Pill, type Tone } from '../ui';

export type SourceLike = UpdateSource | 'Design register';

export function sourceIcon(s: SourceLike, size = 12): ReactNode {
  switch (s) {
    case 'Foreman app':
      return <Smartphone size={size} />;
    case 'Technician app':
      return <HardHat size={size} />;
    case 'Site Progress Agent':
      return <Bot size={size} />;
    case 'Email':
      return <Mail size={size} />;
    case 'Phone call':
      return <Phone size={size} />;
    default:
      return <PenLine size={size} />;
  }
}

export function SourceBadge({ source, className }: { source: SourceLike; className?: string }) {
  const tone: Tone = source === 'Site Progress Agent' ? 'accent' : source === 'Technician app' || source === 'Foreman app' ? 'brand' : 'neutral';
  return (
    <Pill tone={tone} className={clsx('!gap-1', className)}>
      {sourceIcon(source, 11)}
      {source}
    </Pill>
  );
}

/**
 * The latest update for a job. Design-only jobs have no site, so their
 * "last update" comes from the design register instead.
 */
export function jobLastUpdate(j: Job): { at: string; source: SourceLike; by: string; note: string } {
  if (!j.designOnly) return j.lastUpdate;
  const rec = DESIGN.find((d) => d.jobId === j.id);
  const dr = DRAWINGS.filter((d) => d.jobId === j.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return {
    at: '2026-10-05T17:10:00',
    source: 'Design register',
    by: rec?.designer ?? 'Design team (Maynooth)',
    note: dr ? `${dr.number} ${dr.title} issued at ${dr.rev} to ${j.consultant ?? j.client}.` : 'Design register reviewed.',
  };
}

/** Positive = days ahead of the main contractor programme. */
export function programmeDelta(j: Job): number {
  return daysBetween(j.forecastEnd, j.mcProgrammeEnd);
}

export function deltaLabel(d: number): string {
  if (d === 0) return 'On programme';
  return d > 0 ? `${d} day${d === 1 ? '' : 's'} ahead` : `${-d} day${d === -1 ? '' : 's'} behind`;
}

export const deltaTone = (d: number): 'ok' | 'warn' | 'bad' => (d >= 0 ? 'ok' : d >= -7 ? 'warn' : 'bad');

export function valuationTone(s: ValuationStatus): Tone {
  switch (s) {
    case 'Paid':
      return 'ok';
    case 'Certified':
      return 'brand';
    case 'Submitted':
      return 'accent';
    case 'Draft':
      return 'warn';
    case 'Missed cut-off':
      return 'bad';
    default:
      return 'neutral';
  }
}

export function ValuationPill({ status }: { status: ValuationStatus }) {
  return <Pill tone={valuationTone(status)}>{status}</Pill>;
}

export const crewById = (id: string) => CREWS.find((c) => c.id === id);
export const crewShort = (id: string) => {
  const c = crewById(id);
  return c ? c.name.split(' · ')[0] : id;
};
export const crewForeman = (id: string) => {
  const c = crewById(id);
  return c ? techById(c.foremanId)?.name ?? '' : '';
};
export const crewSize = (id: string) => crewById(id)?.memberIds.length ?? 0;

export function CrewDot({ id }: { id: string }) {
  const c = crewById(id);
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: c?.colour ?? 'var(--c-ink-3)' }} />;
}

export function mcLabel(j: Job): { text: string; muted: boolean } {
  if (j.mainContractor === 'Undisclosed') return { text: 'Undisclosed', muted: true };
  if (j.designOnly) return { text: j.consultant ? `Design for ${j.consultant}` : 'Design only', muted: true };
  return { text: j.mainContractor, muted: false };
}

export const regionLabel = (r: Job['region']) => (r === 'IE' ? 'Ireland' : r === 'UK' ? 'UK' : r === 'SG' ? 'Singapore' : r === 'MY' ? 'Malaysia' : 'Europe');
