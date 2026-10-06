// Takeoff Agent demo output for the sample tender pack
// (public/samples/tender-pack-clonee-phase3.pdf). All figures reconcile:
// roof areas sum to 18,170 m², outlets 48 siphonic + 16 overflow = 64,
// pipe lengths by diameter feed the BOQ pipework lines, and the suggested
// price range brackets the BOQ total.

export const SAMPLE_PACK = {
  file: 'tender-pack-clonee-phase3.pdf',
  path: 'samples/tender-pack-clonee-phase3.pdf',
  title: 'Hyperscale Data Centre, Clonee Phase 3',
  pages: 38,
  sizeLabel: '38 pages · 24.6 MB',
  mainContractor: 'Kilcarra Construction',
};

export const ROOF_AREAS = [
  { roof: 'Roof A', use: 'Data hall 1', area: 4820, siphonic: 12, overflow: 4 },
  { roof: 'Roof B', use: 'Data hall 2', area: 4610, siphonic: 11, overflow: 4 },
  { roof: 'Roof C', use: 'Data hall 3', area: 3940, siphonic: 10, overflow: 3 },
  { roof: 'Roof D', use: 'Plant deck', area: 2760, siphonic: 8, overflow: 2 },
  { roof: 'Roof E', use: 'Admin and security', area: 1180, siphonic: 4, overflow: 2 },
  { roof: 'Roof F', use: 'Link canopy', area: 860, siphonic: 3, overflow: 1 },
];
export const TOTAL_AREA = ROOF_AREAS.reduce((a, r) => a + r.area, 0); // 18,170
export const SIPHONIC_OUTLETS = ROOF_AREAS.reduce((a, r) => a + r.siphonic, 0); // 48
export const OVERFLOW_OUTLETS = ROOF_AREAS.reduce((a, r) => a + r.overflow, 0); // 16
export const TOTAL_OUTLETS = SIPHONIC_OUTLETS + OVERFLOW_OUTLETS; // 64

export const PIPES = [
  { dia: 56, m: 420 },
  { dia: 63, m: 610 },
  { dia: 75, m: 540 },
  { dia: 90, m: 460 },
  { dia: 110, m: 380 },
  { dia: 125, m: 290 },
  { dia: 160, m: 240 },
  { dia: 200, m: 150 },
  { dia: 250, m: 90 },
  { dia: 315, m: 60 },
];
export const PIPE_TOTAL = PIPES.reduce((a, p) => a + p.m, 0); // 3,240
const pipeSum = (lo: number, hi: number) => PIPES.filter((p) => p.dia >= lo && p.dia <= hi).reduce((a, p) => a + p.m, 0);
const VERTICAL_M = 300; // stacks: not on suspension rail

export interface BoqLine {
  ref: string;
  item: string;
  qty: number;
  unit: string;
  rate: number;
}

export const BOQ: BoqLine[] = [
  { ref: '1.1', item: 'Siphonic roof outlets, HDPE, with sump adaptor', qty: SIPHONIC_OUTLETS, unit: 'nr', rate: 465 },
  { ref: '1.2', item: 'Gravity overflow outlets and spitters', qty: OVERFLOW_OUTLETS, unit: 'nr', rate: 310 },
  { ref: '2.1', item: 'HDPE pipework Ø56 to Ø90, supply and install', qty: pipeSum(56, 90), unit: 'm', rate: 58 },
  { ref: '2.2', item: 'HDPE pipework Ø110 to Ø160, supply and install', qty: pipeSum(110, 160), unit: 'm', rate: 96 },
  { ref: '2.3', item: 'HDPE pipework Ø200 to Ø315, supply and install', qty: pipeSum(200, 315), unit: 'm', rate: 168 },
  { ref: '2.4', item: 'Fittings, reducers and electrofusion couplers', qty: PIPE_TOTAL, unit: 'm', rate: 11.5 },
  { ref: '3.1', item: 'Suspension rail bracketing to purlin grid', qty: PIPE_TOTAL - VERTICAL_M, unit: 'm', rate: 24 },
  { ref: '3.2', item: 'Fixed points and anchor brackets', qty: 420, unit: 'nr', rate: 48 },
  { ref: '4.1', item: 'Prefabricated collector spools (Maynooth works)', qty: 186, unit: 'nr', rate: 95 },
  { ref: '5.1', item: 'Hydraulic design, calculations and BIM model (LOD 400)', qty: 1, unit: 'item', rate: 28500 },
  { ref: '5.2', item: 'Pressure testing and commissioning', qty: 1, unit: 'item', rate: 9800 },
  { ref: '6.1', item: 'Preliminaries, supervision and site set-up', qty: 1, unit: 'item', rate: 31400 },
  { ref: '6.2', item: 'O&M manual and as-built drawings', qty: 1, unit: 'item', rate: 4200 },
];
export const lineTotal = (l: BoqLine) => Math.round(l.qty * l.rate);
export const BOQ_TOTAL = BOQ.reduce((a, l) => a + lineTotal(l), 0); // 502,330

