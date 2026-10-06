// Presenter content: one source for the walkthrough, the "How this works"
// drawer, the /guide page and docs/PRESENTER_NOTES.md (npm run notes).

export interface QA {
  q: string;
  a: string;
}

export interface PageNote {
  /** route prefix this note applies to */
  route: string;
  title: string;
  /** one sentence: what this screen is for */
  oneLiner: string;
  /** how it works under the hood, in plain words */
  how: string[];
  /** what to click to show it off */
  click: string[];
  /** lines to say */
  say: string[];
  /** questions Donnacha might ask, with a good answer */
  qa: QA[];
}

export const PAGE_NOTES: PageNote[] = [
  {
    route: '/command',
    title: 'Command Centre',
    oneLiner: 'Donnacha’s home: every live site, crew, valuation and tender on one screen, with a feed of what needs him today.',
    how: [
      'KPIs are calculated live from the same job, crew, valuation and tender records every other page uses, so numbers match everywhere.',
      'The map plots all 106 Ireland and UK sites by health; overseas design jobs (Changi T5, Singapore pharma, Nordic, Milan, Malaysia) sit in the inset.',
      '“Needs your attention” is written by the agents: Scheduler spots crew gaps, Valuation watches cut-offs, Compliance watches tickets, Inbox watches RFIs and verbal variations.',
      'Items clear themselves when the underlying problem is fixed (e.g. book a crew on Clonee and that item disappears).',
      'Charts: metres installed per week (12 weeks, IE vs UK), revenue vs cost (12 months), tender win rate by sector.',
    ],
    click: ['Hover a map pin for status, click it to open the job.', 'Click any KPI to jump to the page behind it.', 'Click an attention item to go straight to the fix.'],
    say: [
      '“This replaces ringing round on a Monday morning. 113 jobs, one screen.”',
      '“Nobody typed this feed. The agents read site updates, emails and the programme overnight and flagged what needs you.”',
    ],
    qa: [
      { q: 'Where do these numbers come from?', a: 'In the real build: your foremen’s app, projects@ inbox, your accounts package and programmes. Here it’s realistic demo data that reconciles end to end.' },
      { q: 'Can I see just the UK?', a: 'Yes. Region filters on the map, and the € / £ toggle in the top bar converts everything to group euro.' },
    ],
  },
  {
    route: '/home',
    title: 'Role homes',
    oneLiner: 'Each person lands on their own home with the numbers that matter to them: Eugene, Robert, Stephen, Aaron, Valerie, Julia.',
    how: [
      'Same data, different lens. The role switcher (top right) changes the home, the KPIs and the attention items shown.',
      'Eugene: revenue, margin, order book, cash, top risks. Robert: prefab throughput and maintenance. Stephen: design register and RFIs. Aaron: tender workload vs capacity. Valerie: applications, debt, retentions, cash. Julia: HSQE, carbon, ISO evidence.',
    ],
    click: ['Open the role switcher and pick Aaron to show estimating over capacity.', 'Pick Valerie to show the Thurrock application waiting for her.'],
    say: ['“Same system, everyone sees their own job first. No separate spreadsheets per department.”'],
    qa: [{ q: 'Who controls what each person can see?', a: 'Role-based access, set by you. Finance figures can be hidden from site roles, for example.' }],
  },
  {
    route: '/projects',
    title: 'Projects & Sites',
    oneLiner: 'Every live job with stage, % complete, crew today, programme, valuation status and when it last reported in.',
    how: [
      '% complete is installed metres ÷ designed metres, siphonic and gravity combined. Design-only jobs use design progress.',
      'Crew on site comes from the Crews board, so moving a crew changes this table.',
      '“Where it truly stands” view (toggle at the top) shows one card per job: last update time, source (foreman app, email, agent), who, and today’s crew.',
      'Jobs updated from the technician app this session are highlighted “Updated just now”.',
      'Job pages have tabs: Overview, Diary, Programme, Commercial, Documents & handover, H&S. Dexcom (CE-2291) is fully built out.',
    ],
    click: ['Toggle to “Where it truly stands”.', 'Open Dexcom and walk the tabs.', 'Open Clonee (amber) to show a job slipping with no crew tomorrow.'],
    say: ['“Every job tells you when it last spoke to you, and how. If it’s gone quiet, you see it before it bites.”'],
    qa: [
      { q: 'What if a foreman doesn’t use the app?', a: 'The Site Progress Agent reads WhatsApp photos and emails and writes the diary for them. You see the source on every update.' },
      { q: 'Can it hold our real programme?', a: 'Yes: imported from the main contractor’s programme (PDF, MS Project or Asta export) and compared against our forecast.' },
    ],
  },
  {
    route: '/crews',
    title: 'Crews & Scheduling',
    oneLiner: 'Weekly crew board for Ireland and the UK, with drag-and-drop allocation, live ticket checks and gap spotting.',
    how: [
      'Rows are crews, columns are Mon–Fri. Drag a crew-day or a site from “Sites needing a crew” onto a day. Clicking a cell gives a pick list if dragging is awkward.',
      'Every move is checked by the Compliance Agent: pharma and data centre sites need valid IPAF; expiring tickets are flagged before you book.',
      'Gaps panel: sites with work ready and no crew, and crews booked where materials haven’t been dispatched yet.',
      'The Scheduler Agent’s suggestion (IE Crew 8 → Clonee, Wed–Fri) can be approved in one click.',
      'Technicians table: all 60 people, every ticket colour-coded green / amber (≤30 days) / red (expired).',
    ],
    click: ['Click IE Crew 8’s Wednesday cell, pick Clonee (or approve the Scheduler suggestion).', 'Point at the IPAF warnings on the Cork crew (Ringaskiddy).'],
    say: ['“Clonee’s covered. And before Barry’s lads turn up at a pharma site with an expired IPAF, the system has already told you.”'],
    qa: [{ q: 'Does it know travel time?', a: 'Each crew has a base and travel hours; the Scheduler Agent uses that when it proposes the plan.' }],
  },
  {
    route: '/field',
    title: 'Technician app',
    oneLiner: 'What Barry sees on site: today’s job, tasks, log metres, snap a photo, flag an issue, RAMS sign-on, tickets wallet.',
    how: [
      'Runs on a phone; shown here in a phone frame. Submitting an update writes straight into the shared job record.',
      'Logging 48 m at Dexcom moves installed metres 1,743 → 1,791 and % complete 74% → 76%, adds a diary entry, and updates this week’s metres on the Command Centre.',
      'The Site Progress Agent logs that it read the update.',
    ],
    click: ['Sign RAMS, go to Log, keep 48 m siphonic, tap Snap photo, Submit.', 'Tap “View in Capcon OS” to land on Dexcom with the new numbers.'],
    say: ['“That’s the phone call you didn’t have to make. And the valuation uses those exact metres at month end.”'],
    qa: [{ q: 'Does it work with no signal?', a: 'Yes. It queues updates offline and syncs when the phone gets signal. Common on big sites.' }],
  },
  {
    route: '/finance',
    title: 'Commercial & Finance',
    oneLiner: 'Valerie’s view: applications for payment, certification, cash, retentions, variations, margin and a 13-week cash forecast.',
    how: [
      'Each application = installed metres × contract rate per metre + agreed variations, less retention, less previously certified.',
      'WIP = work earned to date not yet certified. Aged debt buckets from certified-unpaid applications.',
      'Valuation Agent drafts October applications in cut-off order. Thurrock (Northwold, cut-off Thu 8 Oct) is first.',
      'Valerie approves, edits a line, or rejects. Nothing goes to the main contractor without her.',
      'Over-60-days list, retention release dates, variations register (VO-244 at Grange Castle instructed verbally, not priced).',
    ],
    click: ['Draft application on Thurrock, let the agent run, read the lines, Approve.', 'Show the over-60-days list and VO-244.'],
    say: ['“The agent does the hour and a half of spreadsheet work. Valerie does the two minutes of judgement.”'],
    qa: [
      { q: 'Does it post to Sage / Xero?', a: 'In the real build, approved applications post as draft invoices to your accounts package. Shown here as an example connection.' },
      { q: 'What about pay less notices?', a: 'The agent tracks payment notice and pay less dates under the Construction Contracts Act 2013 and the UK Construction Act and flags anything missed.' },
    ],
  },
  {
    route: '/tenders',
    title: 'Tenders & Estimating',
    oneLiner: 'Tender pipeline from enquiry to won or lost, estimator workload, win rates and the Takeoff Agent.',
    how: [
      'Kanban by stage with value and close date on every card. Win rate by sector and by main contractor over 12 months.',
      'Aaron’s workload: remaining estimating hours on his tenders, spread to each close date, against a 37.5-hour week. He is well over capacity.',
      'Takeoff Agent reads the tender pack: roof areas, outlet count, system type, pipe lengths by diameter, draft BOQ, price range and assumptions. All the numbers add up.',
      '“Send to Aaron for review” puts it in his queue and adds the tender as Priced. Download BOQ gives a CSV.',
    ],
    click: ['Run Takeoff Agent → Use sample pack → watch the steps → Send to Aaron for review.'],
    say: ['“You’re hiring an estimator because Aaron can’t measure fast enough. This gives him the measuring back so he spends his time on judgement and price.”'],
    qa: [
      { q: 'How accurate is the takeoff?', a: 'It drafts, Aaron checks. Every assumption is listed. The aim is hours saved on measuring, not removing the estimator.' },
      { q: 'Can it read our old tenders?', a: 'Yes. Past BOQs and win/loss feed better rates and suggested prices over time.' },
    ],
  },
  {
    route: '/design',
    title: 'Design & BIM',
    oneLiner: 'Design register per job: drawings and revisions, hydraulic calcs, sign-off, BIM status, clash trend, RFIs, hours vs budget.',
    how: [
      'Changi T5 (lead consultant for siphonic roof design, with KPF) and NLHPP are highlighted as design-heavy jobs.',
      'Clash count trends down week on week as the model is coordinated. Hours over budget show amber (NLHPP).',
      'Revit / Autodesk Construction Cloud sync is shown as an example connection.',
    ],
    click: ['Open Changi T5’s register, then the portfolio table.'],
    say: ['“Stephen sees every design job, every revision and every RFI without a separate register spreadsheet.”'],
    qa: [{ q: 'Does it replace Revit?', a: 'No. Revit stays where it is. Capcon OS reads the model status and drawing register so everyone else can see it.' }],
  },
  {
    route: '/prefab',
    title: 'Prefabrication',
    oneLiner: 'Maynooth workshop board: spools moving from cut to on site, with QR labels, stock and a dispatch calendar.',
    how: [
      'Spools move Cut → Fused / welded → Pressure tested → QC passed → Packed → Dispatched → On site. Each has a QR label preview.',
      'Stock by material and diameter with reorder alerts. Dispatch calendar matched to site install dates, with clashes flagged.',
      'NLHPP Zone C: 8 spools held at pressure re-test, called out on the board.',
      'Waste: prefab ~2% vs 8–10% cut waste on site, feeding the sustainability figures.',
    ],
    click: ['Click a spool to see its QR label and move it on a stage.'],
    say: ['“Every spool is traceable from the bench to the roof.”'],
    qa: [{ q: 'Can lads scan the QR on site?', a: 'Yes. Scanning marks it received on site and links it to the weld log and the handover pack.' }],
  },
  {
    route: '/handover',
    title: 'Testing, Commissioning & Handover',
    oneLiner: 'Handover pack readiness per job: test certs, commissioning records, BCAR ancillary certificate, O&M manual, warranty.',
    how: [
      'Each job has a checklist with owners. Missing items go on a chasing list.',
      'Handover Pack Agent compiles the pack from job records in one click and lists what is missing. The issued pack goes to the approval queue first.',
      'Jobs at handover offer “Set up maintenance contract”: the install becomes recurring revenue.',
    ],
    click: ['Pick a job, Compile pack, show the contents and the missing list.'],
    say: ['“Handover packs stop being a fortnight of chasing at the end of the job.”'],
    qa: [{ q: 'Does it do BCAR?', a: 'It gathers the evidence for the ancillary certificate and tracks it. The certifier still signs.' }],
  },
  {
    route: '/maintenance',
    title: 'Maintenance & Service',
    oneLiner: 'Maintenance contracts, planned visits, callouts, building asset registers, inspections and the defect → quote → repair flow.',
    how: [
      '140 contracts across ~430 buildings, renewals and annual value. Asset register per building: outlets, gratings, gutters, pipe runs.',
      'National Children’s Hospital: completed 7-year, 7.5 km HDPE gravity install, now a maintenance contract. That is the install → recurring revenue loop.',
      'Maintenance Agent books inspections, writes reports from photos and drafts quotes from defects. Quotes need approval before they go out.',
    ],
    click: ['Open the NCH contract to show the asset register.', 'Advance a defect through quote → approved → scheduled.'],
    say: ['“Every install you hand over can become a contract. This makes sure it does.”'],
    qa: [{ q: 'Which standard?', a: 'Inspections to BS EN 12056-3 and BS 8490, logged per building.' }],
  },
  {
    route: '/hsqe',
    title: 'HSQE & Sustainability',
    oneLiner: 'Julia’s view: ISO 45001 safety, ISO 9001 non-conformances, ISO 14001 / EcoVadis carbon, waste and rainwater harvesting, and an ESG export.',
    how: [
      'Near misses, incidents, RAMS status per site, permits, toolbox talks and audits, gathered as work happens.',
      'Carbon per job uses installed metres × indicative factors (method shown on screen). Waste saved through prefab. Harvesting capacity from roof areas.',
      '“Export ESG summary” downloads a formatted report, generated in the browser.',
    ],
    click: ['Export ESG summary.'],
    say: ['“Your ISO and EcoVadis evidence builds itself while the work happens.”'],
    qa: [{ q: 'Are the carbon figures certified?', a: 'No. They are indicative factors, clearly labelled. The real build would use your supplier EPDs.' }],
  },
  {
    route: '/agents',
    title: 'Agents',
    oneLiner: 'The AI layer made visible: eight agents, each with one job, what it can touch, what it did today, and an approval queue.',
    how: [
      'Inbox, Takeoff, Site Progress, Valuation, Compliance, Scheduler, Maintenance and Handover Pack agents.',
      'Permission toggles per agent. Anything that changes data or goes outside the business waits in the approval queue: Approve, Edit or Reject.',
      'Live activity log ticks along: every action is recorded (audit trail).',
    ],
    click: ['Approve one item, edit another.', 'Show a permission toggle: sending without approval is off by default.'],
    say: ['“AI only goes near what you let it near. It proposes, you decide, and everything is logged.”'],
    qa: [
      { q: 'Is our data used to train AI?', a: 'No. Business data stays in your tenant and isn’t used for model training.' },
      { q: 'What if it gets something wrong?', a: 'It can’t act on its own. You see the draft first, and every action is logged and reversible.' },
    ],
  },
  {
    route: '/integrations',
    title: 'Integrations',
    oneLiner: 'Answers “own software or AI on top of what we have?”: both. Your own platform, connected to your tools, with agents on top.',
    how: [
      'Diagram: your tools on the left, Capcon OS in the middle, agents on top, people on the right.',
      'Tiles for Microsoft 365 / Outlook, SharePoint, Excel, Teams, Sage, Xero, Revit / ACC, Procore, Aconex, WhatsApp, Power BI. Each shows data in and out.',
      'All are example connections, confirmed on discovery. No public source says which tools Capcon uses.',
    ],
    click: ['Click the Outlook tile to show an email flowing to a job.'],
    say: ['“Keep what works. Connect it. Stop re-keying.”', '“Which of these do you actually use today?” (turn it into discovery)'],
    qa: [{ q: 'Do we have to change systems?', a: 'No. Capcon OS connects to what you have and replaces only the spreadsheets and phone calls in between.' }],
  },
  {
    route: '/efficiency',
    title: 'What this gives back',
    oneLiner: 'Hours saved per week by department, from your own numbers. Every assumption and formula is on screen.',
    how: [
      'Sliders: sites, status calls, minutes per call, valuations, hours per valuation, tenders, hours per takeoff, emails, reports, handover packs, compliance admin, hourly rate.',
      'Totals: hours per week, full-time equivalents (÷37.5) and annual value at your hourly rate.',
      'Conservative / Expected presets, and Reset. The maths panel shows every line.',
    ],
    click: ['Ask Donnacha for his numbers and move the sliders live.'],
    say: ['“Your numbers, not ours. If any slider is wrong, tell me and we’ll move it.”'],
    qa: [{ q: 'Is this a guarantee?', a: 'No. It’s an honest model built on your inputs, so you can test it against what you know.' }],
  },
  {
    route: '/guide',
    title: 'Presenter guide',
    oneLiner: 'Your run sheet, keyboard shortcuts and how every screen works.',
    how: ['Start the walkthrough from here or with the Demo button. Notes for the current page are always one click away (Notes button, or press N).'],
    click: [],
    say: [],
    qa: [],
  },
];

