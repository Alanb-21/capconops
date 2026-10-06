// Deterministic seed data for the Capcon OS demo. Fixed seed, fixed clock.
// Real public Capcon projects are used as showcase jobs. Everything else
// (and every number) is demo data. Problems (debt, delays, disputes) are only
// ever attached to fictional main contractors.

import { makeRng } from './rng';
import { TODAY_ISO, isoAdd, iso, addDays, parse, daysBetween } from '../lib/dates';
import type {
  Allocation,
  Building,
  Crew,
  DayKey,
  Defect,
  DesignRecord,
  DiaryEntry,
  Drawing,
  HsItem,
  InstallSystem,
  Job,
  JobStage,
  MaintenanceContract,
  MaintenanceVisit,
  Material,
  Ncr,
  RamsRecord,
  Region,
  Rfi,
  Sector,
  Spool,
  SpoolStage,
  StockItem,
  Technician,
  Tender,
  TenderStage,
  Ticket,
  Valuation,
  Variation,
} from './types';
import { DAYS, SPOOL_STAGES } from './types';

const rng = makeRng(20100);

// ---------------------------------------------------------------- places
type Place = { name: string; county: string; lat: number; lng: number };
const IE_PLACES: Place[] = [
  { name: 'Clonee', county: 'Co. Meath', lat: 53.41, lng: -6.44 },
  { name: 'Grange Castle', county: 'Dublin 22', lat: 53.318, lng: -6.43 },
  { name: 'Ringaskiddy', county: 'Co. Cork', lat: 51.83, lng: -8.32 },
  { name: 'Carrigtwohill', county: 'Co. Cork', lat: 51.91, lng: -8.26 },
  { name: 'Dunboyne', county: 'Co. Meath', lat: 53.42, lng: -6.47 },
  { name: 'Leixlip', county: 'Co. Kildare', lat: 53.365, lng: -6.495 },
  { name: 'Limerick', county: 'Co. Limerick', lat: 52.664, lng: -8.63 },
  { name: 'Shannon', county: 'Co. Clare', lat: 52.703, lng: -8.864 },
  { name: 'Waterford', county: 'Co. Waterford', lat: 52.259, lng: -7.11 },
  { name: 'Sligo', county: 'Co. Sligo', lat: 54.27, lng: -8.47 },
  { name: 'Athlone', county: 'Co. Westmeath', lat: 53.423, lng: -7.94 },
  { name: 'Drogheda', county: 'Co. Louth', lat: 53.717, lng: -6.35 },
  { name: 'Dundalk', county: 'Co. Louth', lat: 54.0, lng: -6.405 },
  { name: 'Letterkenny', county: 'Co. Donegal', lat: 54.95, lng: -7.735 },
  { name: 'Kilkenny', county: 'Co. Kilkenny', lat: 52.654, lng: -7.252 },
  { name: 'Naas', county: 'Co. Kildare', lat: 53.215, lng: -6.667 },
  { name: 'Swords', county: 'Co. Dublin', lat: 53.46, lng: -6.218 },
  { name: 'Blanchardstown', county: 'Dublin 15', lat: 53.388, lng: -6.377 },
  { name: 'Tallaght', county: 'Dublin 24', lat: 53.288, lng: -6.373 },
  { name: 'Sandyford', county: 'Dublin 18', lat: 53.275, lng: -6.225 },
  { name: 'Galway', county: 'Co. Galway', lat: 53.274, lng: -9.049 },
  { name: 'Ennis', county: 'Co. Clare', lat: 52.843, lng: -8.986 },
  { name: 'Tralee', county: 'Co. Kerry', lat: 52.271, lng: -9.702 },
  { name: 'Wexford', county: 'Co. Wexford', lat: 52.336, lng: -6.463 },
  { name: 'Portlaoise', county: 'Co. Laois', lat: 53.034, lng: -7.299 },
  { name: 'Mullingar', county: 'Co. Westmeath', lat: 53.526, lng: -7.338 },
  { name: 'Cavan', county: 'Co. Cavan', lat: 53.99, lng: -7.36 },
  { name: 'Castlebar', county: 'Co. Mayo', lat: 53.855, lng: -9.298 },
  { name: 'Carlow', county: 'Co. Carlow', lat: 52.836, lng: -6.934 },
  { name: 'Little Island', county: 'Co. Cork', lat: 51.905, lng: -8.355 },
  { name: 'Citywest', county: 'Dublin 24', lat: 53.283, lng: -6.42 },
  { name: 'Ballycoolin', county: 'Dublin 11', lat: 53.405, lng: -6.36 },
  { name: 'Arklow', county: 'Co. Wicklow', lat: 52.797, lng: -6.16 },
  { name: 'Navan', county: 'Co. Meath', lat: 53.652, lng: -6.681 },
];
const UK_PLACES: Place[] = [
  { name: 'Thurrock', county: 'Essex', lat: 51.49, lng: 0.33 },
  { name: 'Slough', county: 'Berkshire', lat: 51.51, lng: -0.59 },
  { name: 'Park Royal', county: 'London', lat: 51.53, lng: -0.27 },
  { name: 'Stansted', county: 'Essex', lat: 51.89, lng: 0.26 },
  { name: 'Milton Keynes', county: 'Buckinghamshire', lat: 52.04, lng: -0.76 },
  { name: 'Birmingham', county: 'West Midlands', lat: 52.48, lng: -1.89 },
  { name: 'Manchester', county: 'Greater Manchester', lat: 53.48, lng: -2.24 },
  { name: 'Leeds', county: 'West Yorkshire', lat: 53.8, lng: -1.55 },
  { name: 'Bristol', county: 'Avon', lat: 51.45, lng: -2.59 },
  { name: 'Didcot', county: 'Oxfordshire', lat: 51.61, lng: -1.24 },
  { name: 'Cambridge', county: 'Cambridgeshire', lat: 52.2, lng: 0.12 },
  { name: 'Hayes', county: 'London', lat: 51.51, lng: -0.42 },
  { name: 'Dartford', county: 'Kent', lat: 51.44, lng: 0.22 },
  { name: 'Basingstoke', county: 'Hampshire', lat: 51.27, lng: -1.09 },
  { name: 'Coventry', county: 'West Midlands', lat: 52.41, lng: -1.51 },
  { name: 'Doncaster', county: 'South Yorkshire', lat: 53.52, lng: -1.13 },
  { name: 'Glasgow', county: 'Scotland', lat: 55.86, lng: -4.25 },
  { name: 'Edinburgh', county: 'Scotland', lat: 55.95, lng: -3.19 },
  { name: 'Cardiff', county: 'Wales', lat: 51.48, lng: -3.18 },
  { name: 'Newport', county: 'Wales', lat: 51.59, lng: -3.0 },
  { name: 'Northampton', county: 'Northamptonshire', lat: 52.24, lng: -0.9 },
  { name: 'Peterborough', county: 'Cambridgeshire', lat: 52.57, lng: -0.24 },
  { name: 'Reading', county: 'Berkshire', lat: 51.45, lng: -0.97 },
  { name: 'Crawley', county: 'West Sussex', lat: 51.11, lng: -0.18 },
  { name: 'Southampton', county: 'Hampshire', lat: 50.91, lng: -1.4 },
  { name: 'Nottingham', county: 'Nottinghamshire', lat: 52.95, lng: -1.15 },
  { name: 'Belfast', county: 'Co. Antrim', lat: 54.6, lng: -5.93 },
  { name: 'Newry', county: 'Co. Down', lat: 54.176, lng: -6.34 },
  { name: 'Harlow', county: 'Essex', lat: 51.77, lng: 0.09 },
  { name: 'Luton', county: 'Bedfordshire', lat: 51.88, lng: -0.42 },
];

// Fictional main contractors (used for every generic job).
const IE_MCS = [
  'Kilcarra Construction',
  'Slaney Build',
  'Corrib Contracting',
  'Tolka Building',
  'Glenmore Main Contractors',
  'Derravaragh Projects',
  'Ballinure Construction',
  'Feale Contracts',
  'Moyola Build',
];
const UK_MCS = [
  'Northwold Construction',
  'Halden Build',
  'Maresfield Contracting',
  'Barrowford Construction',
  'Ashcombe Projects',
  'Kestrel Main Contracting',
  'Thornbury Build Group',
];

const NAME_TEMPLATES: Record<Sector, string[]> = {
  'Data Centre': ['Hyperscale data centre', 'Data centre campus Phase 2', 'Data hall extension', 'Colocation data centre'],
  Pharmaceutical: ['Pharma expansion', 'Biologics facility', 'Fill-finish building', 'API manufacturing block'],
  Warehouse: ['Distribution warehouse', 'Logistics hub', 'Cold store', 'Last-mile depot'],
  Commercial: ['Office scheme', 'Retail park', 'Mixed-use block', 'Business park Unit 4'],
  Education: ['Secondary school', 'University science building', 'Primary school campus'],
  Hospitals: ['Hospital extension', 'Elective care centre', 'Acute block refurbishment'],
  Residential: ['Apartment scheme', 'Student accommodation', 'Build-to-rent block'],
  Airports: ['Hangar and stands', 'Terminal pier extension'],
  Stadiums: ['Sports centre', 'Regional sports campus'],
  Specialist: ['Energy-from-waste plant', 'Food processing plant', 'Water treatment works'],
};

const SYSTEMS: InstallSystem[] = ['Valsir Rainplus', 'Geberit Pluvia', 'Terrain Hydromax', 'Blucher stainless'];

// ---------------------------------------------------------------- jobs
interface JobSpec {
  id?: string;
  name: string;
  shortName?: string;
  sector: Sector;
  region: Region;
  place: Place;
  client?: string;
  mc: string;
  mcPublic?: boolean;
  consultant?: string;
  showcase?: boolean;
  designOnly?: boolean;
  stage?: JobStage;
  roofArea?: number;
  sDesigned?: number;
  gDesigned?: number;
  pct?: number; // installed fraction
  health?: Job['health'];
  healthReason?: string;
  system?: InstallSystem;
  material?: Material;
  workReady?: boolean;
  startDaysAgo?: number;
}