/** BOQ rates carry a 15% margin. */
export const BOQ_MARGIN = 0.15;
export const COST = Math.round(BOQ_TOTAL * (1 - BOQ_MARGIN));
export const PRICE_LOW = 486000;
export const PRICE_HIGH = 528000;
export const marginAt = (price: number) => (price > 0 ? (price - COST) / price : 0);

export const ASSUMPTIONS = [
  'Access by MEWP and edge protection provided by main contractor (spec 5.4.6)',
  'Insulation and trace heating to exposed pipework by others',
  'Below-ground drainage connections by groundworks contractor',
  'Box gutters and sumps by roofing contractor; outlets supplied loose for fitting by Capcon',
  'Purlin grid on SE-301 suitable for suspension rail loads; no secondary steel included',
  'Single mobilisation per roof area, normal working hours, no weekend working',
  'Design storm 1 in 100 year, 2.5 min; overflow checked at 1 in 500 year',
  'Prices valid 60 days; HDPE at September 2026 supplier rates',
];

export const TAKEOFF_TENDER_ID = 'TN-CLONEE3';

export function boqCsv(): string {
  const q = (s: string | number) => {
    const v = String(s);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const rows: (string | number)[][] = [
    ['Capcon Engineering Ltd: draft BOQ (Takeoff Agent, for estimator review)'],
    ['Project', `${SAMPLE_PACK.title}: Roof Drainage Package`],
    ['Main contractor', SAMPLE_PACK.mainContractor],
    ['Standard', 'BS EN 12056-3, 1 in 100 year storm; siphonic primary + gravity overflow'],
    [],
    ['Ref', 'Item', 'Qty', 'Unit', 'Rate (EUR)', 'Total (EUR)'],
    ...BOQ.map((l) => [l.ref, l.item, l.qty, l.unit, l.rate.toFixed(2), lineTotal(l)]),
    [],
    ['', 'BOQ total', '', '', '', BOQ_TOTAL],
    ['', 'Suggested price range', '', '', '', `${PRICE_LOW} to ${PRICE_HIGH}`],
    [],
    ['Roof areas'],
    ['Roof', 'Use', 'Area (m2)', 'Siphonic outlets', 'Overflow outlets'],
    ...ROOF_AREAS.map((r) => [r.roof, r.use, r.area, r.siphonic, r.overflow]),
    ['Total', '', TOTAL_AREA, SIPHONIC_OUTLETS, OVERFLOW_OUTLETS],
    [],
    ['Pipe lengths'],
    ['Diameter (mm)', 'Length (m)'],
    ...PIPES.map((p) => [p.dia, p.m]),
    ['Total', PIPE_TOTAL],
    [],
    ['Assumptions'],
    ...ASSUMPTIONS.map((a, i) => [i + 1, a]),
  ];
  return rows.map((r) => r.map(q).join(',')).join('\r\n');
}
