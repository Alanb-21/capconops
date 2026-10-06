// Deterministic QR-style label for a spool. Not a scannable code: a 25×25 module
// grid seeded from the spool id with the three finder squares, for the demo.
import type { Job, Spool } from '../../data/types';

function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

export const weldCount = (s: Spool) => Math.max(2, Math.round(s.length * 1.4) + (s.diameter % 3));

export function QrCode({ value, size = 132 }: { value: string; size?: number }) {
  const N = 25;
  const rnd = seeded(value);
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
  const cells: [number, number][] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (inFinder(x, y)) continue;
      if (y === 6 || x === 6) {
        if ((x + y) % 2 === 0) cells.push([x, y]); // timing pattern
        continue;
      }
      if (rnd() > 0.52) cells.push([x, y]);
    }
  }
  // alignment pattern
  const al = (cx: number, cy: number) => {
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
      const ring = Math.max(Math.abs(x), Math.abs(y));
      const idx = cells.findIndex(([a, b]) => a === cx + x && b === cy + y);
      if (idx >= 0) cells.splice(idx, 1);
      if (ring !== 1) cells.push([cx + x, cy + y]);
    }
  };
  al(18, 18);
  const finder = (ox: number, oy: number) => (
    <g key={`${ox}-${oy}`}>
      <rect x={ox} y={oy} width={7} height={7} fill="#0b1b2e" />
      <rect x={ox + 1} y={oy + 1} width={5} height={5} fill="#ffffff" />
      <rect x={ox + 2} y={oy + 2} width={3} height={3} fill="#0b1b2e" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${N + 2} ${N + 2}`} shapeRendering="crispEdges" role="img" aria-label={`QR label ${value}`}>
      <rect x={-1} y={-1} width={N + 2} height={N + 2} fill="#ffffff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#0b1b2e" />
      ))}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
    </svg>
  );
}

/** Printed label preview: always light, like the physical label stock. */
export function SpoolLabel({ spool, job }: { spool: Spool; job?: Job }) {
  const rows: [string, string][] = [
    ['Job', job ? `${job.id} · ${job.shortName}` : spool.jobId],
    ['Ø / length', `${spool.diameter} mm · ${spool.length.toFixed(1)} m`],
    ['Material', spool.material],
    ['Weight', `${spool.weightKg.toFixed(1)} kg`],
    ['Welds', `${weldCount(spool)} electrofusion`],
  ];
  return (
    <div className="rounded-2xl bg-white p-4 text-[#0b1b2e] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/10">
      <div className="flex items-center justify-between border-b border-black/10 pb-2">
        <span className="text-[13px] font-bold tracking-[0.18em]">CAPCON</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#5b6b7d]">Maynooth prefab</span>
      </div>
      <div className="mt-3 flex gap-4">
        <QrCode value={spool.id} />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[20px] font-bold leading-none tracking-[0.02em]">{spool.id}</div>
          <dl className="mt-2.5 space-y-1 text-[11.5px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-[70px] shrink-0 text-[#5b6b7d]">{k}</dt>
                <dd className="min-w-0 truncate font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