const SHOWCASE: JobSpec[] = [
  {
    id: 'CE-2291',
    name: 'Dexcom campus, Athenry',
    shortName: 'Dexcom',
    sector: 'Pharmaceutical',
    region: 'IE',
    place: { name: 'Athenry', county: 'Co. Galway', lat: 53.296, lng: -8.745 },
    client: 'Dexcom',
    mc: 'John Paul Construction',
    mcPublic: true,
    showcase: true,
    stage: 'Install',
    roofArea: 15000,
    sDesigned: 1103,
    gDesigned: 1253,
    pct: 0.74,
    health: 'on-track',
    system: 'Valsir Rainplus',
    material: 'HDPE',
    workReady: true,
    startDaysAgo: 230,
  },
  {
    id: 'CE-2304',
    name: 'North London Heat & Power Plant',
    shortName: 'NLHPP',
    sector: 'Specialist',
    region: 'UK',
    place: { name: 'Edmonton', county: 'London', lat: 51.618, lng: -0.04 },
    client: 'North London Heat & Power Project',
    mc: 'Undisclosed',
    mcPublic: true,
    showcase: true,
    stage: 'Install',
    roofArea: 21000,
    sDesigned: 2140,
    gDesigned: 980,
    pct: 0.52,
    health: 'at-risk',
    healthReason: 'Zone C spools held at re-test; 3 RFIs on outlet positions open with the design team',
    system: 'Geberit Pluvia',
    material: 'HDPE',
    workReady: true,
    startDaysAgo: 160,
  },
  {
    id: 'CE-2318',
    name: 'Laya Arena, Ballsbridge',
    shortName: 'Laya Arena',
    sector: 'Stadiums',
    region: 'IE',
    place: { name: 'Ballsbridge', county: 'Dublin 4', lat: 53.326, lng: -6.229 },
    client: 'RDS',
    mc: 'Undisclosed',
    mcPublic: true,
    showcase: true,
    stage: 'Install',
    roofArea: 6200,
    sDesigned: 520,
    gDesigned: 410,
    pct: 0.63,
    health: 'on-track',
    system: 'Valsir Rainplus',
    material: 'HDPE',
    workReady: true,
    startDaysAgo: 120,
  },
  {
    id: 'CE-2242',
    name: 'RDS Anglesea Stand',
    shortName: 'Anglesea Stand',
    sector: 'Stadiums',
    region: 'IE',
    place: { name: 'Ballsbridge', county: 'Dublin 4', lat: 53.3245, lng: -6.2265 },
    client: 'RDS',
    mc: 'Undisclosed',
    mcPublic: true,
    showcase: true,
    stage: 'Testing & commissioning',
    roofArea: 3800,
    sDesigned: 310,
    gDesigned: 290,
    pct: 0.97,
    health: 'on-track',
    system: 'Geberit Pluvia',
    material: 'HDPE',
    startDaysAgo: 300,
  },
  {
    id: 'CE-2337',
    name: 'Changi Airport Terminal 5',
    shortName: 'Changi T5',
    sector: 'Airports',
    region: 'SG',
    place: { name: 'Changi', county: 'Singapore', lat: 1.36, lng: 103.99 },
    client: 'Changi Airport Group',
    mc: 'Design only',
    mcPublic: true,
    consultant: 'KPF',
    showcase: true,
    designOnly: true,
    stage: 'Design',
    roofArea: 160000,
    sDesigned: 18400,
    gDesigned: 6200,
    pct: 0,
    health: 'on-track',
    system: 'Geberit Pluvia',
    material: 'Stainless steel',
    startDaysAgo: 280,
  },
  {
    id: 'CE-2351',
    name: 'Pharma facility design, Tuas',
    shortName: 'Singapore pharma',
    sector: 'Pharmaceutical',
    region: 'SG',
    place: { name: 'Tuas', county: 'Singapore', lat: 1.32, lng: 103.65 },
    client: 'Confidential',
    mc: 'Design only',
    mcPublic: true,
    consultant: 'PM Group',
    showcase: true,
    designOnly: true,
    stage: 'Design',
    roofArea: 24000,
    sDesigned: 2600,
    gDesigned: 1400,
    pct: 0,
    health: 'on-track',
    system: 'Valsir Rainplus',
    material: 'HDPE',
    startDaysAgo: 140,
  },
  {
    id: 'CE-2276',
    name: 'Diageo carbon-neutral brewery',
    shortName: 'Diageo',
    sector: 'Specialist',
    region: 'IE',
    place: { name: 'Littleton', county: 'Co. Tipperary', lat: 52.636, lng: -7.735 },
    client: 'Diageo',
    mc: 'Undisclosed',
    mcPublic: true,
    showcase: true,
    stage: 'Testing & commissioning',
    roofArea: 9800,
    sDesigned: 860,
    gDesigned: 690,
    pct: 0.95,
    health: 'on-track',
    system: 'Blucher stainless',
    material: 'Stainless steel',
    startDaysAgo: 260,
  },
  {
    id: 'CE-2329',
    name: 'Dexcom Stadium, Connacht Rugby',
    shortName: 'Connacht Rugby',
    sector: 'Stadiums',
    region: 'IE',
    place: { name: 'Galway', county: 'Co. Galway', lat: 53.276, lng: -9.024 },
    client: 'Connacht Rugby',
    mc: 'Undisclosed',
    mcPublic: true,
    showcase: true,
    stage: 'Install',
    roofArea: 7400,
    sDesigned: 640,
    gDesigned: 520,
    pct: 0.41,
    health: 'on-track',
    system: 'Valsir Rainplus',
    material: 'HDPE',
    workReady: true,
    startDaysAgo: 95,
  },
  {
    id: 'CE-2312',
    name: 'Project Oriel, St Pancras',
    shortName: 'Project Oriel',
    sector: 'Hospitals',
    region: 'UK',
    place: { name: 'St Pancras', county: 'London', lat: 51.532, lng: -0.122 },
    client: 'Moorfields / UCL',
    mc: 'Bouygues UK',
    mcPublic: true,
    showcase: true,
    stage: 'Install',
    roofArea: 8600,
    sDesigned: 780,
    gDesigned: 1120,
    pct: 0.58,
    health: 'on-track',
    system: 'Geberit Pluvia',
    material: 'HDPE',
    workReady: true,
    startDaysAgo: 190,
  },
  {
    id: 'CE-2347',
    name: 'Tile factory, Sittingbourne',
    shortName: 'Sittingbourne',
    sector: 'Commercial',
    region: 'UK',
    place: { name: 'Sittingbourne', county: 'Kent', lat: 51.34, lng: 0.735 },
    client: 'Confidential',
    mc: 'Toureen Group',
    mcPublic: true,
    showcase: true,
    stage: 'Install',
    roofArea: 3200,
    sDesigned: 320,
    gDesigned: 180,
    pct: 0.88,
    health: 'on-track',
    system: 'Terrain Hydromax',
    material: 'HDPE',
    workReady: true,
    startDaysAgo: 70,
  },
  {
    id: 'CE-2359',
    name: 'Nordic data centre remedial (-35°C)',
    shortName: 'Nordic DC',
    sector: 'Data Centre',
    region: 'EU',
    place: { name: 'Luleå', county: 'Sweden', lat: 65.58, lng: 22.15 },
    client: 'Confidential',
    mc: 'Design only',
    mcPublic: true,
    showcase: true,
    designOnly: true,
    stage: 'Design',
    roofArea: 14000,
    sDesigned: 900,
    gDesigned: 400,
    pct: 0,
    health: 'on-track',
    system: 'Geberit Pluvia',
    material: 'HDPE',
    startDaysAgo: 60,
  },
  {
    id: 'CE-2362',
    name: 'Milan data centre design',
    shortName: 'Milan DC',
    sector: 'Data Centre',
    region: 'EU',
    place: { name: 'Milan', county: 'Italy', lat: 45.46, lng: 9.19 },
    client: 'Confidential',
    mc: 'Design only',
    mcPublic: true,
    showcase: true,
    designOnly: true,
    stage: 'Design',
    roofArea: 19000,
    sDesigned: 1500,
    gDesigned: 700,
    pct: 0,
    health: 'on-track',
    system: 'Valsir Rainplus',
    material: 'HDPE',
    startDaysAgo: 45,
  },
];

const placeIE = (n: string) => IE_PLACES.find((p) => p.name === n)!;
const placeUK = (n: string) => UK_PLACES.find((p) => p.name === n)!;

// Scenario jobs: fictional, carry the problems the agents surface.
const SCENARIO: JobSpec[] = [
  {
    id: 'CE-2333',
    name: 'Hyperscale data centre, Clonee',
    sector: 'Data Centre',
    region: 'IE',
    place: placeIE('Clonee'),
    mc: 'Kilcarra Construction',
    stage: 'Install',
    roofArea: 26000,
    pct: 0.46,
    health: 'at-risk',
    healthReason: '6 working days behind the main contractor programme; no crew booked tomorrow',
    workReady: true,
    startDaysAgo: 150,
  },
  {
    id: 'CE-2321',
    name: 'Pharma expansion, Ringaskiddy',
    sector: 'Pharmaceutical',
    region: 'IE',
    place: placeIE('Ringaskiddy'),
    mc: 'Corrib Contracting',
    stage: 'Install',
    roofArea: 11200,
    pct: 0.55,
    health: 'at-risk',
    healthReason: 'IPAF expiring for two technicians next week; client permit-to-work requires valid IPAF',
    workReady: true,
    startDaysAgo: 175,
  },
  {
    id: 'CE-2309',
    name: 'Distribution warehouse, Thurrock',
    sector: 'Warehouse',
    region: 'UK',
    place: placeUK('Thurrock'),
    mc: 'Northwold Construction',
    stage: 'Install',
    roofArea: 31000,
    pct: 0.67,
    health: 'on-track',
    workReady: true,
    startDaysAgo: 140,
  },
  {
    id: 'CE-2326',
    name: 'Biologics facility, Carrigtwohill',
    sector: 'Pharmaceutical',
    region: 'IE',
    place: placeIE('Carrigtwohill'),
    mc: 'Slaney Build',
    stage: 'Install',
    roofArea: 9400,
    pct: 0.31,
    health: 'at-risk',
    healthReason: 'RFI-0412 on outlet setting-out unanswered 9 days',
    workReady: true,
    startDaysAgo: 110,
  },
  {
    id: 'CE-2315',
    name: 'Data centre campus Phase 2, Grange Castle',
    sector: 'Data Centre',
    region: 'IE',
    place: placeIE('Grange Castle'),
    mc: 'Tolka Building',
    stage: 'Install',
    roofArea: 22000,
    pct: 0.6,
    health: 'on-track',
    workReady: true,
    startDaysAgo: 165,
  },
  {
    id: 'CE-2340',
    name: 'Logistics hub, Milton Keynes',
    sector: 'Warehouse',
    region: 'UK',
    place: placeUK('Milton Keynes'),
    mc: 'Halden Build',
    stage: 'Install',
    roofArea: 28000,
    pct: 0.22,
    health: 'blocked',
    healthReason: 'Roof deck Zones 3 and 4 not handed over by main contractor; crew stood down',
    workReady: false,
    startDaysAgo: 85,
  },
  {
    id: 'CE-2298',
    name: 'Data hall extension, Slough',
    sector: 'Data Centre',
    region: 'UK',
    place: placeUK('Slough'),
    mc: 'Maresfield Contracting',
    stage: 'Install',
    roofArea: 12500,
    pct: 0.71,
    health: 'at-risk',
    healthReason: 'Application 7 unpaid at 74 days; pay less notice not received',
    workReady: true,
    startDaysAgo: 250,
  },
];

const STAGE_WEIGHTS: [JobStage, number][] = [
  ['Design', 0.13],
  ['Prefabrication', 0.15],
  ['Install', 0.5],
  ['Testing & commissioning', 0.14],
  ['Handover', 0.08],
];
function pickStage(): JobStage {
  let x = rng.next();
  for (const [s, w] of STAGE_WEIGHTS) {
    if ((x -= w) <= 0) return s;
  }
  return 'Install';
}

const IE_SECTOR_MIX: Sector[] = [
  'Data Centre', 'Data Centre', 'Data Centre', 'Data Centre', 'Pharmaceutical', 'Pharmaceutical', 'Pharmaceutical',
  'Warehouse', 'Warehouse', 'Commercial', 'Commercial', 'Education', 'Hospitals', 'Residential', 'Residential', 'Specialist', 'Airports', 'Stadiums',
];
const UK_SECTOR_MIX: Sector[] = [
  'Warehouse', 'Warehouse', 'Warehouse', 'Data Centre', 'Data Centre', 'Data Centre', 'Commercial', 'Commercial',
  'Education', 'Hospitals', 'Residential', 'Pharmaceutical', 'Specialist', 'Specialist',
];

