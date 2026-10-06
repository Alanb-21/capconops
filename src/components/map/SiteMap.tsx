// SVG map of every live site across Ireland and the UK. No tiles, no network:
// bundled GeoJSON projected with d3-geo, pins coloured by health.
import { geoMercator, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection } from 'geojson';
import { motion } from 'framer-motion';
import { Globe, MapPin } from 'lucide-react';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import geo from '../../data/geo/ie-uk.json';
import type { Health, Job } from '../../data/types';
import { jobPct } from '../../data/metrics';
import { pct } from '../../lib/format';
import { Card, HealthDot, HealthPill, Progress, Segmented, clsx, healthColor, healthTone } from '../ui';

const LAND = geo as unknown as FeatureCollection;
/** Frame that keeps mainland Ireland and Great Britain large (Shetland may clip). */
const FRAME: Feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'MultiPoint', coordinates: [[-10.6, 51.35], [1.8, 51.2], [-6.2, 58.65], [-5.2, 49.95]] },
};

const CITIES: { name: string; lng: number; lat: number }[] = [
  { name: 'Dublin', lng: -6.26, lat: 53.35 },
  { name: 'Cork', lng: -8.47, lat: 51.9 },
  { name: 'Galway', lng: -9.05, lat: 53.27 },
  { name: 'Belfast', lng: -5.93, lat: 54.6 },
  { name: 'London', lng: -0.13, lat: 51.51 },
  { name: 'Manchester', lng: -2.24, lat: 53.48 },
  { name: 'Birmingham', lng: -1.89, lat: 52.49 },
  { name: 'Glasgow', lng: -4.25, lat: 55.86 },
];

type HealthFilter = 'all' | 'at-risk' | 'blocked';
type RegionFilter = 'all' | 'IE' | 'UK';
const ORDER: Record<Health, number> = { 'on-track': 0, 'at-risk': 1, blocked: 2 };
const HEIGHT = 460;
const SIDE = 268; // width reserved for the overlay column

