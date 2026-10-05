# Capcon OS: build brief for page builders

You are building one part of **Capcon OS**, a clickable demo of a bespoke operations
platform for Capcon Engineering Ltd (Irish siphonic and gravity rainwater drainage
specialist, HQ Maynooth, Co. Kildare; offices UK, Singapore, Malaysia). It will be
screen-shared to Donnacha Tobin (Operations Director) on a discovery call **today**.
It must look like Capcon built it for themselves and run with **zero errors**.

## Stack (already installed, do not add dependencies without need)
Vite + React 19 + TypeScript (strict, `noUnusedLocals`), Tailwind CSS v4, framer-motion,
Recharts, lucide-react, react-router-dom (HashRouter), zustand, @dnd-kit/core, d3-geo.

## Read these first
- `src/data/types.ts`: domain types.
- `src/data/seed.ts`: deterministic seed (JOBS, CREWS, TECHNICIANS, TENDERS, RFIS, VARIATIONS,
  VALUATIONS, DIARY, DRAWINGS, DESIGN, SPOOLS, STOCK, HS_ITEMS, RAMS, NCRS, MAINT_CONTRACTS,
  BUILDINGS, MAINT_VISITS, DEFECTS, HANDOVER_ITEMS, handoverStatus(), MONTHS_12).
- `src/data/metrics.ts`: derived numbers. **Use these so figures reconcile across pages**
  (jobPct, installed, designed, earned, crewsOn, sitesWithNoCrew, wipEur, outstandingApps,
  appsOverDays, revenueVsCost, marginBySector, winRate..., expiringTickets, attentionItems ...).
- `src/store/useStore.ts`: shared zustand state. Mutable things live here: `jobs`, `diary`,
  `allocation`, `approvals`, `agentLog`, `valuations`, `tenders`, `spools`, `defects`,
  plus actions (`logInstall`, `moveCrew`, `assignCrewRange`, `decideApproval`, `addApproval`,
  `pushLog`, `toast`, `addValuation`, `moveTender`, `moveSpool`, `advanceDefect`, ...).
  **Always read jobs/tenders/etc. from the store (not the seed constants) when the data can change.**
- `src/data/agents.ts`: agent definitions and initial approvals.
- `src/data/people.ts`: real names/roles and ROLES (role switcher).
- `src/components/ui/index.tsx`: UI kit: Card, CardHeader, PageHeader, Kpi, CountUp, Pill,
  HealthPill, HealthDot, Progress, Button, LinkButton, Segmented, Money/useMoney, Table/Th/Td/Tr,
  Drawer, Modal, Avatar, Stat, Sparkline, SectionTitle, Empty, Note, PhotoPlaceholder, useInterval.
- `src/components/charts.tsx`: CHART colours, axisProps, ChartTooltip for Recharts.
- `src/lib/format.ts` (money, num, pct, metres), `src/lib/dates.ts` (fixed clock: TODAY is
  **Tue 6 Oct 2026 08:30**; isoAdd, fmtDate, ago, daysUntil, weekLabel...).

## Rules
1. **Only create/edit the files you were assigned.** You may create new files under
   `src/components/<yourarea>/` or `src/pages/`. If you truly need a new store action or
   metric, add it *additively* to `useStore.ts` / `metrics.ts` (re-read the file right before
   editing; other builders work in parallel). Never rename or remove existing exports.
2. Visual language: Apple-grade glass. Use `Card` for panels, generous spacing (gap-4/5),
   20–24px radii, tabular figures (`tnum`) for numbers, big confident KPI numbers. Colours only
   via tokens (`text-brand`, `bg-brand-soft`, `text-ink`, `text-ink-2`, `text-ink-3`, `bg-sunk`,
   `hairline`, `text-ok/warn/bad`, `bg-ok-soft/...`). Semantic green/amber/red for health only.
   Must work in **light and dark** (dark is a `.dark` class on <html>; tokens handle it; never
   hard-code white/black text on surfaces). Recharts: use `CHART.brand`, `CHART.brand2`, etc.
3. Layout must look right at 1440×900 and 1920×1080 and hold at 1280×720 (content area is
   roughly viewport − 270px sidebar). No horizontal overflow; truncate long text.
4. Money: jobs have `currency` (EUR for IE/overseas, GBP for UK). Use `useMoney()` / `<Money>`
   so the top-bar "Group €" toggle converts. Group totals mixing currencies: convert with
   `toEur` and format as EUR.
5. Copy: Irish/UK English (programme, metres, organisation), plain and calm. No lorem ipsum,
   no "coming soon", no dead buttons: every clickable thing does something real (navigate,
   open a drawer, change state, or at minimum a meaningful toast).
6. Real companies (John Paul Construction, Bouygues UK, Toureen Group, PM Group, KPF, Diageo,
   RDS, Connacht Rugby, Dexcom, consultants Arup/Atkins/AECOM/Jacobs etc.) must never be shown
   with invented debts, disputes, delays or problems. Problems live on fictional contractors
   only (Kilcarra, Slaney, Corrib, Tolka, Northwold, Halden, Maresfield, ...). `mainContractor
   === 'Undisclosed'` → show as "Undisclosed" muted.
7. Zero runtime console errors/warnings you can avoid: give every list item a stable `key`,
   never render NaN/undefined/Infinity (guard divisions), Recharts containers need a parent
   with explicit height (use `<div className="h-[260px]"><ResponsiveContainer>...`).
8. Type-check with `npx tsc -b 2>&1 | grep -E "<your files>"`: other builders' work-in-progress
   may temporarily error; only your files must be clean. Do not run `npm run build`.
9. A Vite dev server is already running at http://localhost:5173 (HMR). Do **not** start another
   on 5173. To screenshot: `node qa/shot.mjs /your-route /tmp/claude-0/<name>.png [dark]`
   (signs in, navigates, prints console errors). Look at your screenshots and fix what looks off.
10. Do not commit; the lead commits. Do not touch `README.md`.
11. Key demo storyline objects (keep them consistent):
    - Dexcom campus, Athenry `CE-2291` (showcase, John Paul Construction, on track, 74%), Barry
      McEvoy's crew `IE-02`. Technician app logs installs here (shared state).
    - Clonee data centre `CE-2333` (Kilcarra, at risk, 6 days behind, no crew Wed; IE-08 free Wed–Fri;
      approval AP-2 assigns IE-08 to Clonee Wed–Fri).
    - Ringaskiddy pharma `CE-2321` (Corrib): Cork crew IE-03, two IPAF tickets expiring next week.
    - Thurrock warehouse `CE-2309` (Northwold): October application in Draft, cut-off Thu 8 Oct.
    - Carrigtwohill `CE-2326` (Slaney): RFI-0412 unanswered 9 days.
    - Grange Castle `CE-2315` (Tolka): VO-244 instructed verbally, not priced.
    - Milton Keynes `CE-2340` (Halden): blocked, roof deck not handed over.
    - Slough `CE-2298` (Maresfield): application unpaid 74 days.
    - NLHPP `CE-2304` (at risk: Zone C spools held at re-test, 3 RFIs with design team).
    - Changi T5 `CE-2337` (design-only, KPF, lead consultant for siphonic roof design).
    - National Children's Hospital: completed 7-year install, now maintenance contract MC-501.

When done, reply with: files created/changed, anything you added to shared files, and any
known gaps.