function genericSpecs(): JobSpec[] {
  const out: JobSpec[] = [];
  const used = new Set<string>();
  const mk = (region: 'IE' | 'UK', n: number) => {
    const places = region === 'IE' ? IE_PLACES : UK_PLACES;
    const mix = region === 'IE' ? IE_SECTOR_MIX : UK_SECTOR_MIX;
    const mcs = region === 'IE' ? IE_MCS : UK_MCS;
    let guard = 0;
    while (n > 0 && guard++ < 2000) {
      const sector = rng.pick(mix);
      const place = rng.pick(places);
      const tmpl = rng.pick(NAME_TEMPLATES[sector]);
      const name = `${tmpl}, ${place.name}`;
      if (used.has(name)) continue;
      used.add(name);
      const roofArea = Math.round(
        (sector === 'Data Centre' || sector === 'Warehouse' ? rng.int(9000, 32000) : sector === 'Residential' || sector === 'Education' ? rng.int(1800, 6000) : rng.int(3000, 14000)) / 100,
      ) * 100;
      out.push({
        name,
        sector,
        region,
        place: { ...place, lat: place.lat + rng.float(-0.03, 0.03), lng: place.lng + rng.float(-0.04, 0.04) },
        mc: rng.pick(mcs),
        roofArea,
      });
      n--;
    }
  };
  mk('IE', 70 - 6 - 6); // showcase IE (6) + scenario IE (4) roughly
  mk('UK', 40 - 4 - 3);
  return out;
}

const OVERSEAS_GENERIC: JobSpec[] = [
  {
    name: 'Hyperscale data centre design, Johor',
    sector: 'Data Centre',
    region: 'MY',
    place: { name: 'Johor', county: 'Malaysia', lat: 1.49, lng: 103.74 },
    mc: 'Design only',
    designOnly: true,
    stage: 'Design',
    roofArea: 42000,
  },
  {
    name: 'Semiconductor fab design, Kulim',
    sector: 'Specialist',
    region: 'MY',
    place: { name: 'Kulim', county: 'Malaysia', lat: 5.37, lng: 100.56 },
    mc: 'Design only',
    designOnly: true,
    stage: 'Design',
    roofArea: 36000,
  },
  {
    name: 'Logistics centre design, Jurong',
    sector: 'Warehouse',
    region: 'SG',
    place: { name: 'Jurong', county: 'Singapore', lat: 1.33, lng: 103.72 },
    mc: 'Design only',
    designOnly: true,
    stage: 'Design',
    roofArea: 28000,
  },
];

const STAGE_PCT: Record<JobStage, [number, number]> = {
  Design: [0, 0],
  Prefabrication: [0, 0.08],
  Install: [0.15, 0.88],
  'Testing & commissioning': [0.93, 0.99],
  Handover: [1, 1],
};

const FOREMAN_NOTES = [
  'Siphonic tailpipes fused and clipped on grid line {g}; outlets set to level.',
  'Gravity stacks to first floor complete, brackets torqued, awaiting MEWP for high level.',
  'Collector pipe run along {g} installed and supported, 2 no. anchor points fitted.',
  'Water test on Zone {z} passed, witness signature from site engineer.',
  'Spools from Maynooth delivered 07:40, unloaded and staged at laydown area.',
  'Lost 2 hours to wind, MEWP grounded until 11:00. Caught up in afternoon.',
  'Toolbox talk: working at height and edge protection. All crew signed on.',
  'Outlet installation in valley gutter {g} complete, 6 no. outlets, membrane flashings by roofer.',
  'Electrofusion welds logged on tablet, weld log uploaded.',
  'Coordinated with M&E on clash at {g}; offset agreed and marked up.',
];

function fill(t: string) {
  return t
    .replace('{g}', `${rng.pick(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])}${rng.int(1, 14)}`)
    .replace('{z}', rng.pick(['1', '2', '3', '4', 'A', 'B', 'C']));
}

// ------------------------------------------------------------ technicians
const FIRST = [
  'Ciarán', 'Seán', 'Pádraig', 'Darragh', 'Cian', 'Eoin', 'Conor', 'Niall', 'Shane', 'Declan', 'Gearóid', 'Liam', 'Kevin', 'Mark',
  'Tomás', 'Ronan', 'Fergal', 'Aidan', 'Dermot', 'Brian', 'Kieran', 'Paul', 'Stephen', 'Jamie', 'Ryan', 'Callum', 'Owen', 'Jack',
  'Dylan', 'Lee', 'Gary', 'Craig', 'Daniel', 'Tom', 'Rory', 'Oisín', 'Fionn', 'Tadhg', 'Marek', 'Tomasz', 'Andrei', 'Lukas', 'Piotr', 'Mihai',
];
const LAST = [
  'Murphy', 'Kelly', 'Walsh', 'Byrne', 'Ryan', "O'Brien", 'Doyle', 'Kavanagh', 'Brennan', 'Doherty', 'Lynch', 'McCarthy', 'Nolan',
  'Gallagher', 'Fitzgerald', 'Quinn', 'Moran', 'Keane', 'Hughes', 'Carroll', 'Dunne', 'Maguire', 'Farrell', 'Hayes', 'Power', 'Kowalski',
  'Nowak', 'Popescu', 'Harris', 'Clarke', 'Wright', 'Turner', 'Shaw', 'Fletcher', 'Mason', 'Kehoe', 'Daly', 'Foley', 'Healy', 'Whelan',
];

const CREW_COLOURS = ['#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#0ea5e9', '#10b981', '#f59e0b'];

function genCrewsAndTechs(): { crews: Crew[]; techs: Technician[] } {
  const crews: Crew[] = [];
  const techs: Technician[] = [];
  const usedNames = new Set<string>(['Barry McEvoy']);
  const nm = () => {
    for (;;) {
      const n = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
      if (!usedNames.has(n)) {
        usedNames.add(n);
        return n;
      }
    }
  };
  const ieBases = ['Maynooth', 'Galway', 'Cork', 'Dublin', 'Limerick', 'Dundalk', 'Maynooth', 'Waterford', 'Athlone'];
  const ukBases = ['Stansted', 'London', 'Midlands', 'Manchester', 'Thames Gateway'];
  let t = 1;
  const mkTickets = (region: 'IE' | 'UK', role: Technician['role']): Ticket[] => {
    const list: Ticket[] = [];
    const exp = (min: number, max: number) => isoAdd(rng.int(min, max));
    if (region === 'IE') list.push({ type: 'Safe Pass', ref: `SP-${rng.int(100000, 999999)}`, expires: exp(40, 1300) });
    else list.push({ type: 'CSCS', ref: `CSCS-${rng.int(1000000, 9999999)}`, expires: exp(60, 1500) });
    list.push({ type: 'IPAF 3a/3b', ref: `IPAF-${rng.int(10000, 99999)}`, expires: exp(30, 1700) });
    list.push({ type: 'PASMA', ref: `PASMA-${rng.int(10000, 99999)}`, expires: exp(45, 1600) });
    list.push({ type: 'Manual handling', ref: `MH-${rng.int(1000, 9999)}`, expires: exp(40, 1000) });
    list.push({ type: 'Working at height', ref: `WAH-${rng.int(1000, 9999)}`, expires: exp(50, 1000) });
    if (role === 'Foreman' || role === 'Lead Technician' || rng.chance(0.3)) list.push({ type: 'First aid', ref: `FA-${rng.int(1000, 9999)}`, expires: exp(60, 1000) });
    return list;
  };
  const build = (region: 'IE' | 'UK', idx: number, base: string) => {
    const id = `${region}-${String(idx).padStart(2, '0')}`;
    const crew: Crew = {
      id,
      name: `${region} Crew ${idx} · ${base}`,
      region,
      foremanId: '',
      memberIds: [],
      colour: CREW_COLOURS[(crews.length) % CREW_COLOURS.length],
    };
    const size = 4;
    for (let k = 0; k < size; k++) {
      const role: Technician['role'] = k === 0 ? 'Foreman' : k === 3 && rng.chance(0.4) ? 'Apprentice' : 'Technician';
      let name = nm();
      let roleFinal: Technician['role'] = role;
      if (region === 'IE' && idx === 2 && k === 0) {
        name = 'Barry McEvoy';
        roleFinal = 'Lead Technician';
      }
      const tech: Technician = {
        id: `T${String(t++).padStart(3, '0')}`,
        name,
        role: roleFinal,
        region,
        crewId: id,
        base,
        tickets: mkTickets(region, roleFinal),
        utilisation: rng.float(0.72, 0.97),
        travelHoursWeek: Math.round(rng.float(3, 14)),
        phone: region === 'IE' ? `+353 8${rng.int(3, 7)} ${rng.int(100, 999)} ${rng.int(1000, 9999)}` : `+44 7${rng.int(100, 999)} ${rng.int(100000, 999999)}`,
      };
      techs.push(tech);
      crew.memberIds.push(tech.id);
      if (k === 0) crew.foremanId = tech.id;
    }
    crews.push(crew);
  };
  ieBases.forEach((b, i) => build('IE', i + 1, b));
  ukBases.forEach((b, i) => build('UK', i + 1, b));
  // 4 maintenance technicians (not in install crews) - a "maintenance" pseudo crew
  const mCrew: Crew = { id: 'MT-01', name: 'Maintenance team', region: 'IE', foremanId: '', memberIds: [], colour: '#64748b' };
  for (let k = 0; k < 4; k++) {
    const region: 'IE' | 'UK' = k < 3 ? 'IE' : 'UK';
    const tech: Technician = {
      id: `T${String(t++).padStart(3, '0')}`,
      name: nm(),
      role: 'Maintenance Technician',
      region,
      crewId: 'MT-01',
      base: region === 'IE' ? 'Maynooth' : 'Stansted',
      tickets: mkTickets(region, 'Maintenance Technician'),
      utilisation: rng.float(0.7, 0.9),
      travelHoursWeek: Math.round(rng.float(8, 16)),
      phone: region === 'IE' ? `+353 87 ${rng.int(100, 999)} ${rng.int(1000, 9999)}` : `+44 7${rng.int(100, 999)} ${rng.int(100000, 999999)}`,
    };
    techs.push(tech);
    mCrew.memberIds.push(tech.id);
  }
  mCrew.foremanId = mCrew.memberIds[0];
  crews.push(mCrew);
  return { crews, techs };
}