/** small deterministic offset so co-located pins stay visible */
function jitter(id: string): [number, number] {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = (h % 360) * (Math.PI / 180);
  const r = 1.5 + (h % 5) * 0.6;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

export function SiteMap({ jobs, className, delay = 0 }: { jobs: Job[]; className?: string; delay?: number }) {
  const nav = useNavigate();
  const uid = useId().replace(/:/g, '');
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [hf, setHf] = useState<HealthFilter>('all');
  const [rf, setRf] = useState<RegionFilter>('all');
  const [hover, setHover] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(320, Math.round(e.contentRect.width))));
    ro.observe(el);
    setWidth(Math.max(320, Math.round(el.clientWidth)));
    return () => ro.disconnect();
  }, []);

  const narrow = width < 640;
  const right = narrow ? width - 16 : width - SIDE - 12;

  const { path, project } = useMemo(() => {
    const proj = geoMercator().fitExtent(
      [
        [20, 64],
        [Math.max(120, right), HEIGHT - 18],
      ],
      FRAME,
    );
    return { path: geoPath(proj), project: (lng: number, lat: number) => proj([lng, lat]) ?? [0, 0] };
  }, [right]);

  const home = useMemo(() => jobs.filter((j) => j.region === 'IE' || j.region === 'UK'), [jobs]);
  const overseas = useMemo(() => jobs.filter((j) => j.region !== 'IE' && j.region !== 'UK'), [jobs]);

  const matches = (j: Job) => (hf === 'all' || j.health === hf) && (rf === 'all' || j.region === rf);

  const pins = useMemo(
    () =>
      [...home]
        .sort((a, b) => ORDER[a.health] - ORDER[b.health])
        .map((j) => {
          const [x, y] = project(j.lng, j.lat);
          const [dx, dy] = jitter(j.id);
          return { job: j, x: x + dx, y: y + dy };
        }),
    [home, project],
  );

  const counts = {
    IE: home.filter((j) => j.region === 'IE').length,
    UK: home.filter((j) => j.region === 'UK').length,
    'on-track': home.filter((j) => j.health === 'on-track').length,
    'at-risk': home.filter((j) => j.health === 'at-risk').length,
    blocked: home.filter((j) => j.health === 'blocked').length,
  };
  const shown = home.filter(matches).length;

  const hovered = pins.find((p) => p.job.id === hover);

  return (
    <Card padded={false} className={clsx('relative overflow-hidden', className)} delay={delay}>
      <div ref={wrap} className="relative w-full" style={{ height: HEIGHT }}>
        <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} className="absolute inset-0 block" role="img" aria-label="Map of live sites in Ireland and the UK">
          <defs>
            <pattern id={`sea-${uid}`} width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="0.9" fill="var(--c-ink-3)" opacity="0.16" />
            </pattern>
            <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="var(--c-brand-2)" stopOpacity="0.10" />
              <stop offset="100%" stopColor="var(--c-brand-2)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={width} height={HEIGHT} fill={`url(#sea-${uid})`} />
          <ellipse cx={right / 2 + 10} cy={HEIGHT / 2 + 20} rx={right / 1.6} ry={HEIGHT / 1.8} fill={`url(#glow-${uid})`} />
          {LAND.features.map((f, i) => (
            <path
              key={String(f.id ?? i)}
              d={path(f) ?? ''}
              fill="var(--c-surface-strong)"
              stroke="var(--c-brand)"
              strokeOpacity={0.35}
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
          ))}
          {LAND.features.map((f, i) => (
            <path key={`t-${String(f.id ?? i)}`} d={path(f) ?? ''} fill="var(--c-brand-3)" fillOpacity={0.24} stroke="none" style={{ pointerEvents: 'none' }} />
          ))}
          {CITIES.map((c) => {
            const [x, y] = project(c.lng, c.lat);
            return (
              <text key={c.name} x={x + 7} y={y - 6} fontSize={10} fill="var(--c-ink-3)" opacity={0.75} style={{ pointerEvents: 'none', fontWeight: 500 }}>
                {c.name}
              </text>
            );
          })}
          {pins.map(({ job, x, y }) => {
            const on = matches(job);
            const col = healthColor(job.health);
            const isHover = hover === job.id;
            return (
              <g
                key={job.id}
                style={{ opacity: on ? 1 : 0.12, pointerEvents: on ? 'auto' : 'none', cursor: 'pointer', transition: 'opacity .25s' }}
                onMouseEnter={() => setHover(job.id)}
                onMouseLeave={() => setHover((h) => (h === job.id ? null : h))}
                onClick={() => nav(`/projects/${job.id}`)}
              >
                {job.health !== 'on-track' && on && <circle cx={x} cy={y} r={7} fill="none" stroke={col} strokeWidth={2} className="pulse-ring" />}
                <circle cx={x} cy={y} r={11} fill="transparent" />
                <circle
                  cx={x}
                  cy={y}
                  r={isHover ? 7 : job.health === 'on-track' ? 4.5 : 5.5}
                  fill={col}
                  stroke="var(--c-surface-strong)"
                  strokeWidth={1.6}
                  style={{ transition: 'r .15s' }}
                />
              </g>
            );
          })}
        </svg>

        {/* header + filters */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-4">
          <div className="pointer-events-auto min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand">
                <MapPin size={15} />
              </span>
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Every live site</h3>
            </div>
            <p className="mt-0.5 pl-9 text-[12.5px] text-ink-3 tnum">
              {shown} of {home.length} sites shown · hover for status, click to open
            </p>
          </div>
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <Segmented<HealthFilter>
              size="sm"
              value={hf}
              onChange={setHf}
              options={[
                { value: 'all', label: 'All' },
                { value: 'at-risk', label: `At risk · ${counts['at-risk']}` },
                { value: 'blocked', label: `Blocked · ${counts.blocked}` },
              ]}
            />
            <Segmented<RegionFilter>
              size="sm"
              value={rf}
              onChange={setRf}
              options={[
                { value: 'all', label: 'IE + UK' },
                { value: 'IE', label: 'IE' },
                { value: 'UK', label: 'UK' },
              ]}
            />
          </div>
        </div>

        {/* overlay column: legend + overseas */}
        {!narrow && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-3" style={{ width: SIDE - 16, top: 64 }}>
            <div className="glass-strong rounded-2xl p-3.5">
              <div className="mb-2.5 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">Sites by health</div>
              <div className="space-y-2">
                {(['on-track', 'at-risk', 'blocked'] as Health[]).map((h) => (
                  <button
                    key={h}
                    onClick={() => setHf(h === 'on-track' || hf === h ? 'all' : (h as HealthFilter))}
                    className="flex w-full items-center gap-2.5 rounded-lg text-left text-[12.5px] text-ink-2 hover:text-ink"
                  >
                    <HealthDot health={h} className="!h-2.5 !w-2.5" />
                    <span className="flex-1">{h === 'on-track' ? 'On track' : h === 'at-risk' ? 'At risk' : 'Blocked'}</span>
                    <span className="font-semibold text-ink tnum">{counts[h]}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t hairline pt-3">
                <button onClick={() => setRf(rf === 'IE' ? 'all' : 'IE')} className={clsx('rounded-xl px-2.5 py-1.5 text-left transition', rf === 'IE' ? 'bg-brand-soft' : 'hover:bg-sunk')}>
                  <div className="text-[11px] text-ink-3">Ireland</div>
                  <div className="text-[17px] font-semibold text-ink tnum">{counts.IE}</div>
                </button>
                <button onClick={() => setRf(rf === 'UK' ? 'all' : 'UK')} className={clsx('rounded-xl px-2.5 py-1.5 text-left transition', rf === 'UK' ? 'bg-brand-soft' : 'hover:bg-sunk')}>
                  <div className="text-[11px] text-ink-3">United Kingdom</div>
                  <div className="text-[17px] font-semibold text-ink tnum">{counts.UK}</div>
                </button>
              </div>
            </div>

            <div className="glass-strong flex min-h-0 flex-1 flex-col rounded-2xl p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <Globe size={14} className="text-brand-2" />
                <span className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">Overseas design</span>
                <span className="ml-auto text-[11.5px] text-ink-3 tnum">{overseas.length} jobs</span>
              </div>
              <div className="scroll-thin -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
                <div className="flex flex-wrap gap-1">
                  {overseas.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => nav(`/projects/${j.id}`)}
                      title={`${j.name} · ${j.location}`}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-sunk px-2.5 py-0.5 text-[11.5px] text-ink-2 transition hover:bg-brand-soft hover:text-brand"
                    >
                      <HealthDot health={j.health} />
                      <span className="truncate">{j.shortName}</span>
                      <span className="text-[10.5px] font-semibold text-ink-3">{j.region}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* tooltip */}
        {hovered && (
          <div
            className="pointer-events-none absolute z-10 w-[250px]"
            style={{
              left: Math.min(Math.max(hovered.x, 133), width - 133),
              top: hovered.y,
              transform: hovered.y < 190 ? 'translate(-50%, 16px)' : 'translate(-50%, calc(-100% - 16px))',
            }}
          >
            <motion.div
              key={hovered.job.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14 }}
              className="glass-strong rounded-2xl p-3 shadow-xl"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink">{hovered.job.name}</div>
                  <div className="truncate text-[11.5px] text-ink-3">
                    {hovered.job.id} · {hovered.job.location}
                  </div>
                </div>
              </div>
              <div className="mt-1.5 truncate text-[12px] text-ink-2">
                {hovered.job.mainContractor === 'Undisclosed' ? <span className="text-ink-3">Undisclosed</span> : hovered.job.mainContractor}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Progress value={jobPct(hovered.job)} tone={healthTone(hovered.job.health)} className="flex-1" />
                <span className="text-[12px] font-semibold text-ink tnum">{pct(jobPct(hovered.job))}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <HealthPill health={hovered.job.health} />
                <span className="truncate text-[11.5px] text-ink-3">{hovered.job.stage}</span>
              </div>
              {hovered.job.healthReason && hovered.job.health !== 'on-track' && <p className="mt-1.5 text-[11.5px] leading-snug text-ink-2">{hovered.job.healthReason}</p>}
            </motion.div>
          </div>
        )}
      </div>
    </Card>
  );
}
