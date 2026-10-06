// Job detail sections: diary, crew roster, RFIs, variations, valuations,
// documents, handover checklist and H&S.
import { Check, CloudSun, FileText, FolderOpen, Ruler } from 'lucide-react';
import type { DiaryEntry, Job, Technician, Valuation, Variation } from '../../../data/types';
import { DAYS } from '../../../data/types';
import { DRAWINGS, HANDOVER_ITEMS, HS_ITEMS, RAMS, RFIS, TECHNICIANS, VARIATIONS, handoverStatus } from '../../../data/seed';
import { ago, daysBetween, daysUntil, fmtDate, fmtMonth, fmtTime, parse, TODAY_ISO } from '../../../lib/dates';
import { num, pct } from '../../../lib/format';
import { useStore } from '../../../store/useStore';
import { Avatar, clsx, Empty, Money, PhotoPlaceholder, Pill, Progress, type Tone } from '../../ui';
import { crewById, CrewDot, SourceBadge } from '../shared';

const tdc = 'border-b hairline px-3 py-2.5 align-middle text-[13px] text-ink-2';
const thc = 'whitespace-nowrap border-b hairline px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3';

export const jobDiary = (diary: DiaryEntry[], id: string) =>
  diary.filter((d) => d.jobId === id).sort((a, b) => parse(b.at).getTime() - parse(a.at).getTime());