// ---------------------------------------------------------------- build
function buildJobs(): Job[] {
  const specs = [...SHOWCASE, ...SCENARIO, ...genericSpecs(), ...OVERSEAS_GENERIC];
  let nextId = 2101;
  const jobs: Job[] = [];
  for (const s of specs) {
    const id = s.id ?? `CE-${nextId++}`;
    const designOnly = !!s.designOnly;
    const stage = s.stage ?? (designOnly ? 'Design' : pickStage());
    const roofArea = s.roofArea ?? 8000;
    const totalDesigned = s.sDesigned && s.gDesigned ? s.sDesigned + s.gDesigned : Math.round(roofArea / rng.float(5.6, 7.4));
    const sShare = s.sDesigned && s.gDesigned ? s.sDesigned / totalDesigned : rng.float(0.35, 0.65);
    const sDesigned = s.sDesigned ?? Math.round(totalDesigned * sShare);
    const gDesigned = s.gDesigned ?? totalDesigned - sDesigned;
    const [lo, hi] = STAGE_PCT[stage];
    const pct = designOnly ? 0 : s.pct ?? rng.float(lo, hi);
    const installedTotal = Math.round(totalDesigned * pct);
    // split installed between systems; siphonic tends to lead
    const sInst = Math.min(sDesigned, Math.round(installedTotal * Math.min(0.9, sShare + rng.float(-0.05, 0.08))));
    const gInst = Math.min(gDesigned, installedTotal - sInst);
    const siphonicInstalled = sInst + Math.max(0, installedTotal - sInst - gInst);
    const currency = s.region === 'UK' ? 'GBP' : 'EUR';
    const rate = designOnly ? rng.float(22, 34) : rng.float(165, 235); // €/m (design fee only for design-only)
    const contractValue = Math.round((totalDesigned * rate * (currency === 'GBP' ? 0.86 : 1)) / 1000) * 1000;
    const startDaysAgo = s.startDaysAgo ?? (stage === 'Design' ? rng.int(10, 80) : stage === 'Prefabrication' ? rng.int(40, 120) : stage === 'Install' ? Math.round(100 + pct * 380 + rng.int(-20, 40)) : rng.int(420, 560));
    const start = isoAdd(-startDaysAgo);
    const durationDays = Math.round(Math.max(120, startDaysAgo / Math.max(0.2, pct || 0.15)));
    const mcProgrammeEnd = iso(addDays(start, Math.max(durationDays, startDaysAgo + 20)));
    const health = s.health ?? (stage === 'Install' ? (rng.chance(0.14) ? 'at-risk' : 'on-track') : rng.chance(0.04) ? 'at-risk' : 'on-track');
    const slip = health === 'at-risk' ? rng.int(5, 15) : health === 'blocked' ? rng.int(15, 30) : rng.int(-6, 2);
    const forecastEnd = iso(addDays(mcProgrammeEnd, slip));
    const margin = designOnly ? rng.float(0.34, 0.46) : rng.float(0.12, 0.24) - (health === 'on-track' ? 0 : 0.035);

    // weekly installed (12 completed weeks) + week to date
    const weekly: number[] = [];
    let weekToDate = 0;
    let planned = 0;
    if (stage === 'Install' && !designOnly) {
      const maxWeekly = Math.max(20, Math.round(installedTotal / 10));
      for (let w = 0; w < 12; w++) {
        const ramp = Math.min(1, (w + 1) / 6);
        const v = health === 'blocked' && w > 8 ? rng.int(0, 8) : Math.round(maxWeekly * ramp * rng.float(0.45, 1.05) * 0.55);
        weekly.push(v);
      }
      // trim if it exceeds installed
      const sum = weekly.reduce((a, b) => a + b, 0);
      if (sum > installedTotal * 0.85) {
        const k = (installedTotal * 0.85) / sum;
        for (let w = 0; w < 12; w++) weekly[w] = Math.round(weekly[w] * k);
      }
      planned = Math.round((weekly.slice(-4).reduce((a, b) => a + b, 0) / 4) * rng.float(1.0, 1.25));
      weekToDate = health === 'blocked' ? 0 : Math.round(planned / 5 * rng.float(0.6, 1.3));
    } else {
      for (let w = 0; w < 12; w++) weekly.push(stage === 'Testing & commissioning' && w < 5 ? rng.int(5, 30) : 0);
    }
    const designProgress = designOnly ? (s.id === 'CE-2337' ? 0.68 : rng.float(0.25, 0.85)) : stage === 'Design' ? rng.float(0.3, 0.9) : 1;

    const earned = designOnly ? contractValue * designProgress : contractValue * pct;
    const costToDate = Math.round(earned * (1 - margin + rng.float(-0.02, 0.02)));
    const isShow = !!s.showcase;
    const handoverReadiness =
      stage === 'Handover' ? rng.float(0.55, 0.95) : stage === 'Testing & commissioning' ? rng.float(0.35, 0.8) : stage === 'Install' ? rng.float(0.05, 0.3) * pct : 0;

    const sources: Job['lastUpdate']['source'][] = ['Foreman app', 'Foreman app', 'Site Progress Agent', 'Email', 'Site Progress Agent'];
    const lastAt = new Date(parse(TODAY_ISO + 'T08:30:00').getTime() - rng.int(20, health === 'on-track' ? 60 * 26 : 60 * 72) * 60000);

    jobs.push({
      id,
      name: s.name,
      shortName: s.shortName ?? s.name.split(',')[0],
      sector: s.sector,
      region: s.region,
      location: `${s.place.name}, ${s.place.county}`,
      lat: s.place.lat,
      lng: s.place.lng,
      client: s.client ?? 'Confidential',
      mainContractor: s.mc,
      mainContractorPublic: !!s.mcPublic,
      consultant: s.consultant,
      showcase: isShow,
      designOnly,
      stage,
      system: s.system ?? rng.pick(SYSTEMS),
      material: s.material ?? (rng.chance(0.82) ? 'HDPE' : rng.pick(['Stainless steel', 'Cast iron', 'Aluminium', 'PVC'] as Material[])),
      currency,
      contractValue,
      roofArea,
      siphonicDesigned: sDesigned,
      gravityDesigned: gDesigned,
      siphonicInstalled: Math.min(sDesigned, siphonicInstalled),
      gravityInstalled: gInst,
      weeklyInstalled: weekly,
      weekToDate,
      plannedThisWeek: planned,
      designProgress,
      costToDate,
      forecastMarginPct: margin,
      health,
      healthReason: s.healthReason ?? (health === 'at-risk' ? rng.pick(['Programme float eroded by 4 days after roof sequence change', 'Awaiting MEWP access on east elevation', 'Material call-off later than install date for Zone B']) : undefined),
      start,
      mcProgrammeEnd,
      forecastEnd,
      foremanId: undefined,
      workReady: s.workReady ?? false,
      nextMilestone: {
        name:
          stage === 'Design' ? 'Design sign-off' : stage === 'Prefabrication' ? 'First spool delivery' : stage === 'Install' ? rng.pick(['Zone complete', 'Siphonic water test', 'Roof outlets complete', 'Stacks to ground']) : stage === 'Testing & commissioning' ? 'Commissioning certificate' : 'Handover pack issued',
        date: isoAdd(rng.int(3, 40)),
      },
      mcCutoffDay: rng.pick([20, 22, 25, 25, 28]),
      valuationStatus: 'Not started',
      lastUpdate: {
        at: lastAt.toISOString(),
        source: rng.pick(sources),
        by: '',
        note: fill(rng.pick(FOREMAN_NOTES)),
      },
      retentionPct: designOnly ? 0 : rng.pick([0.03, 0.05, 0.05]),
      handoverReadiness,
      ytd: daysBetween('2026-01-01', start) >= 0,
    });
  }
  return jobs;
}

export const JOBS: Job[] = buildJobs();

// Fix up headline scenario jobs so the story is precise.
const J = (id: string) => JOBS.find((j) => j.id === id)!;
{
  const dex = J('CE-2291');
  dex.contractValue = 468000;
  dex.costToDate = Math.round(dex.contractValue * 0.74 * 0.8);
  dex.forecastMarginPct = 0.2;
  dex.lastUpdate = { at: '2026-10-06T07:52:00', source: 'Foreman app', by: 'Barry McEvoy', note: 'Crew on site 07:30. Continuing siphonic collector runs on Building 2, grid D–F.' };
  dex.nextMilestone = { name: 'Building 2 siphonic water test', date: '2026-10-14' };
  dex.mcCutoffDay = 25;
  dex.handoverReadiness = 0.18;
  const nl = J('CE-2304');
  nl.lastUpdate = { at: '2026-10-05T16:40:00', source: 'Site Progress Agent', by: 'Site Progress Agent', note: 'Read foreman WhatsApp update: Zone B high level complete, Zone C waiting on re-tested spools.' };
  nl.nextMilestone = { name: 'Zone C install start', date: '2026-10-13' };
  const cl = J('CE-2333');
  cl.lastUpdate = { at: '2026-10-02T15:10:00', source: 'Email', by: 'Kilcarra site manager', note: 'Programme rev F issued: data hall 3 roof now available from Wed 7 Oct.' };
}

export const jobById = (id: string) => JOBS.find((j) => j.id === id);

// ---------------------------------------------------------------- crews
export const { crews: CREWS, techs: TECHNICIANS } = genCrewsAndTechs();
export const techById = (id: string) => TECHNICIANS.find((t) => t.id === id);

// Scenario: two technicians on the Ringaskiddy pharma crew have IPAF expiring next week.
{
  const ring = CREWS.find((c) => c.name.includes('Cork'))!; // Cork crew -> Ringaskiddy
  const [a, b] = ring.memberIds.slice(1, 3).map((id) => techById(id)!);
  a.tickets.find((t) => t.type === 'IPAF 3a/3b')!.expires = isoAdd(8);
  b.tickets.find((t) => t.type === 'IPAF 3a/3b')!.expires = isoAdd(10);
  // a third IPAF this month elsewhere (UK) for the "this month" question
  const uk = CREWS.find((c) => c.id === 'UK-02')!;
  techById(uk.memberIds[2])!.tickets.find((t) => t.type === 'IPAF 3a/3b')!.expires = '2026-10-23';
  // Keep everyone else's IPAF out of October so the story is clean
  for (const t of TECHNICIANS) {
    if ([a.id, b.id, uk.memberIds[2]].includes(t.id)) continue;
    const ip = t.tickets.find((x) => x.type === 'IPAF 3a/3b')!;
    if (ip.expires < '2026-11-01') ip.expires = isoAdd(40 + (parseInt(t.id.slice(1)) % 300));
  }
  // A couple of Safe Pass / CSCS warnings inside 30 days
  techById(CREWS.find((c) => c.id === 'IE-06')!.memberIds[1])!.tickets[0].expires = isoAdd(19);
  techById(CREWS.find((c) => c.id === 'UK-04')!.memberIds[3])!.tickets[0].expires = isoAdd(26);
  // one already expired manual handling (UK) to show red
  techById(CREWS.find((c) => c.id === 'UK-05')!.memberIds[2])!.tickets.find((t) => t.type === 'Manual handling')!.expires = isoAdd(-4);
  // site inductions for key sites
  const dexCrew = CREWS.find((c) => c.id === 'IE-02')!;
  for (const id of dexCrew.memberIds) techById(id)!.tickets.push({ type: 'Site induction', ref: 'JPC-DEX', expires: '2027-03-31', note: 'Dexcom Athenry induction' });
  for (const id of ring.memberIds) techById(id)!.tickets.push({ type: 'Site induction', ref: 'CC-RGK', expires: '2026-12-31', note: 'Ringaskiddy pharma induction' });
}

