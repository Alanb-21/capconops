import { CalendarClock, FolderCheck, HardHat, Mail, Receipt, Ruler, ShieldCheck, Wrench, type LucideIcon } from 'lucide-react';
import type { AgentId } from '../../data/types';

export const AGENT_ICONS: Record<AgentId, LucideIcon> = {
  inbox: Mail,
  takeoff: Ruler,
  progress: HardHat,
  valuation: Receipt,
  compliance: ShieldCheck,
  scheduler: CalendarClock,
  maintenance: Wrench,
  handover: FolderCheck,
};

export function AgentIcon({ id, size = 16 }: { id: AgentId; size?: number }) {
  const I = AGENT_ICONS[id];
  return <I size={size} />;
}
