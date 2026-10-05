import type { Person, RoleId } from './types';

// Real public names and titles (no photos). Everything they "do" in the app is demo data.
export const PEOPLE: Record<string, Person> = {
  eugene: { id: 'eugene', name: 'Eugene Finn', role: 'Managing Director' },
  donnacha: { id: 'donnacha', name: 'Donnacha Tobin', role: 'Operations Director', email: 'projects@capconeng.com' },
  robert: { id: 'robert', name: 'Robert Finn', role: 'Operations Director' },
  stephen: { id: 'stephen', name: 'Stephen Morris', role: 'Associate Director' },
  colm: { id: 'colm', name: 'Colm Whitty', role: 'Regional Manager' },
  julia: { id: 'julia', name: 'Julia Cavanaugh', role: 'Sustainability and Technical Design Engineer' },
  aaron: { id: 'aaron', name: "Aaron O'Neill", role: 'Estimator' },
  valerie: { id: 'valerie', name: 'Valerie Curran', role: 'Financial Accountant' },
  barry: { id: 'barry', name: 'Barry McEvoy', role: 'Lead Technician' },
};

export interface RoleDef {
  id: RoleId;
  person: string; // display name
  title: string;
  short: string; // short label for switcher
  initials: string;
  home: string; // route
  focus: string; // one-line description of what they care about
}

export const ROLES: RoleDef[] = [
  { id: 'donnacha', person: 'Donnacha Tobin', title: 'Operations Director', short: 'Operations', initials: 'DT', home: '/command', focus: 'Every live site, crews, valuations and tenders on one screen' },
  { id: 'eugene', person: 'Eugene Finn', title: 'Managing Director', short: 'MD', initials: 'EF', home: '/home/eugene', focus: 'Group performance, cash, order book and growth' },
  { id: 'robert', person: 'Robert Finn', title: 'Operations Director', short: 'Prefab & Maintenance', initials: 'RF', home: '/home/robert', focus: 'Prefabrication throughput, maintenance contracts and delivery' },
  { id: 'stephen', person: 'Stephen Morris', title: 'Associate Director, Design', short: 'Design', initials: 'SM', home: '/home/stephen', focus: 'Design register, BIM, hydraulic calcs and RFIs' },
  { id: 'aaron', person: "Aaron O'Neill", title: 'Estimator', short: 'Estimating', initials: 'AO', home: '/home/aaron', focus: 'Tender pipeline, takeoffs and turnaround' },
  { id: 'valerie', person: 'Valerie Curran', title: 'Financial Accountant', short: 'Finance', initials: 'VC', home: '/home/valerie', focus: 'Applications for payment, retentions, debt and cash' },
  { id: 'julia', person: 'Julia Cavanaugh', title: 'Sustainability and Technical Design Engineer', short: 'Sustainability', initials: 'JC', home: '/home/julia', focus: 'HSQE, ISO evidence, carbon and EcoVadis' },
  { id: 'technician', person: 'Barry McEvoy', title: 'Lead Technician', short: 'Technician', initials: 'BM', home: '/field', focus: 'Today’s site, tasks and tickets' },
];

export const roleById = (id: RoleId) => ROLES.find((r) => r.id === id) ?? ROLES[0];