// Allocation: crews → jobs for the demo week. Built from work-ready install jobs.
function buildAllocation(): Allocation {
  const alloc: Allocation = {};
  const installReady = JOBS.filter((j) => j.stage === 'Install' && !j.designOnly && j.health !== 'blocked');
  // Choose which jobs are "work ready" this week: all scenario/showcase ones flagged + a set of generics
  const ieReady = installReady.filter((j) => j.region === 'IE');
  const ukReady = installReady.filter((j) => j.region === 'UK');
  const fixed: Record<string, string[]> = {
    // crewId: [Mon..Fri job ids]
    'IE-02': ['CE-2291', 'CE-2291', 'CE-2291', 'CE-2291', 'CE-2291'], // Galway (Barry) · Dexcom
    'IE-09': ['CE-2329', 'CE-2329', 'CE-2329', 'CE-2329', 'CE-2329'], // Athlone · Connacht Rugby
    'UK-01': ['CE-2347', 'CE-2347', 'CE-2347', 'CE-2309', 'CE-2309'], // Stansted · Sittingbourne → Thurrock
    'UK-04': ['CE-2298', 'CE-2298', 'CE-2298', 'CE-2298', 'CE-2298'], // Manchester base, on Slough this week
    'UK-02': ['CE-2312', 'CE-2312', 'CE-2312', 'CE-2312', 'CE-2312'], // London · Oriel
    'UK-05': ['CE-2304', 'CE-2304', 'CE-2304', 'CE-2304', 'CE-2304'], // Thames Gateway · NLHPP
    'IE-04': ['CE-2318', 'CE-2318', 'CE-2318', 'CE-2318', 'CE-2318'], // Dublin · Laya Arena
    'IE-01': ['CE-2333', 'CE-2333', '', '', ''], // Maynooth · Clonee Mon-Tue only -> gap Wed
    'IE-07': ['CE-2315', 'CE-2315', 'CE-2315', 'CE-2315', 'CE-2315'], // Grange Castle
  };
  // Ringaskiddy is staffed by the Cork crew
  const corkCrew = CREWS.find((c) => c.name.includes('Cork'))!;
  fixed[corkCrew.id] = ['CE-2321', 'CE-2321', 'CE-2321', 'CE-2321', 'CE-2321'];
  const taken = new Set(Object.values(fixed).flat().filter(Boolean));
  const pool = {
    IE: ieReady.filter((j) => !taken.has(j.id) && !['CE-2326'].includes(j.id)),
    UK: ukReady.filter((j) => !taken.has(j.id) && !['CE-2298'].includes(j.id)),
  };
  for (const c of CREWS) {
    if (c.id === 'MT-01') continue;
    const row = {} as Record<DayKey, string | null>;
    const f = fixed[c.id];
    if (f) {
      DAYS.forEach((d, i) => (row[d] = f[i] || null));
    } else {
      const p = pool[c.region];
      const a = p.shift();
      const b = rng.chance(0.5) ? p.shift() : a;
      DAYS.forEach((d, i) => (row[d] = (i < 3 ? a?.id : b?.id) ?? null));
    }
    alloc[c.id] = row;
  }
  // IE Crew 8 finishes its current site on Tuesday: free Wed-Fri (the Scheduler Agent proposes Clonee)
  alloc['IE-08'] = { ...alloc['IE-08'], Wed: null, Thu: null, Fri: null };
  return alloc;
}

export const ALLOCATION: Allocation = buildAllocation();

// mark work-ready on every allocated job + scenario gaps
{
  const allocated = new Set(Object.values(ALLOCATION).flatMap((r) => Object.values(r)).filter(Boolean) as string[]);
  for (const j of JOBS) if (allocated.has(j.id)) j.workReady = true;
  J('CE-2333').workReady = true; // Clonee: ready, crew leaves after Tue
  J('CE-2326').workReady = true; // Carrigtwohill: ready but RFI → no crew
  // foremen
  for (const [crewId, row] of Object.entries(ALLOCATION)) {
    const jid = row.Tue;
    if (jid) {
      const job = J(jid);
      if (!job.foremanId) job.foremanId = CREWS.find((c) => c.id === crewId)!.foremanId;
    }
  }
  for (const j of JOBS) {
    if (!j.lastUpdate.by) {
      j.lastUpdate.by =
        j.lastUpdate.source === 'Site Progress Agent' ? 'Site Progress Agent' : j.foremanId ? techById(j.foremanId)!.name : j.lastUpdate.source === 'Email' ? `${j.mainContractor} site team` : 'Site foreman';
    }
  }
  // jobs not allocated this week shouldn't have week-to-date metres
  for (const j of JOBS) {
    if (j.stage === 'Install' && !allocated.has(j.id)) {
      j.weekToDate = 0;
      // generic jobs not crewed this week: lower plan (no planned work)
      if (!j.workReady) j.plannedThisWeek = 0;
    }
  }
  // Work ready = crew booked on a remaining day this week (Wed-Fri), plus the Clonee gap.
  const laterThisWeek = new Set(Object.values(ALLOCATION).flatMap((r) => [r.Wed, r.Thu, r.Fri]).filter(Boolean) as string[]);
  for (const j of JOBS) j.workReady = laterThisWeek.has(j.id);
  J('CE-2333').workReady = true;
  // Crew-driven plan: ~32 m per crew-day; week to date = Monday's output.
  for (const j of JOBS) {
    if (j.stage !== 'Install') continue;
    const crewDays = Object.values(ALLOCATION).reduce((a, r) => a + DAYS.filter((d) => r[d] === j.id).length, 0);
    const monCrews = Object.values(ALLOCATION).filter((r) => r.Mon === j.id).length;
    j.plannedThisWeek = crewDays * 32;
    j.weekToDate = j.health === 'blocked' ? 0 : Math.round(monCrews * rng.float(24, 36));
  }
  // Normalise the 12-week history so group output tracks crew capacity (~14 crews).
  const TARGET = [1790, 1880, 1745, 1960, 2030, 1915, 2105, 1990, 1870, 2060, 2125, 1985];
  const totals = Array(12).fill(0);
  for (const j of JOBS) j.weeklyInstalled.forEach((v, i) => (totals[i] += v));
  for (const j of JOBS) {
    if (j.stage !== 'Install') continue;
    j.weeklyInstalled = j.weeklyInstalled.map((v, i) => Math.round((v * TARGET[i]) / (totals[i] || 1)));
    const sum = j.weeklyInstalled.reduce((a, b) => a + b, 0) + j.weekToDate;
    const inst = j.siphonicInstalled + j.gravityInstalled;
    if (sum > inst * 0.9) {
      // job is younger than its history implies: raise installed within design limits
      const need = Math.min(j.siphonicDesigned + j.gravityDesigned, Math.ceil(sum / 0.9)) - inst;
      const addS = Math.min(j.siphonicDesigned - j.siphonicInstalled, Math.ceil(need / 2));
      j.siphonicInstalled += addS;
      j.gravityInstalled = Math.min(j.gravityDesigned, j.gravityInstalled + (need - addS));
    }
  }
  // Clonee behind: weekly installs dipped recently
  const cl = J('CE-2333');
  cl.weeklyInstalled = cl.weeklyInstalled.map((v, i) => (i >= 9 ? Math.round(v * 0.45) : v));
  // Dexcom exact week figures for the story
  const dex = J('CE-2291');
  dex.weeklyInstalled = [58, 64, 71, 66, 74, 80, 77, 69, 82, 76, 84, 79];
  dex.plannedThisWeek = 85;
  dex.weekToDate = 21;
  // adjust installed split to match 74%
}

// ---------------------------------------------------------------- tenders
const TENDER_NAMES: [Sector, string][] = [
  ['Data Centre', 'Hyperscale data centre'],
  ['Data Centre', 'Data centre campus Phase 3'],
  ['Data Centre', 'Edge data centre'],
  ['Pharmaceutical', 'Biologics expansion'],
  ['Pharmaceutical', 'Oral solid dose facility'],
  ['Pharmaceutical', 'QC laboratory building'],
  ['Warehouse', 'Distribution centre'],
  ['Warehouse', 'Cold store and dispatch'],
  ['Warehouse', 'Logistics park Units 1-3'],
  ['Commercial', 'Office campus'],
  ['Commercial', 'Retail and leisure scheme'],
  ['Education', 'Post-primary school'],
  ['Education', 'Third-level engineering building'],
  ['Hospitals', 'Ward block'],
  ['Hospitals', 'Radiotherapy unit'],
  ['Residential', 'Apartment scheme Block C'],
  ['Residential', 'Student residence'],
  ['Airports', 'Maintenance hangar'],
  ['Stadiums', 'Stand redevelopment'],
  ['Specialist', 'Anaerobic digestion plant'],
  ['Specialist', 'Brewery packaging hall'],
];

function buildTenders(): Tender[] {
  const out: Tender[] = [];
  let n = 1;
  const estimators = ["Aaron O'Neill", "Aaron O'Neill", "Aaron O'Neill", "Aaron O'Neill", 'Stephen Morris', 'Colm Whitty', 'Donnacha Tobin'];
  const openStages: TenderStage[] = ['Enquiry received', 'Drawings reviewed', 'Design / value engineering', 'Priced', 'Submitted'];
  const mk = (stage: TenderStage, closeOffset: number) => {
    const [sector, base] = rng.pick(TENDER_NAMES);
    const region: 'IE' | 'UK' = rng.chance(0.62) ? 'IE' : 'UK';
    const place = rng.pick(region === 'IE' ? IE_PLACES : UK_PLACES);
    const roofArea = Math.round(rng.int(3000, 30000) / 100) * 100;
    const metres = roofArea / 6.4;
    const value = Math.round((metres * rng.float(160, 230) * (region === 'UK' ? 0.86 : 1)) / 1000) * 1000;
    const received = isoAdd(closeOffset - rng.int(14, 35));
    const decided = stage === 'Won' || stage === 'Lost' || stage === 'Submitted';
    out.push({
      id: `TN-${String(800 + n++)}`,
      name: `${base}, ${place.name}`,
      sector,
      region,
      location: `${place.name}, ${place.county}`,
      mainContractor: rng.pick(region === 'IE' ? IE_MCS : UK_MCS),
      consultant: rng.chance(0.4) ? rng.pick(['Arup', 'Atkins', 'AECOM', 'Jacobs', 'B&W Engineering', 'RKD']) : undefined,
      currency: region === 'UK' ? 'GBP' : 'EUR',
      value,
      received,
      closeDate: isoAdd(closeOffset),
      stage,
      estimator: rng.pick(estimators),
      turnaroundDays: decided ? rng.int(6, 19) : undefined,
      hoursEstimate: Math.round(rng.float(8, 28)),
      veSaving: Math.round((value * rng.float(0.04, 0.14)) / 500) * 500,
      roofArea,
      system: rng.pick(['Siphonic', 'Siphonic + gravity', 'Siphonic + gravity', 'Gravity'] as const),
    });
  };
  // 45 open tenders
  const openPlan: [TenderStage, number][] = [
    ['Enquiry received', 9],
    ['Drawings reviewed', 9],
    ['Design / value engineering', 8],
    ['Priced', 7],
    ['Submitted', 12],
  ];
  for (const [st, k] of openPlan) {
    for (let i = 0; i < k; i++) {
      const close = st === 'Submitted' ? -rng.int(2, 40) : rng.int(st === 'Priced' ? 1 : 3, st === 'Enquiry received' ? 40 : 28);
      mk(st, close);
    }
  }
  void openStages;
  // history: won / lost over the last 12 months
  for (let i = 0; i < 26; i++) mk('Won', -rng.int(20, 360));
  for (let i = 0; i < 38; i++) mk('Lost', -rng.int(20, 360));
  // Make sure 4 tenders close this week (Tue 6 - Fri 9 Oct)
  const closeThisWeek = out.filter((t) => ['Priced', 'Design / value engineering', 'Drawings reviewed'].includes(t.stage)).slice(0, 4);
  const days = [1, 2, 3, 3];
  closeThisWeek.forEach((t, i) => {
    t.closeDate = isoAdd(days[i]);
    t.estimator = i === 2 ? 'Stephen Morris' : "Aaron O'Neill";
  });
  return out;
}
export const TENDERS: Tender[] = buildTenders();

