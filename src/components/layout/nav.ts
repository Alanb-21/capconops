import {
  Activity,
  Bot,
  Building2,
  Calculator,
  ClipboardCheck,
  Factory,
  Gauge,
  HardHat,
  Home,
  Landmark,
  Leaf,
  PencilRuler,
  Plug,
  Smartphone,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  keywords?: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/command', label: 'Command Centre', icon: Gauge, keywords: 'home dashboard kpi map attention' },
      { to: '/home', label: 'My home', icon: Home, keywords: 'role home' },
    ],
  },
  {
    label: 'Delivery',
    items: [
      { to: '/projects', label: 'Projects & Sites', icon: Building2, keywords: 'jobs sites live' },
      { to: '/crews', label: 'Crews & Scheduling', icon: Users, keywords: 'technicians tickets allocation' },
      { to: '/prefab', label: 'Prefabrication', icon: Factory, keywords: 'spools workshop stock dispatch' },
      { to: '/handover', label: 'Testing & Handover', icon: ClipboardCheck, keywords: 'commissioning bcar o&m certificates' },
    ],
  },
  {
    label: 'Pre-construction',
    items: [
      { to: '/tenders', label: 'Tenders & Estimating', icon: Calculator, keywords: 'pipeline takeoff boq pricing' },
      { to: '/design', label: 'Design & BIM', icon: PencilRuler, keywords: 'drawings rfi hydraulic calcs clash' },
    ],
  },
  {
    label: 'Business',
    items: [
      { to: '/finance', label: 'Commercial & Finance', icon: Landmark, keywords: 'valuations applications payment retentions cash debt' },
      { to: '/maintenance', label: 'Maintenance & Service', icon: Wrench, keywords: 'contracts inspections defects callouts' },
      { to: '/hsqe', label: 'HSQE & Sustainability', icon: Leaf, keywords: 'iso safety near miss rams carbon esg ecovadis' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/agents', label: 'Agents', icon: Bot, keywords: 'ai approvals activity' },
      { to: '/integrations', label: 'Integrations', icon: Plug, keywords: 'microsoft sage xero procore connect' },
      { to: '/efficiency', label: 'What this gives back', icon: Activity, keywords: 'hours saved roi efficiency' },
    ],
  },
  {
    label: 'Field',
    items: [{ to: '/field', label: 'Technician app', icon: Smartphone, keywords: 'mobile phone foreman' }],
  },
];

export const ALL_NAV = NAV.flatMap((g) => g.items);
export { HardHat };
