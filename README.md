# Capcon OS: demo

A clickable, fully working demo of a bespoke operations platform for **Capcon Engineering Ltd**,
built for the discovery call with Donnacha Tobin (Operations Director). Product name in the UI:
**Capcon OS**. Built by MTMN Digital.

Everything runs in the browser from deterministic seed data. There is no database, no login
wall and no network dependency at runtime. The optional Claude API path falls back silently.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # type-check + production build → dist/
npm run preview        # serve dist/ on http://localhost:4173
npm run build:single   # one self-contained file → dist-single/index.html (works offline, double-click to open)
npm run qa             # Playwright QA sweep (needs `npm run preview` running), screenshots → qa/
npm run check:data     # reconciliation checks on the seed data
```

### Deploy to Vercel

```bash
npx vercel link --project capcon-os-demo   # first time only
npx vercel --prod
```

`vercel.json` is included (Vite, output `dist/`). The app uses hash routing, so no rewrites are
needed. To enable the optional Claude path for free-form questions, set `ANTHROPIC_API_KEY` in
the Vercel project's environment variables. Without it, the assistant uses its local engine.

**Live-call safety net:** `npm run build:single` produces `dist-single/index.html`, a single file
with everything inlined (fonts and map included). Keep it on the desktop and open it in Chrome if
the network or the hosted URL misbehaves.

## Demo path (about 12 minutes)

### Presenting tools

- **Walkthrough:** press **Demo** in the top bar. There are 12 steps in 9 chapters, timed to 12 minutes. Each step:
  - opens the right page
  - highlights what to point at
  - gives you the line to say, the click to make, a "How it works" explanation and an answer if asked.
  - **Keys:** → / Space for next, ← for back, Esc to tuck the card away.
  - **Tucking:** clicking anywhere in the app tucks it into a small pill, so it never blocks the click you need.
  - **Timer:** a timer shows elapsed time against the plan.
- **How it works notes:** press **N** (or the book icon in the top bar) on any page. A drawer shows:
  - what the page is for and how it works
  - what to click and what to say
  - likely questions with answers.
- **Presenter guide** (`/#/guide`, in the sidebar) has:
  - the full run sheet (click any step to jump to it) and a before-the-call checklist
  - keyboard shortcuts and one-click Ask Capcon questions
  - **Reset demo** to restore the starting story
  - **Open on second screen** to keep notes on another monitor.
- **Printable cheat sheet:** `docs/PRESENTER_NOTES.md`, generated from the same source (`src/presenter/notes.ts`) with `npm run notes`.
- **Staying signed in:** a reload keeps you signed in in that tab, so Reset demo is one click.

The steps by hand:

1. **Command Centre** (Donnacha): 113 live jobs on one screen, KPI row, site map, and the
   "Needs your attention" feed the agents wrote.
2. **Click an at-risk pin** (Clonee data centre, amber): the job page shows where it truly stands
   with no phone call. Last update came by email, the programme moved, and no crew is booked tomorrow.
3. **Crews and Scheduling**: drag IE Crew 8 onto Clonee for Wed–Fri, or approve the Scheduler
   Agent's suggestion. The Compliance Agent flags the IPAF expiries on the Cork crew (Ringaskiddy pharma).
4. **Technician app** (phone frame): Barry logs 48 m of siphonic pipe at Dexcom with a photo.
   Tap "View in Capcon OS" and the job's metres, % complete and diary update.
5. **Commercial and Finance**: the Valuation Agent drafts Thurrock's October application from
   installed metres and agreed variations before Thursday's cut-off. Valerie approves.
6. **Tenders**: run the Takeoff Agent on the bundled sample tender pack. It produces roof areas,
   outlets, pipe lengths by diameter, a draft BOQ and a price range, then sends it to Aaron for review.
7. **Ask Capcon** (Ctrl/Cmd+K): "Where are we on Dexcom?", "Whose IPAF expires this month?",
   "What applications for payment are over 60 days?"
8. **Integrations**: answer "own software, or AI on top of what we have?" Both: our own platform,
   connected into their tools, with agents working under human approval.
9. **What this gives back**: set the sliders with Donnacha's own numbers, live.

## What's in it

Command Centre, role homes (Eugene, Donnacha, Robert, Stephen, Aaron, Valerie, Julia, plus the
technician phone view), Projects & Sites with full job pages (Dexcom built out in full), Crews &
Scheduling (drag and drop, ticket wallet), Prefabrication (spool board, QR labels, stock,
dispatch), Testing & Handover (Handover Pack Agent), Tenders & Estimating (Takeoff Agent),
Design & BIM, Commercial & Finance (Valuation Agent, retentions, aged debt, 13-week cash),
Maintenance & Service, HSQE & Sustainability (ESG export), Agents (permissions, approval queue,
live log), Integrations, the efficiency calculator, global search (Ctrl/Cmd+/) and the Capcon
Assistant (Ctrl/Cmd+K).