export const ASSISTANT_NOTE: PageNote = {
  route: '#assistant',
  title: 'Ask Capcon (assistant)',
  oneLiner: 'Ask the business a question in plain English. Answers come from live data, with tables, charts, sources and links.',
  how: [
    'Opens with Ctrl/Cmd+K, the Ask Capcon button or the round button bottom right.',
    'A local engine answers from the live demo data (no internet needed), so answers change when you change things (e.g. after booking Clonee).',
    'Optional: with an API key on Vercel, free-form questions go to Claude with a 4-second fallback. It never shows an error.',
    'Scripted questions that always work: Where are we on Dexcom? · Which sites have nobody on them tomorrow? · What applications for payment are over 60 days? · Which tenders close this week and who’s pricing them? · Whose IPAF expires this month? · How many metres did we install in the UK last week? · What’s our margin on pharma jobs this year? · Which maintenance contracts renew in the next 90 days? · What’s blocking NLHPP? · Draft an update email to John Paul Construction on Dexcom.',
  ],
  click: ['Ask three questions, then “Draft an update email to John Paul Construction on Dexcom” and Send to approval queue.'],
  say: ['“Anyone in the business can ask. It shows its sources, and it can’t send anything without approval.”'],
  qa: [{ q: 'Is that ChatGPT?', a: 'It’s your own assistant over your own data. It can use Claude for free-form questions, inside your access rules.' }],
};