// ---------------------------------------------------------------- RFIs, variations
function buildRfisVariations() {
  const rfis: Rfi[] = [];
  const vars: Variation[] = [];
  let r = 380;
  let v = 150;
  const subjects = [
    'Outlet setting-out vs revised roof falls',
    'Confirm sump depth at gutter G2',
    'Clash with sprinkler main at grid C7',
    'Overflow provision to parapet north elevation',
    'Insulation spec for collector pipes over plant room',
    'Stack termination at ground: drainage connection by others?',
    'Confirm design storm return period (1 in 100 or 1 in 500)',
    'Bracket fixings into composite deck',
  ];
  const varDescs = [
    'Additional 4 no. outlets to new plant deck',
    'Re-route collector around revised AHU positions',
    'Insulation and trace heating to exposed runs',
    'Overflow outlets added to valley gutter',
    'Temporary drainage during roof phasing',
    'Extend stacks 6 m below slab for revised drainage connection',
    'Stainless steel outlets in lieu of HDPE in kitchen roof area',
  ];
  for (const j of JOBS) {
    if (j.designOnly && j.id !== 'CE-2337') continue;
    const nR = j.id === 'CE-2304' ? 3 : j.id === 'CE-2291' ? 6 : rng.int(0, 4);
    for (let i = 0; i < nR; i++) {
      const raised = isoAdd(-rng.int(2, 60));
      const open = j.id === 'CE-2304' ? true : rng.chance(0.3);
      rfis.push({
        id: `RFI-0${r++}`,
        jobId: j.id,
        subject: rng.pick(subjects),
        raised,
        to: j.designOnly ? (j.consultant ?? 'Client design team') : j.id === 'CE-2304' ? 'Design team' : `${j.mainContractor}`,
        status: open ? 'Open' : 'Answered',
        answered: open ? undefined : isoAdd(rng.int(1, 6), raised),
      });
    }
    if (j.designOnly || j.stage === 'Design') continue;
    const nV = j.id === 'CE-2291' ? 5 : rng.int(0, 4);
    for (let i = 0; i < nV; i++) {
      const status = rng.pick(['Agreed', 'Agreed', 'Submitted', 'Pending pricing', 'Agreed', 'Rejected'] as Variation['status'][]);
      if (v === 244) v++; // VO-244 is reserved for the Grange Castle scenario
      vars.push({
        id: `VO-${v++}`,
        jobId: j.id,
        description: rng.pick(varDescs),
        value: Math.round(rng.int(1500, 26000) / 100) * 100,
        status,
        date: isoAdd(-rng.int(3, 120)),
        instructedBy: j.mainContractorPublic ? 'Site instruction' : `${j.mainContractor} PM`,
      });
    }
  }
  // Scenario: Carrigtwohill RFI open 9 days
  rfis.push({ id: 'RFI-0412', jobId: 'CE-2326', subject: 'Outlet setting-out conflicts with revised roof falls, Zone 2', raised: isoAdd(-9), to: 'Slaney Build', status: 'Open' });
  // Scenario: verbal variation at Grange Castle not priced
  vars.push({ id: 'VO-244', jobId: 'CE-2315', description: 'Re-route collector around relocated AHUs on data hall 2 roof (instructed verbally on site walk)', value: 18400, status: 'Instructed (verbal)', date: isoAdd(-6), instructedBy: 'Tolka Building site manager' });
  // Dexcom specific
  const dexV = vars.filter((x) => x.jobId === 'CE-2291');
  const dexDesc = [
    ['Crow’s nest access platform, design and install', 'Agreed', 14800],
    ['Insulation upgrade to Building 3 gravity runs', 'Agreed', 9600],
    ['Additional outlets to canopy link roof', 'Submitted', 6200],
    ['Temporary drainage during roof phasing', 'Agreed', 4300],
    ['Trace heating to exposed high-level collectors', 'Pending pricing', 7900],
  ] as const;
  dexV.forEach((x, i) => {
    x.description = dexDesc[i][0];
    x.status = dexDesc[i][1];
    x.value = dexDesc[i][2];
    x.instructedBy = 'JPC site instruction';
  });
  return { rfis, vars };
}
export const { rfis: RFIS, vars: VARIATIONS } = buildRfisVariations();

// ---------------------------------------------------------------- valuations
export function earnedValue(j: Job): number {
  if (j.designOnly) return j.contractValue * j.designProgress;
  const designed = j.siphonicDesigned + j.gravityDesigned;
  const installed = j.siphonicInstalled + j.gravityInstalled;
  return designed > 0 ? (j.contractValue * installed) / designed : 0;
}
export function agreedVariations(jobId: string) {
  return VARIATIONS.filter((v) => v.jobId === jobId && v.status === 'Agreed').reduce((a, b) => a + b.value, 0);
}

function buildValuations(): Valuation[] {
  // Each monthly application = metres installed in that month × contract rate
  // (+ variations agreed that month). The last 12 weeks come from the weekly
  // install history; earlier metres are spread evenly from the start date.
  const out: Valuation[] = [];
  let n = 1;
  const weekStart = (w: number) => isoAdd(-7 * (12 - w), '2026-10-05'); // w=0 oldest
  for (const j of JOBS) {
    if (j.stage === 'Design' && !j.designOnly) continue;
    const start = parse(j.start);
    const months: string[] = [];
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d < new Date(2026, 9, 1)) {
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      d.setMonth(d.getMonth() + 1);
    }
    if (months.length === 0) continue;
    const perMonth: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
    const designedM = j.siphonicDesigned + j.gravityDesigned;
    const rate = designedM > 0 ? j.contractValue / designedM : 0;
    if (j.designOnly) {
      const fee = j.contractValue * j.designProgress;
      months.forEach((m) => (perMonth[m] = fee / months.length));
    } else {
      const inst = j.siphonicInstalled + j.gravityInstalled - j.weekToDate;
      let recent = 0;
      j.weeklyInstalled.forEach((v, w) => {
        const m = weekStart(w).slice(0, 7);
        if (m in perMonth) {
          perMonth[m] += v * rate;
          recent += v;
        }
      });
      const earlier = months.filter((m) => m < weekStart(0).slice(0, 7));
      const rest = Math.max(0, inst - recent);
      if (earlier.length) earlier.forEach((m) => (perMonth[m] += (rest / earlier.length) * rate));
      else perMonth[months[0]] += rest * rate;
      for (const v of VARIATIONS) {
        if (v.jobId !== j.id || v.status !== 'Agreed') continue;
        const m = v.date.slice(0, 7);
        perMonth[m in perMonth ? m : months[months.length - 1]] += v.value;
      }
    }
    let appNo = 1;
    for (const m of months) {
      const applied = Math.round(perMonth[m]);
      if (applied <= 0) continue;
      const [yy, mm] = m.split('-').map(Number);
      const submitted = iso(new Date(yy, mm - 1, Math.min(28, j.mcCutoffDay)));
      const ageDays = daysBetween(submitted, TODAY_ISO);
      const certPct = rng.float(0.9, 0.99);
      const certified = ageDays > 21 ? Math.round(applied * certPct) : ageDays > 9 && rng.chance(0.55) ? Math.round(applied * certPct) : null;
      const certifiedOn = certified !== null ? isoAdd(rng.int(8, 21), submitted) : undefined;
      const paid = certified !== null && ageDays > 44 ? certified : null;
      out.push({
        id: `AFP-${String(n++).padStart(4, '0')}`,
        jobId: j.id,
        month: m,
        appNo: appNo++,
        applied,
        certified,
        paid,
        submitted,
        certifiedOn,
        paidOn: paid !== null ? isoAdd(rng.int(28, 42), submitted) : undefined,
        dueOn: isoAdd(j.region === 'UK' ? 35 : 30, submitted),
      });
    }
  }
  // Scenario: Slough application unpaid at 74 days (fictional Maresfield Contracting)
  const sl = out.filter((v) => v.jobId === 'CE-2298');
  const target = sl[sl.length - 3];
  if (target) {
    target.submitted = isoAdd(-74);
    target.dueOn = isoAdd(35, target.submitted);
    target.certified = Math.round(target.applied * 0.93);
    target.certifiedOn = isoAdd(14, target.submitted);
    target.paid = null;
    target.paidOn = undefined;
  }
  // Two more slow payers, fictional contractors only
  const slow = out.filter((v) => {
    const age = daysBetween(v.submitted, TODAY_ISO);
    return ['CE-2101', 'CE-2104', 'CE-2107', 'CE-2110', 'CE-2113'].includes(v.jobId) && age > 62 && age < 90;
  });
  slow.slice(0, 2).forEach((v) => {
    v.paid = null;
    v.paidOn = undefined;
  });
  return out;
}
export const VALUATIONS: Valuation[] = buildValuations();

// Real, public relationships are never shown with late payment or delay:
// every application past its due date is paid; on-track showcase jobs finish on programme.
{
  const publicJob = new Set(JOBS.filter((j) => j.showcase || j.mainContractorPublic).map((j) => j.id));
  for (const v of VALUATIONS) {
    if (!publicJob.has(v.jobId)) continue;
    if (v.dueOn <= TODAY_ISO) {
      if (v.certified === null) {
        v.certified = Math.round(v.applied * 0.97);
        v.certifiedOn = isoAdd(14, v.submitted);
      }
      if (v.paid === null) {
        v.paid = v.certified;
        v.paidOn = isoAdd(-1, v.dueOn);
      }
    }
  }
  for (const j of JOBS) {
    if (!j.showcase) continue;
    if (j.health === 'on-track' && j.forecastEnd > j.mcProgrammeEnd) j.forecastEnd = isoAdd(-3, j.mcProgrammeEnd);
    if (j.designOnly) {
      j.lastUpdate = {
        at: '2026-10-05T15:20:00',
        source: 'Email',
        by: j.id === 'CE-2337' ? 'Stephen Morris' : 'Design team (Maynooth)',
        note: j.id === 'CE-2337' ? 'Issued roof drainage layouts for Zone 3 at rev P4 to KPF for comment.' : 'Issued updated hydraulic calculations and layouts for comment.',
      };
    }
  }
  for (const j of JOBS) {
    if (j.designOnly && !j.showcase) {
      j.lastUpdate = { at: '2026-10-02T11:05:00', source: 'Email', by: 'Design team (Maynooth)', note: 'Design model updated and issued for coordination.' };
    }
  }
}

// valuation status per job for the current (October) cycle
{
  for (const j of JOBS) {
    const sep = VALUATIONS.find((v) => v.jobId === j.id && v.month === '2026-09');
    if (j.stage === 'Design' && !j.designOnly) j.valuationStatus = 'Not started';
    else if (!sep) j.valuationStatus = 'Not started';
    else if (sep.paid !== null) j.valuationStatus = 'Paid';
    else if (sep.certified !== null) j.valuationStatus = 'Certified';
    else j.valuationStatus = 'Submitted';
  }
  // Thurrock: October application not submitted, cut-off Thursday 8 Oct
  const th = J('CE-2309');
  th.mcCutoffDay = 8;
  th.valuationStatus = 'Draft';
}