## Data: what is real and what is demo

- **All figures are demo data**, generated deterministically (fixed seed, fixed clock of
  Tue 6 Oct 2026 08:30) in `src/data/seed.ts`. A "Demo data" pill is always visible in the top bar.
  Nothing is presented as Capcon's real financials.
- **Real, public:** company facts, people's names and titles, the showcase projects (Dexcom
  Athenry with John Paul Construction, NLHPP, Laya Arena, RDS Anglesea Stand, Changi T5 with KPF,
  Singapore pharma with PM Group, Diageo, Connacht Rugby, Project Oriel with Bouygues UK,
  Sittingbourne with Toureen Group, National Children's Hospital, Nordic and Milan data centres).
  Their progress, values, crews and dates are demo data.
- **Fictional:** every other job, all main contractors on generic jobs (Kilcarra Construction,
  Slaney Build, Corrib Contracting, Tolka Building, Northwold Construction, Halden Build,
  Maresfield Contracting and others), technicians, tenders and maintenance clients. Every problem
  (late payment, delay, blocked site, unanswered RFI) sits on a fictional contractor. Real
  companies are never shown with debts, disputes or delays.
- **Reconciliation:** metres installed roll up to job % complete. Applications for payment are
  metres × contract rate plus agreed variations. WIP is earned value minus certified. Crews on site
  come from the allocation board, and the 12-week metres history tracks crew capacity.
  `npm run check:data` asserts these.
- Scale: 113 live jobs (67 IE, 39 UK, 7 overseas design), 45 open tenders (109 including history),
  60 technicians in 14 crews plus a maintenance team, 140 maintenance contracts covering about
  430 buildings, and about 280 prefab spools.

## Integrations are illustrative

Microsoft 365/Outlook, SharePoint/OneDrive, Excel, Teams, Sage, Xero, Autodesk Revit/ACC,
Procore, Aconex, WhatsApp and Power BI tiles are **example connections, to be confirmed on
discovery**. No public source says which tools Capcon uses, and no real connection is made.
The tiles use neutral icons, not vendor logos.

## Assumptions and decisions

- **Brand colours and logo not verified.** The build environment's network policy blocked
  capconeng.com and web.archive.org, so the brand agent could not read the logo SVG or the site
  CSS. The palette is a placeholder (deep navy and water blue) defined as tokens in one place,
  `src/index.css` (`--c-brand*`), and the sidebar shows a neutral wordmark. To apply the real
  brand: drop `capcon-logo-dark.svg` / `capcon-logo-white.svg` into `src/brand/` (picked up
  automatically), replace `public/favicon.svg`, and set the hex codes in `src/index.css`. See
  `research/brand.md` for the exact commands to extract them.
- **Map:** a bundled SVG map of Ireland and the UK (d3-geo + Natural Earth outlines) is used
  instead of Leaflet tiles, so the map can never fail to load live. Overseas jobs appear in an
  inset.
- **Hash routing** is used so the app works on any static host and from a single offline file.
- **Titles:** names and titles follow the brief. Some public snippets differ (Robert Finn as
  Executive Director, Barry McEvoy as Supervisor, Colm Whitty in sustainability); see
  `research/capcon-brief.md`.
- **FX:** the Group € toggle converts GBP at a fixed demo rate of 1.16.
- **"This week"** means week commencing Mon 5 Oct; today is Tuesday morning, so week-to-date
  covers Monday's output.
- Cash received is shown for the last 30 days rather than "this month", because the demo clock
  sits on 6 October.
- The InBusiness Recognition Awards 2026 are not mentioned: no evidence of an entry was found.

## Project layout

```
src/data/        types, deterministic seed, metrics (all derived numbers), agents, people
src/store/       zustand store (shared state: jobs, crews, approvals, agent log…)
src/components/  UI kit (glass), layout shell, map, charts
src/pages/       one file per department view
src/assistant/   Capcon Assistant panel + local intent engine
src/presenter/   walkthrough, presenter notes (single source for in-app notes + docs/PRESENTER_NOTES.md)
api/assistant.ts optional Vercel function for the Claude API path (guarded, 4 s timeout)
research/        public research notes and the merged brief
qa/              Playwright QA script and screenshots
```