// ---------------------------------------------------------------- diary
export function DiaryList({ entries, limit }: { entries: DiaryEntry[]; limit?: number }) {
  const list = limit ? entries.slice(0, limit) : entries;
  if (!list.length) return <Empty>No diary entries yet.</Empty>;
  return (
    <ol className="relative space-y-3">
      {list.map((e) => {
        const live = e.id.startsWith('D-live') || e.id.startsWith('D-issue');
        const issue = e.id.startsWith('D-issue');
        return (
          <li
            key={e.id}
            className={clsx('flex gap-3 rounded-2xl p-3 transition-colors', live ? (issue ? 'bg-warn-soft' : 'bg-brand-soft ring-1 ring-[color-mix(in_srgb,var(--c-brand)_35%,transparent)]') : 'bg-sunk')}
          >
            <Avatar name={e.author} size={30} tone={e.source === 'Site Progress Agent' || e.source === 'Email' ? 'neutral' : 'brand'} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[13px] font-semibold text-ink">{e.author}</span>
                <SourceBadge source={e.source} />
                {live && <Pill tone={issue ? 'warn' : 'brand'} dot>{issue ? 'Issue flagged just now' : 'Just now'}</Pill>}
                <span className="ml-auto text-[11.5px] text-ink-3 tnum">
                  {fmtDate(e.at, { weekday: true })} · {fmtTime(e.at)}
                  {!live && ` · ${ago(e.at)}`}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{e.text}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11.5px] text-ink-3">
                {e.metres !== undefined && (
                  <span className="inline-flex items-center gap-1 font-medium text-ink tnum">
                    <Ruler size={12} className="text-brand" />+{num(e.metres)} m installed
                  </span>
                )}
                {e.weather && (
                  <span className="inline-flex items-center gap-1">
                    <CloudSun size={12} />
                    {e.weather}
                  </span>
                )}
              </div>
            </div>
            {e.photo && <PhotoPlaceholder seed={e.photo} className="hidden h-[68px] w-[96px] shrink-0 sm:block" label="Site photo" />}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- crew roster
function ticketState(t: Technician): { tone: 'ok' | 'warn' | 'bad'; label: string } {
  let worst = Infinity;
  for (const k of t.tickets) worst = Math.min(worst, daysUntil(k.expires));
  if (worst < 0) return { tone: 'bad', label: 'Ticket expired' };
  if (worst <= 30) return { tone: 'warn', label: `Ticket expires in ${worst} days` };
  return { tone: 'ok', label: 'All tickets valid' };
}

export function TicketDots({ tech }: { tech: Technician }) {
  return (
    <span className="inline-flex items-center gap-1">
      {tech.tickets.map((k) => {
        const d = daysUntil(k.expires);
        const c = d < 0 ? 'var(--c-bad)' : d <= 30 ? 'var(--c-warn)' : 'var(--c-ok)';
        return <span key={k.type + k.ref} title={`${k.type} · expires ${fmtDate(k.expires, { year: true })}`} className="h-2 w-2 rounded-full" style={{ background: c }} />;
      })}
    </span>
  );
}

export function CrewRoster({ job, allocation }: { job: Job; allocation: Record<string, Record<string, string | null>> }) {
  const crewIds = Object.entries(allocation)
    .filter(([, row]) => DAYS.some((d) => row[d] === job.id))
    .map(([id]) => id);
  if (job.designOnly) return <Empty>Design-only commission: no site crews. Design team led from Maynooth.</Empty>;
  if (!crewIds.length) return <Empty>No crew allocated to this job this week. Book one from Crews & Scheduling.</Empty>;
  return (
    <div className="space-y-4">
      {crewIds.map((cid) => {
        const crew = crewById(cid);
        if (!crew) return null;
        const row = allocation[cid];
        return (
          <div key={cid}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <CrewDot id={cid} />
              <span className="text-[13.5px] font-semibold text-ink">{crew.name}</span>
              <span className="ml-auto flex gap-1">
                {DAYS.map((d) => (
                  <span
                    key={d}
                    className={clsx('rounded-md px-1.5 py-0.5 text-[10.5px] font-medium', row[d] === job.id ? 'bg-brand-soft text-brand' : 'bg-sunk text-ink-3')}
                    title={row[d] === job.id ? `On site ${d}` : `Elsewhere ${d}`}
                  >
                    {d}
                  </span>
                ))}
              </span>
            </div>
            <div className="divide-y divide-[var(--c-hairline)] rounded-2xl bg-sunk">
              {crew.memberIds.map((mid) => {
                const t = TECHNICIANS.find((x) => x.id === mid);
                if (!t) return null;
                const st = ticketState(t);
                return (
                  <div key={mid} className="flex items-center gap-3 px-3 py-2">
                    <Avatar name={t.name} size={26} tone={t.role === 'Foreman' || t.role === 'Lead Technician' ? 'brand' : 'neutral'} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-ink">{t.name}</div>
                      <div className="truncate text-[11.5px] text-ink-3">{t.role}</div>
                    </div>
                    <TicketDots tech={t} />
                    <span className={clsx('hidden w-[150px] text-right text-[11.5px] xl:block', st.tone === 'ok' ? 'text-ink-3' : st.tone === 'warn' ? 'text-warn' : 'text-bad')}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- RFIs
export function RfiTable({ job }: { job: Job }) {
  const rfis = RFIS.filter((r) => r.jobId === job.id).sort((a, b) => (a.status === b.status ? b.raised.localeCompare(a.raised) : a.status === 'Open' ? -1 : 1));
  if (!rfis.length) return <Empty>No RFIs raised on this job.</Empty>;
  return (
    <table className="w-full table-fixed border-separate border-spacing-0">
      <colgroup>
        <col className="w-[88px]" />
        <col />
        <col className="w-[150px] max-[1500px]:hidden" />
        <col className="w-[64px]" />
        <col className="w-[132px]" />
      </colgroup>
      <thead>
        <tr>
          <th className={thc}>RFI</th>
          <th className={thc}>Subject</th>
          <th className={clsx(thc, 'max-[1500px]:hidden')}>To</th>
          <th className={thc}>Raised</th>
          <th className={thc}>Status</th>
        </tr>
      </thead>
      <tbody>
        {rfis.map((r) => {
          const age = daysBetween(r.raised, TODAY_ISO);
          return (
            <tr key={r.id}>
              <td className={clsx(tdc, 'whitespace-nowrap font-medium text-ink tnum')}>{r.id}</td>
              <td className={clsx(tdc, 'truncate')} title={r.subject}>
                {r.subject}
              </td>
              <td className={clsx(tdc, 'truncate max-[1500px]:hidden')}>{r.to}</td>
              <td className={clsx(tdc, 'tnum')}>{fmtDate(r.raised)}</td>
              <td className={tdc}>
                {r.status === 'Open' ? <Pill tone={age > 7 && !job.mainContractorPublic ? 'warn' : 'neutral'} dot>Open {age}d</Pill> : <Pill tone="ok">Answered {r.answered ? fmtDate(r.answered) : ''}</Pill>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------- variations
const voTone = (s: Variation['status']): Tone => (s === 'Agreed' ? 'ok' : s === 'Rejected' ? 'bad' : s === 'Instructed (verbal)' ? 'warn' : s === 'Submitted' ? 'accent' : 'neutral');

export function VariationsLog({ job }: { job: Job }) {
  const vos = VARIATIONS.filter((v) => v.jobId === job.id).sort((a, b) => b.date.localeCompare(a.date));
  if (!vos.length) return <Empty>No variations on this job.</Empty>;
  const agreed = vos.filter((v) => v.status === 'Agreed').reduce((a, v) => a + v.value, 0);
  const pending = vos.filter((v) => v.status !== 'Agreed' && v.status !== 'Rejected').reduce((a, v) => a + v.value, 0);
  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-0">
        <colgroup>
          <col className="w-[76px]" />
          <col />
          <col className="w-[92px]" />
          <col className="w-[148px]" />
        </colgroup>
        <thead>
          <tr>
            <th className={thc}>VO</th>
            <th className={thc}>Description</th>
            <th className={clsx(thc, 'text-right')}>Value</th>
            <th className={thc}>Status</th>
          </tr>
        </thead>
        <tbody>
          {vos.map((v) => (
            <tr key={v.id}>
              <td className={clsx(tdc, 'whitespace-nowrap font-medium text-ink tnum')}>{v.id}</td>
              <td className={clsx(tdc, 'min-w-0')}>
                <div className="truncate" title={v.description}>
                  {v.description}
                </div>
                <div className="truncate text-[11.5px] text-ink-3">
                  {fmtDate(v.date)} · {v.instructedBy}
                </div>
              </td>
              <td className={clsx(tdc, 'text-right font-medium text-ink')}>
                <Money amount={v.value} currency={job.currency} />
              </td>
              <td className={tdc}>
                <Pill tone={voTone(v.status)}>{v.status}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-ink-3">
        <span>
          Agreed <Money amount={agreed} currency={job.currency} className="font-semibold text-ink" />
        </span>
        <span>
          Not yet agreed <Money amount={pending} currency={job.currency} className="font-semibold text-ink" />
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- valuations
function valState(v: Valuation, job: Job): { label: string; tone: Tone } {
  if (v.paid !== null) return { label: 'Paid', tone: 'ok' };
  // Never show a real, public contractor as a late payer.
  if (daysUntil(v.dueOn) < 0 && !job.mainContractorPublic) return { label: `Overdue ${-daysUntil(v.dueOn)}d`, tone: 'bad' };
  if (v.certified !== null) return { label: 'Certified', tone: 'brand' };
  return { label: 'Submitted', tone: 'accent' };
}

export function ValuationsTable({ job }: { job: Job }) {
  const vals = useStore((s) => s.valuations)
    .filter((v) => v.jobId === job.id)
    .sort((a, b) => b.appNo - a.appNo);
  if (!vals.length) return <Empty>No applications for payment yet.</Empty>;
  return (
    <table className="w-full border-separate border-spacing-0">
      <thead>
        <tr>
          <th className={thc}>App</th>
          <th className={thc}>Month</th>
          <th className={clsx(thc, 'text-right')}>Applied</th>
          <th className={clsx(thc, 'text-right')}>Certified</th>
          <th className={clsx(thc, 'text-right')}>Paid</th>
          <th className={thc}>Status</th>
        </tr>
      </thead>
      <tbody>
        {vals.map((v) => {
          const st = valState(v, job);
          return (
            <tr key={v.id}>
              <td className={clsx(tdc, 'font-medium text-ink tnum')}>No. {v.appNo}</td>
              <td className={clsx(tdc, 'tnum')}>{fmtMonth(v.month)}</td>
              <td className={clsx(tdc, 'text-right')}>
                <Money amount={v.applied} currency={job.currency} />
              </td>
              <td className={clsx(tdc, 'text-right')}>{v.certified !== null ? <Money amount={v.certified} currency={job.currency} /> : <span className="text-ink-3">Awaiting</span>}</td>
              <td className={clsx(tdc, 'text-right')}>{v.paid !== null ? <Money amount={v.paid} currency={job.currency} /> : <span className="text-ink-3">{daysUntil(v.dueOn) >= 0 || !job.mainContractorPublic ? `Due ${fmtDate(v.dueOn)}` : 'In payment run'}</span>}</td>
              <td className={tdc}>
                <Pill tone={st.tone}>{st.label}</Pill>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------- documents
export function DocumentsList({ job }: { job: Job }) {
  const toast = useStore((s) => s.toast);
  const rams = RAMS.find((r) => r.jobId === job.id);
  const hv = handoverStatus(job);
  const drawings = DRAWINGS.filter((d) => d.jobId === job.id).sort((a, b) => a.number.localeCompare(b.number));
  const std: { name: string; meta: string; tone: Tone; status: string }[] = [];
  if (!job.designOnly) {
    std.push({ name: 'Risk assessment & method statement', meta: rams ? `${rams.rev} · reviewed ${fmtDate(rams.reviewed)}` : 'Not uploaded', tone: rams?.status === 'Approved' ? 'ok' : rams ? 'warn' : 'bad', status: rams?.status ?? 'Missing' });
    std.push({ name: 'Main contractor programme', meta: job.id === 'CE-2291' ? 'JPC rev 14 · issued 1 Oct' : `Rev ${String.fromCharCode(65 + (parseInt(job.id.slice(3)) % 8))} · filed by Inbox Agent`, tone: 'ok', status: 'Current' });
    std.push({ name: 'Pressure / water test certificates', meta: hv.tests ? 'All systems tested to date' : job.id === 'CE-2291' ? 'Building 1 S1–S4 passed 30 Sep' : 'Issued as systems complete', tone: hv.tests ? 'ok' : 'neutral', status: hv.tests ? 'Complete' : 'In progress' });
    std.push({ name: 'Electrofusion weld logs', meta: 'Uploaded from site tablet', tone: hv.weldlogs ? 'ok' : 'neutral', status: hv.weldlogs ? 'Complete' : 'Ongoing' });
  } else {
    std.push({ name: 'Design brief and appointment', meta: `${job.consultant ?? job.client}`, tone: 'ok', status: 'Current' });
    std.push({ name: 'Hydraulic calculation report', meta: 'Design storm 1 in 100 + climate allowance', tone: 'brand', status: 'Checked' });
  }
  const drTone = (s: string): Tone => (s === 'For construction' || s === 'As built' ? 'ok' : s === 'Superseded' ? 'neutral' : s === 'For comment' ? 'accent' : 'warn');
  const open = (name: string) => toast({ title: `Opening ${name}`, detail: `From the ${job.shortName} document register in SharePoint`, tone: 'info' });
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">Site documents</div>
        <div className="divide-y divide-[var(--c-hairline)] rounded-2xl bg-sunk">
          {std.map((d) => (
            <button key={d.name} onClick={() => open(d.name)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-sunk">
              <FolderOpen size={15} className="shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink">{d.name}</div>
                <div className="truncate text-[11.5px] text-ink-3">{d.meta}</div>
              </div>
              <Pill tone={d.tone}>{d.status}</Pill>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">Drawing register · {drawings.length} drawings</div>
        <div className="divide-y divide-[var(--c-hairline)] rounded-2xl bg-sunk">
          {drawings.map((d) => (
            <button key={d.id} onClick={() => open(`${d.number} rev ${d.rev}`)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-sunk">
              <FileText size={14} className="shrink-0 text-ink-3" />
              <span className="w-[120px] shrink-0 text-[12px] font-medium text-ink tnum">{d.number}</span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">{d.title}</span>
              <span className="w-8 shrink-0 text-[12px] text-ink-3 tnum">{d.rev}</span>
              <Pill tone={drTone(d.status)} className="shrink-0">
                {d.status}
              </Pill>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- handover
export function HandoverChecklist({ job }: { job: Job }) {
  const hv = handoverStatus(job);
  const done = HANDOVER_ITEMS.filter((h) => hv[h.key]).length;
  const ready = HANDOVER_ITEMS.length ? done / HANDOVER_ITEMS.length : 0;
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-[30px] font-semibold leading-none tracking-[-0.02em] text-ink tnum">{pct(ready)}</div>
          <div className="mt-1 text-[12px] text-ink-3">
            Handover pack ready · {done} of {HANDOVER_ITEMS.length} items
          </div>
        </div>
        <Pill tone={ready >= 0.9 ? 'ok' : ready >= 0.5 ? 'brand' : 'neutral'}>{ready >= 1 ? 'Ready to issue' : job.stage === 'Install' || job.stage === 'Design' || job.stage === 'Prefabrication' ? 'Building as we go' : 'In compilation'}</Pill>
      </div>
      <Progress value={ready} tone={ready >= 0.9 ? 'ok' : 'brand'} height={8} />
      <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
        {HANDOVER_ITEMS.map((h) => (
          <li key={h.key} className="flex items-center gap-2.5 rounded-xl bg-sunk px-3 py-2 text-[12.5px]">
            <span className={clsx('grid h-5 w-5 shrink-0 place-items-center rounded-full', hv[h.key] ? 'bg-ok text-white dark:text-[#06101e]' : 'border border-[var(--c-hairline)] bg-transparent')}>
              {hv[h.key] && <Check size={12} strokeWidth={3} />}
            </span>
            <span className={clsx('min-w-0 truncate', hv[h.key] ? 'text-ink' : 'text-ink-3')}>{h.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- H&S
export function HsSection({ job }: { job: Job }) {
  const ramsSigned = useStore((s) => s.ramsSigned);
  const rams = RAMS.find((r) => r.jobId === job.id);
  const items = HS_ITEMS.filter((h) => h.jobId === job.id).sort((a, b) => b.date.localeCompare(a.date));
  const extra =
    job.id === 'CE-2291'
      ? [
          { id: 'HS-dex-1', type: 'Toolbox talk', title: 'Working at height on crow’s nest platform', date: '2026-09-29', status: 'Closed' as const, severity: undefined },
          { id: 'HS-dex-2', type: 'Permit', title: 'MEWP permit, Building 2 high bay (JPC)', date: '2026-10-06', status: 'Open' as const, severity: undefined },
          { id: 'HS-dex-3', type: 'Audit', title: 'JPC safety walk, no actions for Capcon', date: '2026-09-24', status: 'Closed' as const, severity: undefined },
        ]
      : [];
  const all = [...extra, ...items];
  if (job.designOnly) return <Empty>Design-only commission: no site H&S records. Designer’s risk assessment is held with the design register.</Empty>;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-sunk p-3">
          <div className="text-[11.5px] font-medium text-ink-3">RAMS</div>
          <div className="mt-1 flex items-center gap-2">
            <Pill tone={rams?.status === 'Approved' ? 'ok' : rams ? 'warn' : 'bad'}>{rams?.status ?? 'Missing'}</Pill>
            <span className="text-[12px] text-ink-3 tnum">{rams ? `${rams.rev} · ${fmtDate(rams.reviewed)}` : ''}</span>
          </div>
        </div>
        <div className="rounded-2xl bg-sunk p-3">
          <div className="text-[11.5px] font-medium text-ink-3">Today’s sign-on</div>
          <div className="mt-1 text-[13px] font-medium text-ink">
            {job.id === 'CE-2291' ? (ramsSigned ? 'Barry McEvoy signed on via app' : '3 of 4 crew signed on') : 'All crew signed on'}
          </div>
        </div>
        <div className="rounded-2xl bg-sunk p-3">
          <div className="text-[11.5px] font-medium text-ink-3">Permits live</div>
          <div className="mt-1 text-[17px] font-semibold text-ink tnum">{rams?.permits ?? 0}</div>
        </div>
      </div>
      {all.length ? (
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={thc}>Type</th>
              <th className={thc}>Item</th>
              <th className={thc}>Date</th>
              <th className={thc}>Status</th>
            </tr>
          </thead>
          <tbody>
            {all.map((h) => (
              <tr key={h.id}>
                <td className={tdc}>
                  <Pill tone={h.type === 'Near miss' || h.type === 'Incident' ? 'warn' : 'neutral'}>{h.type}</Pill>
                </td>
                <td className={clsx(tdc, 'max-w-[320px] truncate')}>{h.title}</td>
                <td className={clsx(tdc, 'tnum')}>{fmtDate(h.date)}</td>
                <td className={tdc}>
                  <Pill tone={h.status === 'Open' ? 'brand' : 'ok'} dot>
                    {h.status}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>No H&S items logged in the last 60 days.</Empty>
      )}
    </div>
  );
}