// ---------------------------------------------------------------- diary
function buildDiary(): DiaryEntry[] {
  const out: DiaryEntry[] = [];
  let n = 1;
  for (const j of JOBS) {
    if (j.designOnly || j.stage === 'Design') continue;
    const count = j.id === 'CE-2291' ? 0 : j.stage === 'Install' ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const at = new Date(parse(j.lastUpdate.at).getTime() - i * rng.int(20, 30) * 3600000);
      out.push({
        id: `D${n++}`,
        jobId: j.id,
        at: i === 0 ? j.lastUpdate.at : at.toISOString(),
        author: i === 0 ? j.lastUpdate.by : j.foremanId ? techById(j.foremanId)!.name : 'Site foreman',
        source: i === 0 ? j.lastUpdate.source : rng.pick(['Foreman app', 'Site Progress Agent'] as const),
        text: i === 0 ? j.lastUpdate.note : fill(rng.pick(FOREMAN_NOTES)),
        metres: j.stage === 'Install' ? rng.int(8, 40) : undefined,
        photo: rng.chance(0.5) ? `p${rng.int(1, 6)}` : undefined,
        weather: rng.pick(['Dry, 12°C', 'Showers, 10°C', 'Overcast, 13°C', 'Windy, 11°C']),
      });
    }
  }
  const dex: [string, string, DiaryEntry['source'], string, number | undefined, string | undefined, string][] = [
    ['2026-10-06T07:52:00', 'Barry McEvoy', 'Foreman app', 'Crew on site 07:30. Continuing siphonic collector runs on Building 2, grid D–F. MEWP booked all day.', undefined, undefined, 'Overcast, 11°C'],
    ['2026-10-05T16:20:00', 'Barry McEvoy', 'Foreman app', 'Building 2 collector D1–D9 installed and supported, 21 m. Electrofusion weld log uploaded (14 welds).', 21, 'p1', 'Showers, 10°C'],
    ['2026-10-05T12:05:00', 'Site Progress Agent', 'Site Progress Agent', 'Read 3 photos from Barry (WhatsApp): crow’s nest platform in use on high bay; matched to Building 2 high-level zone. % complete updated 73% → 74%.', undefined, 'p2', 'Showers, 10°C'],
    ['2026-10-02T15:45:00', 'Barry McEvoy', 'Foreman app', 'Week total 79 m. Building 3 gravity stacks to ground complete, insulation by others to follow.', 18, 'p3', 'Dry, 13°C'],
    ['2026-10-01T10:10:00', 'Inbox Agent', 'Email', 'JPC issued programme rev 14: Building 2 roof handover brought forward to 12 Oct. Filed to Dexcom and flagged to Donnacha.', undefined, undefined, 'Dry, 14°C'],
    ['2026-09-30T16:30:00', 'Barry McEvoy', 'Foreman app', 'Water test Building 1 siphonic System S1-S4 passed. JPC site engineer witnessed, certificate photo attached.', 16, 'p4', 'Windy, 12°C'],
    ['2026-09-29T16:05:00', 'Barry McEvoy', 'Foreman app', 'Toolbox talk: working at height on crow’s nest platform. All 4 crew signed on. 1,000+ operatives on campus, deliveries via Gate 3 only.', 15, undefined, 'Dry, 13°C'],
    ['2026-09-26T15:40:00', 'Barry McEvoy', 'Foreman app', 'Spools B2-041 to B2-058 delivered from Maynooth prefab, checked against delivery note, staged at laydown 4.', 20, 'p5', 'Showers, 11°C'],
  ];
  dex.forEach(([at, author, source, text, metres, photo, weather]) =>
    out.push({ id: `D${n++}`, jobId: 'CE-2291', at, author, source, text, metres, photo, weather }),
  );
  return out;
}
export const DIARY: DiaryEntry[] = buildDiary();

// ---------------------------------------------------------------- design
function buildDesign(): { drawings: Drawing[]; design: DesignRecord[] } {
  const drawings: Drawing[] = [];
  const design: DesignRecord[] = [];
  const titles = ['Roof drainage layout', 'Siphonic system schematic', 'Gravity stacks and collectors', 'Outlet details', 'Bracketing and supports', 'Sections', 'Hydraulic calculation summary', 'Overflow strategy', 'Prefab spool drawings'];
  const designers = ['Stephen Morris', 'Julia Cavanaugh', 'Design team (Maynooth)', 'Design team (Stansted)'];
  for (const j of JOBS) {
    const n = j.designOnly ? rng.int(10, 16) : rng.int(5, 10);
    for (let i = 0; i < n; i++) {
      const revN = rng.int(0, j.designOnly ? 6 : 4);
      const status: Drawing['status'] =
        j.stage === 'Design' ? rng.pick(['In progress', 'For comment', 'For comment', 'For construction']) : j.stage === 'Handover' ? 'As built' : rng.pick(['For construction', 'For construction', 'For construction', 'Superseded']);
      drawings.push({
        id: `${j.id}-DR${i}`,
        jobId: j.id,
        number: `${j.id.replace('CE-', 'CAP-')}-${String(100 + i * 10)}`,
        title: titles[i % titles.length] + (i >= titles.length ? ` (Zone ${i - titles.length + 2})` : ''),
        rev: status === 'For comment' || status === 'In progress' ? `P${revN + 1}` : `C${revN}`,
        status,
        date: isoAdd(-rng.int(2, 120)),
      });
    }
    const clashStart = j.designOnly ? rng.int(60, 140) : rng.int(10, 50);
    const clash: number[] = [];
    let c = clashStart;
    for (let w = 0; w < 8; w++) {
      clash.push(c);
      c = Math.max(0, Math.round(c * rng.float(0.6, 0.95)));
    }
    const budget = j.designOnly ? Math.round(j.contractValue / 85) : Math.round((j.siphonicDesigned + j.gravityDesigned) / 9);
    design.push({
      jobId: j.id,
      hydraulicCalcs: j.stage === 'Design' ? rng.pick(['In progress', 'Checked', 'Not started']) : 'Approved',
      signOff: j.stage === 'Design' ? rng.pick(['Pending', 'Internal']) : 'Client approved',
      bimStatus: j.designOnly ? rng.pick(['LOD 350', 'LOD 400']) : j.stage === 'Handover' ? 'As built' : rng.pick(['LOD 300', 'LOD 350', 'LOD 400', 'Not required']),
      clashTrend: clash,
      designHoursBudget: budget,
      designHoursUsed: Math.round(budget * (j.designOnly ? j.designProgress * rng.float(0.9, 1.15) : rng.float(0.75, 1.08))),
      designer: j.id === 'CE-2337' || j.id === 'CE-2304' ? 'Stephen Morris' : rng.pick(designers),
    });
  }
  const changi = design.find((d) => d.jobId === 'CE-2337')!;
  changi.hydraulicCalcs = 'Checked';
  changi.bimStatus = 'LOD 400';
  changi.clashTrend = [212, 184, 160, 131, 118, 96, 81, 64];
  changi.designHoursBudget = 4200;
  changi.designHoursUsed = 2930;
  const nl = design.find((d) => d.jobId === 'CE-2304')!;
  nl.clashTrend = [44, 41, 37, 30, 28, 22, 19, 17];
  nl.designHoursBudget = 640;
  nl.designHoursUsed = 702;
  return { drawings, design };
}
export const { drawings: DRAWINGS, design: DESIGN } = buildDesign();