export function noteForPath(path: string): PageNote {
  const p = path.startsWith('/home') ? '/home' : path;
  return PAGE_NOTES.find((n) => p === n.route || p.startsWith(n.route + '/')) ?? PAGE_NOTES.find((n) => p.startsWith(n.route)) ?? PAGE_NOTES[0];
}

// ---------------------------------------------------------------- walkthrough
export interface TourTarget {
  /** heading/button text to find; the surrounding card is highlighted */
  text?: string;
  /** or a CSS selector */
  selector?: string;
  /** climb this many extra parents after finding the card (e.g. to highlight a whole row) */
  up?: number;
}

export interface TourStep {
  chapter: number; // 1..9, matching the demo path in the README
  chapterTitle: string;
  route: string;
  title: string;
  say: string;
  do: string;
  how: string;
  ask?: QA;
  target?: TourTarget;
  assistant?: boolean;
  /** one-click questions for the assistant step */
  questions?: string[];
  /** suggested seconds on this step */
  secs: number;
}

export const TOUR: TourStep[] = [
  {
    chapter: 1,
    chapterTitle: 'Every site on one screen',
    route: '/command',
    title: 'The whole business, one screen',
    say: '113 live jobs across Ireland, the UK and Asia. Health, crews, metres, valuations and tenders, without ringing round.',
    do: 'Point along the KPI row: live sites, metres this week vs plan, crew utilisation, WIP, applications outstanding.',
    how: 'Every KPI is calculated live from the same records the other pages use, so numbers match everywhere.',
    target: { text: 'Live sites', up: 2 },
    secs: 40,
  },
  {
    chapter: 1,
    chapterTitle: 'Every site on one screen',
    route: '/command',
    title: 'The map',
    say: 'Every live site, coloured by health. Amber is at risk, red is blocked. Overseas design work sits in the inset.',
    do: 'Hover a couple of pins. Don’t click yet.',
    how: 'Health comes from programme vs main contractor dates, crew cover and agent flags.',
    target: { text: 'Every live site' },
    secs: 30,
  },
  {
    chapter: 1,
    chapterTitle: 'Every site on one screen',
    route: '/command',
    title: 'Needs your attention',
    say: 'Nobody typed this list. The agents read site updates, emails and programmes overnight and flagged what needs you today.',
    do: 'Read the top item: Clonee is six days behind with no crew tomorrow.',
    how: 'Scheduler, Valuation, Compliance and Inbox agents each raise their own items. Items clear when the problem is fixed.',
    ask: { q: 'Can it get this wrong?', a: 'It only flags. You decide. And every flag links to the evidence.' },
    target: { text: 'Needs your attention' },
    secs: 40,
  },
  {
    chapter: 2,
    chapterTitle: 'Where does this job truly stand?',
    route: '/projects/CE-2333',
    title: 'Clonee: the truth, without a phone call',
    say: 'Last update came in by email from Kilcarra. The programme moved, the roof is available from Wednesday, and nobody is booked tomorrow.',
    do: 'Point at the last update and its source, then “Tomorrow: none”.',
    how: 'Each job records when it last reported in and how: foreman app, email or agent. Crews come from the Crews board.',
    target: { text: 'Where it truly stands' },
    secs: 60,
  },
  {
    chapter: 3,
    chapterTitle: 'Cover the gap',
    route: '/crews',
    title: 'Sites needing a crew',
    say: 'IE Crew 8 frees up after Tuesday. Put them on Clonee for Wednesday to Friday.',
    do: 'Drag a crew onto Clonee, or click IE Crew 8’s Wednesday cell and pick Clonee, or approve the Scheduler Agent’s suggestion.',
    how: 'Every move is checked by the Compliance Agent against tickets and site rules. The Clonee gap clears everywhere, including the Command Centre.',
    target: { text: 'Sites needing a crew' },
    secs: 55,
  },
  {
    chapter: 3,
    chapterTitle: 'Cover the gap',
    route: '/crews',
    title: 'Tickets before they bite',
    say: 'Two of the Cork crew have IPAF expiring next week, on a pharma site that needs it for the permit. You know now, not at the gate.',
    do: 'Scroll to Technicians & tickets. Point at the amber IPAF chips.',
    how: 'Ticket expiries for all 60 technicians are checked daily by the Compliance Agent, which can also book the renewal course with approval.',
    target: { text: 'Expiring in 30 days' },
    secs: 30,
  },
  {
    chapter: 4,
    chapterTitle: 'The field app',
    route: '/field',
    title: 'Barry logs 48 metres',
    say: 'This is Barry at Dexcom. He logs 48 m of siphonic pipe with a photo. No phone call, no spreadsheet.',
    do: 'Sign RAMS → Log → 48 m siphonic → Snap photo → Submit → “View in Capcon OS”.',
    how: 'The update writes straight to the Dexcom record: installed 1,743 → 1,791 m, 74% → 76%, a diary entry, and this week’s metres on the Command Centre.',
    ask: { q: 'What about no signal on site?', a: 'It queues offline and syncs when the phone gets signal.' },
    secs: 75,
  },
  {
    chapter: 5,
    chapterTitle: 'Valuation Agent',
    route: '/finance',
    title: 'October application, drafted',
    say: 'Thurrock’s cut-off is Thursday. The agent drafts the application from installed metres and agreed variations. Valerie approves.',
    do: 'Draft application → let it run → read the lines → Approve.',
    how: 'Installed metres × contract rate + agreed variations − retention − previously certified = net due. It ties back to site progress line by line.',
    ask: { q: 'Does it submit on its own?', a: 'No. Submitting is switched off for this agent. Valerie approves every one.' },
    target: { text: 'Valuation Agent: October applications' },
    secs: 75,
  },
  {
    chapter: 6,
    chapterTitle: 'Takeoff Agent',
    route: '/tenders',
    title: 'Measuring, done for Aaron',
    say: 'Aaron is one person and well over capacity. The agent reads the tender pack and drafts the BOQ, so he reviews instead of measures.',
    do: 'Run Takeoff Agent → Use sample pack → watch → Send to Aaron for review.',
    how: 'It reads drawings and specs: roof areas, outlets, system, pipe by diameter, BOQ, price range, assumptions. Every figure adds up.',
    target: { text: 'Run Takeoff Agent' },
    secs: 85,
  },
  {
    chapter: 7,
    chapterTitle: 'Ask Capcon',
    route: '/command',
    title: 'Ask the business a question',
    say: 'Anyone can ask in plain English. Answers come from live data, with sources and links.',
    do: 'Ask: “Where are we on Dexcom?”, “Whose IPAF expires this month?”, “What applications for payment are over 60 days?”',
    how: 'A local engine answers from live data, so it already knows Barry’s 48 m and that Clonee is covered.',
    assistant: true,
    questions: ['Where are we on Dexcom?', 'Whose IPAF expires this month?', 'What applications for payment are over 60 days?', 'Draft an update email to John Paul Construction on Dexcom.'],
    secs: 75,
  },
  {
    chapter: 8,
    chapterTitle: 'Own software or AI on what you have?',
    route: '/integrations',
    title: 'Both',
    say: 'Capcon OS is your own platform, connected into Outlook, SharePoint, Sage, Revit and the rest. Agents work on top, with your approval.',
    do: 'Walk the diagram left to right, then ask: “Which of these do you use today?”',
    how: 'Connections shown are examples, confirmed on discovery. Nothing gets replaced that works.',
    target: { text: 'How it fits together' },
    secs: 65,
  },
  {
    chapter: 9,
    chapterTitle: 'What this gives back',
    route: '/efficiency',
    title: 'Your numbers, not ours',
    say: 'Let’s put your numbers in. Sites, calls per site, hours per valuation.',
    do: 'Ask Donnacha for each figure and move the sliders live. Finish on hours per week and FTE.',
    how: 'Every formula is shown in the Assumptions and maths panel. Conservative and Expected presets are there if he’d rather not guess.',
    secs: 90,
  },
];

export const TOUR_TARGET_SECS = TOUR.reduce((a, s) => a + s.secs, 0);

export const SHORTCUTS: [string, string][] = [
  ['→  or  Space', 'Next walkthrough step'],
  ['←', 'Previous step'],
  ['Esc', 'Minimise the walkthrough'],
  ['N', 'Notes: how this page works'],
  ['Ctrl/Cmd + K', 'Ask Capcon'],
  ['Ctrl/Cmd + /', 'Search'],
];

export const BEFORE_THE_CALL: string[] = [
  'Open the hosted URL in Chrome, full screen (F11 / Ctrl+Cmd+F), zoom 100%, light mode.',
  'Keep dist-single/index.html on the desktop as an offline backup.',
  'Click “Reset demo” on this page (or reload) so the story starts fresh: Clonee uncovered, Thurrock in draft.',
  'Close other tabs and notifications. Share the browser window, not the whole screen.',
  'Have Donnacha’s likely numbers ready for the efficiency sliders: live sites, calls per site, hours per valuation.',
];
