import { useMemo, useState } from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import { CREWS, TECHNICIANS } from '../../data/seed';
import { expiringTickets } from '../../data/metrics';
import type { TicketType } from '../../data/types';
import { daysUntil, fmtDate } from '../../lib/dates';
import { Avatar, Card, CardHeader, Pill, Segmented, Table, Td, Th, Tr, clsx } from '../ui';
import { TICKET_SHORT } from './helpers';

const TICKET_ORDER: TicketType[] = ['Safe Pass', 'CSCS', 'IPAF 3a/3b', 'PASMA', 'Manual handling', 'Working at height', 'First aid', 'Site induction'];

function TicketChip({ type, expires, note }: { type: TicketType; expires: string; note?: string }) {
  const d = daysUntil(expires);
  const state = d < 0 ? 'bad' : d <= 30 ? 'warn' : 'ok';
  const tip = `${type}${note ? ` · ${note}` : ''}: ${d < 0 ? 'expired' : 'expires'} ${fmtDate(expires, { year: true })}${d >= 0 ? ` (${d} days)` : ''}`;
  return (
    <span
      title={tip}
      className={clsx(
        'inline-flex h-[20px] items-center rounded-md px-1.5 text-[10.5px] font-semibold tracking-[0.02em]',
        state === 'ok' && 'bg-ok-soft text-ok',
        state === 'warn' && 'bg-warn-soft text-warn ring-1 ring-[var(--c-warn)]/40',
        state === 'bad' && 'bg-bad-soft text-bad ring-1 ring-[var(--c-bad)]/40',
      )}
    >
      {TICKET_SHORT[type]}
    </span>
  );
}

export function TechTickets() {
  const [region, setRegion] = useState<'all' | 'IE' | 'UK'>('all');
  const [crew, setCrew] = useState('all');
  const [q, setQ] = useState('');
  const expiring = useMemo(() => expiringTickets(30), []);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return TECHNICIANS.filter(
      (t) =>
        (region === 'all' || t.region === region) &&
        (crew === 'all' || t.crewId === crew) &&
        (!s || t.name.toLowerCase().includes(s) || t.base.toLowerCase().includes(s) || t.role.toLowerCase().includes(s)),
    );
  }, [region, crew, q]);

  const crewOpts = CREWS.filter((c) => region === 'all' || c.region === region);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader title="Expiring in 30 days" subtitle="Checked nightly by the Compliance Agent" icon={<ShieldAlert size={15} />} />
        <div className="flex items-baseline gap-2">
          <span className="tnum text-[40px] font-semibold leading-none tracking-[-0.03em] text-ink">{expiring.length}</span>
          <span className="text-[13px] text-ink-3">tickets across {new Set(expiring.map((e) => e.tech.id)).size} people</span>
        </div>
        <div className="mt-4 space-y-2">
          {expiring.map((e) => (
            <div key={`${e.tech.id}-${e.type}`} className="flex items-center gap-2.5 rounded-xl bg-sunk px-3 py-2">
              <Avatar name={e.tech.name} size={26} tone="neutral" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-medium text-ink">{e.tech.name}</div>
                <div className="truncate text-[11.5px] text-ink-3">
                  {e.type} · {e.tech.crewId}
                </div>
              </div>
              <Pill tone={e.days < 0 ? 'bad' : 'warn'}>{e.days < 0 ? `Expired ${fmtDate(e.expires)}` : fmtDate(e.expires)}</Pill>
            </div>
          ))}
        </div>
      </Card>

      <Card padded={false} className="min-w-0 p-5">
        <CardHeader
          title="Technicians and tickets"
          subtitle={`${rows.length} of ${TECHNICIANS.length} people · hover a ticket for its expiry date`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                size="sm"
                value={region}
                onChange={(v) => {
                  setRegion(v);
                  setCrew('all');
                }}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'IE', label: 'IE' },
                  { value: 'UK', label: 'UK' },
                ]}
              />
              <select
                value={crew}
                onChange={(e) => setCrew(e.target.value)}
                className="h-8 rounded-full bg-sunk px-3 text-[12.5px] text-ink outline-none"
                aria-label="Filter by crew"
              >
                <option value="all">All crews</option>
                {crewOpts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <label className="flex h-8 items-center gap-1.5 rounded-full bg-sunk px-3 text-ink-3">
                <Search size={13} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or base" className="w-[130px] bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3" />
              </label>
            </div>
          }
        />
        <div className="mb-3 flex flex-wrap items-center gap-3 text-[11.5px] text-ink-3">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ok" />Valid</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warn" />Expires within 30 days</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bad" />Expired</span>
          <span className="ml-auto">SP Safe Pass · MH Manual handling · WAH Working at height · FA First aid · IND Site induction</span>
        </div>
        <div className="scroll-thin max-h-[560px] overflow-y-auto">
          <Table className="!overflow-visible">
            <thead>
              <tr>
                <Th className="bg-surface-strong backdrop-blur">Name</Th>
                <Th className="bg-surface-strong backdrop-blur">Crew</Th>
                <Th className="bg-surface-strong backdrop-blur">Tickets</Th>
                <Th className="bg-surface-strong backdrop-blur" align="right">Utilisation</Th>
                <Th className="bg-surface-strong backdrop-blur" align="right">Travel h/wk</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const sorted = [...t.tickets].sort((a, b) => TICKET_ORDER.indexOf(a.type) - TICKET_ORDER.indexOf(b.type));
                return (
                  <Tr key={t.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={t.name} size={26} tone={t.role === 'Foreman' ? 'brand' : 'neutral'} />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">{t.name}</div>
                          <div className="truncate text-[11.5px] text-ink-3">
                            {t.role} · {t.base}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap">{t.crewId}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {sorted.map((k) => (
                          <TicketChip key={`${k.type}-${k.ref}`} type={k.type} expires={k.expires} note={k.note} />
                        ))}
                      </div>
                    </Td>
                    <Td align="right">
                      <span className={clsx(t.utilisation > 0.9 ? 'text-warn' : 'text-ink')}>{Math.round(t.utilisation * 100)}%</span>
                    </Td>
                    <Td align="right">{t.travelHoursWeek}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