// ---------------------------------------------------------------- prefab
const DIAMETERS = [40, 50, 56, 63, 75, 90, 110, 125, 160, 200, 250, 315];
function buildSpools(): Spool[] {
  const out: Spool[] = [];
  const eligible = JOBS.filter((j) => !j.designOnly && (j.stage === 'Prefabrication' || j.stage === 'Install'));
  const weights = eligible.map((j) => (j.id === 'CE-2291' ? 6 : j.id === 'CE-2304' ? 6 : j.stage === 'Prefabrication' ? 3 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let n = 1;
  eligible.forEach((j, idx) => {
    const k = Math.max(1, Math.round((weights[idx] / total) * 300));
    for (let i = 0; i < k; i++) {
      const stage: SpoolStage =
        j.stage === 'Prefabrication' ? rng.pick(SPOOL_STAGES.slice(0, 5)) : rng.pick(['Cut', 'Fused / welded', 'Pressure tested', 'QC passed', 'Packed', 'Dispatched', 'On site', 'On site'] as SpoolStage[]);
      const dia = rng.pick(DIAMETERS);
      const length = +rng.float(1.2, 6).toFixed(1);
      out.push({
        id: `SP-${String(4000 + n++)}`,
        jobId: j.id,
        material: j.material === 'Stainless steel' ? 'Stainless steel' : 'HDPE',
        diameter: dia,
        length,
        stage,
        due: isoAdd(stage === 'On site' ? -rng.int(1, 20) : rng.int(1, 28)),
        weightKg: +(length * dia * 0.012).toFixed(1),
      });
    }
  });
  // NLHPP Zone C spools held at pressure test
  out.filter((s) => s.jobId === 'CE-2304').slice(0, 8).forEach((s) => {
    s.stage = 'Pressure tested';
    s.due = isoAdd(6);
  });
  return out;
}
export const SPOOLS: Spool[] = buildSpools();

export const STOCK: StockItem[] = (() => {
  const out: StockItem[] = [];
  let n = 1;
  for (const m of ['HDPE', 'Stainless steel', 'Cast iron', 'Aluminium'] as Material[]) {
    const dias = m === 'HDPE' ? DIAMETERS : m === 'Stainless steel' ? [50, 75, 110, 160, 200] : [75, 100, 150];
    for (const d of dias) {
      const reorder = m === 'HDPE' ? Math.round((420 - d) / 2) + 40 : 30;
      const low = (m === 'HDPE' && (d === 110 || d === 160 || d === 56)) || (m === 'Stainless steel' && d === 110);
      out.push({
        id: `ST-${n++}`,
        material: m,
        diameter: d,
        onHand: low ? Math.round(reorder * rng.float(0.35, 0.8)) : Math.round(reorder * rng.float(1.3, 3.6)),
        reorderLevel: reorder,
        onOrder: low && rng.chance(0.4) ? reorder * 2 : 0,
        supplier: m === 'HDPE' ? rng.pick(['Valsir', 'Geberit', 'Terrain']) : m === 'Stainless steel' ? 'Blucher' : 'Merchant',
      });
    }
  }
  return out;
})();

// ---------------------------------------------------------------- HSQE
function buildHs(): { hs: HsItem[]; rams: RamsRecord[]; ncrs: Ncr[] } {
  const hs: HsItem[] = [];
  const rams: RamsRecord[] = [];
  const ncrs: Ncr[] = [];
  let n = 1;
  const nearMiss = [
    'Unsecured bracket box at roof edge',
    'MEWP outrigger close to open trench',
    'Pedestrian route blocked by spool delivery',
    'Dropped fixing from height, exclusion zone in place',
    'Extension lead across walkway',
    'Wind gust moved pipe length during lift',
  ];
  const live = JOBS.filter((j) => !j.designOnly && j.stage !== 'Design' && j.stage !== 'Handover');
  for (const j of live) {
    if (rng.chance(0.14)) hs.push({ id: `HS-${n++}`, jobId: j.id, type: 'Near miss', title: rng.pick(nearMiss), date: isoAdd(-rng.int(0, 5)), status: rng.chance(0.6) ? 'Closed' : 'Open', severity: rng.pick(['Low', 'Low', 'Medium']) });
    if (rng.chance(0.08)) hs.push({ id: `HS-${n++}`, jobId: j.id, type: 'Near miss', title: rng.pick(nearMiss), date: isoAdd(-rng.int(6, 60)), status: 'Closed', severity: 'Low' });
    if (rng.chance(0.4)) hs.push({ id: `HS-${n++}`, jobId: j.id, type: 'Toolbox talk', title: rng.pick(['Working at height', 'Manual handling of spools', 'Hot works and fusion welding', 'MEWP rescue plan', 'Silica and dust']), date: isoAdd(-rng.int(0, 14)), status: 'Closed' });
    if (rng.chance(0.12)) hs.push({ id: `HS-${n++}`, jobId: j.id, type: 'Audit', title: rng.pick(['ISO 45001 site audit', 'Main contractor safety walk', 'Director site visit']), date: isoAdd(-rng.int(0, 30)), status: 'Closed' });
    if (rng.chance(0.03)) hs.push({ id: `HS-${n++}`, jobId: j.id, type: 'Incident', title: rng.pick(['Minor hand laceration, first aid only', 'Slip on wet deck, no lost time']), date: isoAdd(-rng.int(3, 80)), status: 'Closed', severity: 'Low' });
    const pharmaOrDc = j.sector === 'Pharmaceutical' || j.sector === 'Data Centre';
    rams.push({
      jobId: j.id,
      status: rng.chance(0.9) ? 'Approved' : rng.pick(['Submitted', 'Revision required']),
      rev: `R${rng.int(1, 5)}`,
      reviewed: isoAdd(-rng.int(5, 90)),
      permits: pharmaOrDc ? rng.int(2, 6) : rng.int(0, 2),
    });
  }
  // Scenario: Milton Keynes RAMS missing for revised sequence; Ringaskiddy revision required
  const mk = rams.find((r) => r.jobId === 'CE-2340');
  if (mk) mk.status = 'Revision required';
  const rk = rams.find((r) => r.jobId === 'CE-2321');
  if (rk) rk.status = 'Approved';
  const ncrTitles = ['Weld log missing for 3 fusion joints', 'Bracket spacing exceeds spec on run 4', 'Wrong outlet type delivered to site', 'Pressure test record not countersigned', 'Insulation gap at penetration'];
  for (let i = 0; i < 9; i++) {
    const j = rng.pick(live);
    ncrs.push({ id: `NCR-${210 + i}`, jobId: j.id, title: rng.pick(ncrTitles), raised: isoAdd(-rng.int(1, 80)), status: i < 4 ? 'Open' : 'Closed', clause: rng.pick(['8.5.1', '8.7', '7.5.3', '8.6']) });
  }
  return { hs, rams, ncrs };
}
export const { hs: HS_ITEMS, rams: RAMS, ncrs: NCRS } = buildHs();

// ---------------------------------------------------------------- maintenance
function buildMaintenance() {
  const contracts: MaintenanceContract[] = [];
  const buildings: Building[] = [];
  const visits: MaintenanceVisit[] = [];
  const defects: Defect[] = [];
  const maintTechs = TECHNICIANS.filter((t) => t.role === 'Maintenance Technician');
  let b = 1;
  let vN = 1;
  let dN = 1;
  const facility = ['Business Park', 'Distribution Centre', 'Logistics Park', 'Data Campus', 'Manufacturing Campus', 'Retail Park', 'Office Campus', 'Shopping Centre', 'Leisure Centre', 'Science Park', 'Hospital Campus', 'Schools Group'];
  const sectorFor: Record<string, Sector> = {
    'Business Park': 'Commercial',
    'Distribution Centre': 'Warehouse',
    'Logistics Park': 'Warehouse',
    'Data Campus': 'Data Centre',
    'Manufacturing Campus': 'Pharmaceutical',
    'Retail Park': 'Commercial',
    'Office Campus': 'Commercial',
    'Shopping Centre': 'Commercial',
    'Leisure Centre': 'Stadiums',
    'Science Park': 'Education',
    'Hospital Campus': 'Hospitals',
    'Schools Group': 'Education',
  };
  const mkContract = (opts: Partial<MaintenanceContract> & { client: string; site: string; sector: Sector; region: 'IE' | 'UK'; nb: number }) => {
    const id = `MC-${String(500 + contracts.length + 1)}`;
    const ids: string[] = [];
    for (let i = 0; i < opts.nb; i++) {
      const outlets = rng.int(8, 90);
      const bid = `B-${String(b++).padStart(4, '0')}`;
      ids.push(bid);
      buildings.push({
        id: bid,
        contractId: id,
        name: opts.nb === 1 ? opts.site : `${opts.site} · ${rng.pick(['Block', 'Unit', 'Building'])} ${String.fromCharCode(65 + i)}`,
        outlets,
        gratings: Math.round(outlets * rng.float(0.2, 0.6)),
        gutterM: Math.round(outlets * rng.float(6, 14)),
        pipeRunM: Math.round(outlets * rng.float(18, 36)),
        system: rng.pick(['Siphonic', 'Siphonic + gravity', 'Gravity']),
        lastInspection: isoAdd(-rng.int(20, 330)),
        condition: rng.pick(['Good', 'Good', 'Good', 'Fair', 'Needs attention']),
      });
    }
    const currency = opts.region === 'UK' ? 'GBP' : 'EUR';
    const visitsPerYear = rng.pick([1, 2, 2, 4]);
    const annualValue = Math.round((ids.length * visitsPerYear * rng.float(600, 1300) * (currency === 'GBP' ? 0.86 : 1)) / 50) * 50;
    const c: MaintenanceContract = {
      id,
      client: opts.client,
      site: opts.site,
      sector: opts.sector,
      region: opts.region,
      currency,
      annualValue,
      renewal: opts.renewal ?? isoAdd(rng.int(5, 360)),
      visitsPerYear,
      buildingIds: ids,
      fromInstall: opts.fromInstall,
      standard: rng.pick(['BS EN 12056-3', 'BS 8490', 'BS EN 12056-3 & BS 8490']),
    };
    contracts.push(c);
    return c;
  };
  // NCH — completed 7-year install, now recurring revenue
  const nch = mkContract({ client: 'Children’s Health Ireland', site: 'National Children’s Hospital, Dublin', sector: 'Hospitals', region: 'IE', nb: 6, fromInstall: 'CE-1984', renewal: isoAdd(74) });
  nch.annualValue = 38500;
  nch.visitsPerYear = 4;
  nch.standard = 'BS EN 12056-3 & BS 8490';
  // Completed Capcon installs that converted
  const converted = [
    { client: 'Confidential', site: 'Data centre campus, Profile Park', sector: 'Data Centre' as Sector, region: 'IE' as const, nb: 3 },
    { client: 'Confidential', site: 'Pharma campus, Dunboyne', sector: 'Pharmaceutical' as Sector, region: 'IE' as const, nb: 4 },
    { client: 'Confidential', site: 'Distribution centre, Dublin Airport Logistics Park', sector: 'Warehouse' as Sector, region: 'IE' as const, nb: 2 },
    { client: 'Confidential', site: 'Data centre, Slough Trading Estate', sector: 'Data Centre' as Sector, region: 'UK' as const, nb: 3 },
  ];
  converted.forEach((c, i) => mkContract({ ...c, fromInstall: `CE-19${70 + i}` }));
  const ownerNames = ['Property management', 'Facilities', 'Estates', 'Asset management'];
  while (contracts.length < 140) {
    const region: 'IE' | 'UK' = rng.chance(0.62) ? 'IE' : 'UK';
    const place = rng.pick(region === 'IE' ? IE_PLACES : UK_PLACES);
    const f = rng.pick(facility);
    const nb = rng.chance(0.4) ? rng.int(1, 3) : rng.int(3, 5);
    const site = `${place.name} ${f}`;
    if (contracts.some((c) => c.site === site)) continue;
    mkContract({ client: `${place.name} ${f} ${rng.pick(ownerNames)}`, site, sector: sectorFor[f], region, nb, fromInstall: rng.chance(0.3) ? `CE-${rng.int(1700, 2190)}` : undefined });
  }
  // visits: past 60 days + next 60 days
  for (const c of contracts) {
    const every = Math.round(365 / c.visitsPerYear);
    const offset = rng.int(-every + 1, every);
    for (let k = -1; k <= 1; k++) {
      const off = offset + k * every;
      if (off < -60 || off > 60) continue;
      const bid = rng.pick(c.buildingIds);
      visits.push({
        id: `MV-${vN++}`,
        contractId: c.id,
        buildingId: bid,
        date: isoAdd(off),
        type: rng.chance(0.4) ? 'Annual inspection' : 'Planned preventative',
        technician: rng.pick(maintTechs).name,
        status: off < -7 ? 'Report issued' : off < 0 ? 'Completed' : 'Scheduled',
      });
    }
  }
  for (let i = 0; i < 9; i++) {
    const c = rng.pick(contracts);
    visits.push({ id: `MV-${vN++}`, contractId: c.id, buildingId: rng.pick(c.buildingIds), date: isoAdd(-rng.int(0, 40)), type: 'Emergency callout', technician: rng.pick(maintTechs).name, status: i < 2 ? 'In progress' : 'Report issued' });
  }
  const defectTitles = ['Outlet dome missing, debris in tailpipe', 'Gutter joint leaking at movement joint', 'Siphonic outlet baffle damaged', 'Pipe bracket corroded, run sagging', 'Grating blocked with silt', 'Overflow outlet obstructed', 'Vegetation growth in valley gutter', 'Cracked cast iron hopper'];
  const stages: Defect['stage'][] = ['Defect found', 'Defect found', 'Quote raised', 'Quote raised', 'Approved', 'Scheduled', 'Complete'];
  for (let i = 0; i < 34; i++) {
    const c = i < 4 ? nch : rng.pick(contracts);
    defects.push({
      id: `DF-${String(700 + dN++)}`,
      contractId: c.id,
      buildingId: rng.pick(c.buildingIds),
      title: rng.pick(defectTitles),
      found: isoAdd(-rng.int(1, 50)),
      severity: rng.pick(['Low', 'Medium', 'Medium', 'High']),
      stage: rng.pick(stages),
      quoteValue: Math.round(rng.int(250, 6800) / 50) * 50,
    });
  }
  return { contracts, buildings, visits, defects };
}
export const {
  contracts: MAINT_CONTRACTS,
  buildings: BUILDINGS,
  visits: MAINT_VISITS,
  defects: DEFECTS,
} = buildMaintenance();

// ------------------------------------------------------------ handover
export const HANDOVER_ITEMS: { key: string; label: string }[] = [
  { key: 'tests', label: 'Pressure / water test certificates' },
  { key: 'commissioning', label: 'Commissioning records' },
  { key: 'weldlogs', label: 'Electrofusion weld logs' },
  { key: 'asbuilt', label: 'As-built drawings' },
  { key: 'bcar', label: 'BCAR ancillary certificate' },
  { key: 'om', label: 'O&M manual' },
  { key: 'warranty', label: 'Single source warranty registration' },
  { key: 'calcs', label: 'Final hydraulic calculations' },
  { key: 'photos', label: 'Photo record (concealed works)' },
  { key: 'maint', label: 'Maintenance schedule (BS EN 12056-3 / BS 8490)' },
];

export function handoverStatus(job: Job): Record<string, boolean> {
  const r = makeRng(parseInt(job.id.slice(3)) * 7);
  const out: Record<string, boolean> = {};
  const target = Math.round(job.handoverReadiness * HANDOVER_ITEMS.length);
  const order = r.shuffle(HANDOVER_ITEMS.map((h) => h.key));
  order.forEach((k, i) => (out[k] = i < target));
  return out;
}

// ---------------------------------------------------------- monthly series
/** Revenue vs cost by month (group EUR), last 12 months, derived from valuations + maintenance. */
export const MONTHS_12 = (() => {
  const out: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(2026, 8 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
})();
