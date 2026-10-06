# Capcon OS QA report

## Re-run 2 (after fixes): **FAIL**
- **Build:** commit 256ad2a; `dist/` was current against `src/`.
- **Runs:** all of `npm run qa` (sweep, small, presenter and demo) plus the repro scripts.

The result is FAIL on one medium defect (N1). Nothing is high severity any more.

- **Console and network:** zero console errors or warnings, zero page errors and zero failed network requests on every route, theme and viewport.
- **Walkthrough and presenter tools:** all 12 walkthrough steps were tested at 1440 (light and dark), 1920 (light and dark) and 1280. The notes drawer and `/guide` work in every one of those runs.
- **Visible text:** no NaN, undefined, Infinity, null or [object Object].
- **Layout:** no document or main-area horizontal overflow. The 1280×720 run now has **0** layout findings because the sidebar auto-collapses.
- **Reconciliation:** every check passes.
  - Live sites and the Projects count both equal 113 jobs.
  - % complete equals installed ÷ designed on all four job pages.
  - After the field log, metres this week go 379 → 427, and Dexcom goes 1,743 → 1,791 m and 74% → 76%.
  - Open tenders, WIP and over-60-day figures are identical across pages.
  - All 10 Assistant answers match the pages. NLHPP now shows 8 spools (31.4 m), and "nobody tomorrow" correctly drops Clonee.
- **Reconciliation script change:** the cross-page check now compares like with like. Before, it flagged per-job WIP, the `/efficiency` slider and a money value against a count, which are 4 known false positives.

### Earlier defects re-verified

| # | Defect | Status | Evidence |
|---|---|---|---|
| 1 | Pages stay blank after Crews/Handover | **Fixed** | `qa/blank-repro.mjs`: opacity 1.00 everywhere. The sweep has 0 `empty-main` findings. |
| 2 | Role switch / Demo leaves the wrong person in the top bar | **Fixed** | `qa/role-race.mjs` and `qa/role-race-demo.mjs`: all OK. |
| 3 | Live ticker puts real companies next to negative wording | **Fixed** | `qa/ticker-sim.ts`: no real or public jobs remain in the pool. Its filter matches `Shell.tsx`, and the fictional main-contractor lists contain only fictional names. |
| 4 | RDS "missing items listed for chasing" | **Fixed** | No real-company/negative hits on any page. |
| 5 | Thurrock attention item stays after approval | **Fixed** | The demo end check passes. |
| 6 | Clonee 6 vs 5 days; "no crew booked tomorrow" stays after booking | **Fixed** | The header no longer gives a day count, and it updates when Wednesday is booked. |
| 7 | NLHPP 10 vs 8 spools; RFI subjects | **Fixed** | The Assistant says 8 spools and the 3 RFIs are on outlet positions. Dexcom shows no open RFIs. |
| 8 | See-through overlays; Assistant panel over the top bar | **Mostly fixed** | The panel now starts below the top bar and the overlays are far more opaque. Faint ghosting is still visible in dark mode (`1920x1080-dark-demo-07-q01.png`). Now low severity. |
| 9 | Walkthrough card covers controls | **Partly** | See N2. |
| 10 | 1280×720 layout | **Fixed** | 0 findings in the small run. |
| 11, 12 | Timeline "Jan 27" label; Projects header clipped | **Fixed** | 0 overflow findings. |
| 13 | 15 vs 14 crews | **Fixed** | |
| 14 | Three margin figures | Not changed (by design, labelled) | |
| 15 | Agent log BOQ before Takeoff runs | **Fixed** | The ticker now uses a fictional Harlow tender. |
| 16 | Stale "Approve move" | **Changed, new issue** | See N1. |
| 17, 18, 20 | Low cosmetic items | Not changed (accepted) | |
| 19 | Real-project advisories | Dexcom part fixed | NLHPP is still "At risk" by storyline. |

### New or remaining defects

N1. **Medium: the Scheduler suggestion claims Wed–Fri is covered after only Wednesday is booked.**
   - **Route and viewport:** `/crews`, light mode at 1440.
   - **What happens:** On `/crews`, clicking IE Crew 8 → Wed → Clonee (the click-to-pick fallback the walkthrough suggests) marks AP-2 "Approved". The card then reads "Move IE Crew 8 to Clonee data centre Wed to Fri … Covered on the crew board", and AP-2 disappears from the approval queue (bell 5 → 4).
   - **What's actually true:** IE-08 Thu and Fri are still Unassigned, and the KPI "Sites needing a crew: 3, Wed–Fri, Clonee, Kilkenny, Citywest" still lists Clonee.
   - **Two further problems:** No one approved anything, and the presenter loses the one-click Thu/Fri booking.
   - **Expected:** resolve AP-2 only when Wed–Fri are all covered, or label it differently (for example "Partly covered").
   - **Evidence:** `qa/screenshots/1440x900-light-demo-03b-crews-picked.png`, `qa/screenshots/ap2-after-wed-only.png`. Repro: `node qa/ap2-probe.mjs`.
   - **Suspected file:** `src/pages/Crews.tsx` and the auto-resolve in `src/store/useStore.ts`.

N2. **Low/medium: the walkthrough card covers part of the spotlighted element.**
   - **Where:**
     - 1440, step 6 "Tickets before they bite" (`/crews`): it covers 29% of the Expiring card, including the last rows.
     - 1280, step 2 "The map": 26%.
     - 1280, step 8 "October application, drafted": 28%, including the RDS row and Drafts.
   - **On `/field` at 1440:** it also covers the office card's "Open Dexcom in Capcon OS" button.
   - **Mitigation:** clicking anywhere tucks the card away.
   - **Evidence:** `qa/screenshots/1440x900-light-presenter-step06.png`, `1280x720-light-presenter-step08.png`, `1440x900-light-demo-04-field.png`
   - **File:** `src/presenter/Walkthrough.tsx`. Consider placing the card away from the spotlight rectangle.

N3. **Medium (presenter only): Escape does not close the notes drawer.**
   - **What happens:** Once the notes drawer is open (via N or `[data-testid=notes-button]`), Escape leaves it open. Only N or the × close it. The guide page lists Esc as "Minimise the walkthrough", so a presenter is likely to try it.
   - **Side effect:** The drawer's backdrop also blocks the top-bar notes button from toggling it closed.
   - **Evidence:** `qa/screenshots/notes-after-escape.png`, plus 25 occurrences in `qa/out/results-presenter.json`. Repro: `node qa/notes-esc-probe.mjs`.
   - **File:** `src/presenter/NotesDrawer.tsx`, or the `Drawer` in `src/components/ui/index.tsx`.

N4. **Low: the floating Ask Capcon button overlaps the bottom-right of the notes drawer's text** ("If they ask" answers).
   - **Evidence:** `qa/screenshots/notes-after-escape.png`

**Behaviours confirmed working:**
- **Walkthrough:** 12 steps on the expected routes, with the spotlight present on 9 of them. The 3 without a spotlight are /field, the Assistant step and /efficiency, which is by design.
- **Walkthrough controls:** clicking in the app tucks the card into the pill, ArrowRight advances, and Finish closes it.
- **Reload:** a reload in the same tab stays signed in on the same route.
- **`/guide`:** renders in both themes.

### Re-run commands
`npm run qa` runs everything (sweep, small, presenter, demo), or use `node qa/run-qa.mjs <mode>` for one part. Repro scripts:
- `qa/blank-repro.mjs`
- `qa/role-race.mjs`
- `qa/role-race-demo.mjs`
- `qa/ap2-probe.mjs`
- `qa/notes-esc-probe.mjs`
- `qa/ticker-sim.ts`

---

# Original report (run 1, before fixes)


**Date:** Tue 6 Oct 2026. **Build tested:** `npm run build` of HEAD `f4b1936` (includes the presenter walkthrough), served by `vite preview` on :4173.
The first pass ran against the older `dist/` (commit b70efcd). `src/` had moved on since that build, so I rebuilt `dist/` from HEAD and ran everything again. Every finding below reproduces on the current build unless it says otherwise.

## Result: **FAIL**

Seven high-severity defects would show up on a live screen share:
- pages that load blank
- the top bar showing the wrong person
- real companies shown next to negative wording
- figures that contradict each other on the same screen

**Passed:**
- **Console:** no errors or warnings on any route, viewport, theme, role switch, demo step or Assistant question.
- **Network:** no failed requests. The Assistant never called `/api/assistant` for the 10 scripted questions.
- **Text:** no `NaN`, `undefined`, `Infinity`, `null` or `[object Object]` anywhere.
- **Overflow:** no horizontal overflow of the document or `#main-scroll` at 1280, 1440 or 1920.
- **Routes:** every route resolves (job IDs, tabs and `?view=stand`).
- **Demo data pill:** visible in the top bar at every viewport.
- **Reconciliation that passed:**
  - "Live sites" shows 113, which equals the number of jobs. The Projects count is also 113.
  - % complete equals installed ÷ designed on CE-2291, CE-2304 and CE-2333. Design complete on CE-2337 is 68%.
  - After the 48 m field log:
    - Command "Metres installed this week" went from 379 m to 427 m.
    - Dexcom went from 1,743 m to 1,791 m and from 74% to 76%, with the diary entry and Projects row updated.
    - The Assistant answer matches.
  - **Open tenders:** 45 on Command and on Tenders, and 46 on both after the Takeoff Agent.
  - **WIP:** €2.65m on Command, Eugene, Valerie and Finance.
  - **Over 60 days:** 3 (€26k) on Finance, Valerie and the Assistant.
  - **Assistant answers that matched the data:**
    - After the Clonee booking, the sites with no crew tomorrow are Thurrock and Citywest only.
    - 5 tenders close this week, 4 of them Aaron's.
    - 3 IPAF tickets expire this month.
    - UK installed 915 m last week.
    - 33 maintenance renewals fall in the next 90 days.
    - The John Paul Construction email contains no negative wording.

## How to re-run

```bash
npm run build && npx vite preview --port 4173 --strictPort &   # if not already running
npm run qa                       # everything (about 25 min). Or: node qa/run-qa.mjs sweep|small|demo
node qa/blank-repro.mjs "Crews & Scheduling" "Tenders & Estimating"   # repro defect 1
node qa/role-race.mjs            # repro defect 2
node qa/role-race-demo.mjs       # repro defect 2 (Demo button)
npx -y tsx qa/ticker-sim.ts 400  # repro defect 3 (live agent log over 60 min)
```

**Output locations:**
- Screenshots: `qa/screenshots/`. They are named `<viewport>-<theme>-<route>.png`. At 1440 they are full height. Demo path shots are `*-demo-NN-*.png`.
- Machine-readable findings: `qa/out/results-*.json`
- Page text: `qa/out/text/`
- Assistant answers: `qa/out/assistant-*.json`
- Expected figures computed from `src/data`: `qa/out/expected.json`

## Defects (by severity)

### High

1. **Pages stay blank after normal sidebar navigation.**
   - **What happens:** After visiting Crews & Scheduling or Testing & Handover, the next page you click stays at opacity 0 indefinitely. This hits Tenders, Design & BIM, Commercial & Finance and even Command Centre. Only the sidebar and top bar remain.
   - **Where:** all viewports and both themes. The sweep flagged it 15 times, for example on `/tenders`, `/design` and `/finance` after `/handover`.
   - **Reproduce:** Crews → Tenders, or Handover → Tenders → Design → Command (all blank).
   - **Evidence:** `qa/screenshots/1920x1080-light-tenders.png`, `1920x1080-dark-finance.png`, `1280x720-light-tenders.png`, `blank-page-repro.png`. Repro script: `qa/blank-repro.mjs`.
   - **Suspected cause:** `src/components/layout/Shell.tsx`. The route transition is `AnimatePresence mode="wait"` keyed on the pathname, and the exit of the Crews/Handover page never completes, so the next page never animates in. Something on those pages, such as portals, drawers or dnd-kit, probably blocks the exit.

2. **Role switcher and Demo button leave the wrong person in the top bar.**
   - **What happens:**
     - Switching role from any `/home/<role>` page to Donnacha (home `/command`) or Barry (home `/field`) navigates to the page but leaves the previous person in the top bar. For example, the page says "Good morning, Donnacha" while the top bar shows Valerie Curran.
     - The Demo button has the same problem when pressed from a role home.
   - **Where:** all viewports and themes.
   - **Evidence:** `qa/screenshots/role-race-demo-from-valerie.png`, `1440x900-light-role-Barry_McEvoy.png`, `1440x900-light-demo-07-q10.png` (top bar shows Aaron O'Neill). Repro scripts: `qa/role-race.mjs` and `qa/role-race-demo.mjs`.
   - **Suspected cause:** `src/App.tsx` `RoleHomeRoute`. Its effect copies `:role` from the URL back into the store after `setRole()` and before the navigation lands. The same pattern is in `src/presenter/Walkthrough.tsx` and `Topbar.tsx`.

3. **The live agent log puts real projects and companies next to negative wording.**
   - **What happens:** The 9-second ticker fills templates with random Install-stage jobs, and some of those are real ones. On a fixed, deterministic schedule from page load:
     - ~5 min: "Cut-off for Sittingbourne is in 2 days, application not yet submitted" (Toureen Group). It repeats at ~23 and ~41 min.
     - ~10 min: "Crew booked on Connacht Rugby Thursday but spools dispatch Friday, flagged"
     - ~15 min: "Compiled draft O&M for NLHPP: 2 items missing"
     - ~22 min: "No update from Laya Arena since yesterday 16:00, nudged foreman"
     - ~44 min: "IPAF for 2 technicians on Project Oriel expires next week, flagged" (Bouygues UK)
   - **Where:** shown on Command "Agents working now" and on the Agents live log.
   - **Evidence:** `npx -y tsx qa/ticker-sim.ts`
   - **Suspected cause:** `src/components/layout/Shell.tsx` `useAgentTicker` picks from all Install jobs, using templates in `src/data/agents.ts`. Real jobs (`showcase` / `mainContractorPublic`) should be excluded.

4. **The Agents page shows a real client with "missing items listed for chasing".**
   - **What it says:** "Compiled draft O&M for RDS Anglesea Stand, missing items listed for chasing"
   - **Where:** `/agents` at all viewports.
   - **Evidence:** `qa/screenshots/1920x1080-light-agents.png`
   - **Source:** `src/store/useStore.ts:50`, a seed agent log line.

5. **The Thurrock attention item stays after Valerie approves.**
   - **What happens:** The Valuation Agent draft is approved and submitted on `/finance`, and the toast says "Application 6 submitted to Northwold". Command, Eugene and Valerie still show "Thurrock application not submitted… Needs Valerie's approval before 8 Oct". This is visible at demo step 7, when the presenter returns to Command.
   - **Evidence:** `qa/screenshots/1440x900-light-demo-11-command-end.png` and `qa/out/text/1440x900-light-demo-command-end.txt`
   - **Suspected cause:** `src/data/metrics.ts` `attentionItems()` pushes `att-thurrock` unconditionally. It should check the store's valuations and approvals.

6. **Clonee (CE-2333, demo step 2) contradicts itself.**
   - **Slippage figures:** The header says "6 working days behind the main contractor programme", while the status strip and Programme both say "5 days behind". The Command attention title also says "6 days behind".
   - **Stale text after booking:** After IE Crew 8 is booked Wed–Fri (by approval or click-to-pick), the job header still says "…no crew booked tomorrow". The panel below it correctly shows Tomorrow: IE Crew 8.
   - **Evidence:** `qa/screenshots/1440x900-light-demo-02-clonee.png` and `1440x900-light-demo-03d-clonee-after-booking.png`
   - **Suspected cause:** `src/data/seed.ts:462` has a static `healthReason`. `src/data/metrics.ts:242` hard-codes "6 days". `programmeDelta()` in `src/components/projects/shared.tsx` uses calendar days.

7. **NLHPP spool count disagrees: the Assistant says 10 held, everywhere else says 8.**
   - **What happens:** The Assistant answer to "What's blocking NLHPP?" says "10 spools (38.7 m) at pressure test". Prefab ("8 held"), the Command attention item, the NLHPP diary approval and Robert's home all say 8.
   - **Evidence:** `qa/screenshots/1440x900-light-demo-07-q09.png`
   - **Suspected cause:** `src/assistant/engine.ts:823` counts every NLHPP spool at "Pressure tested". The seed (`src/data/seed.ts:1519`) forces 8, but 2 more land there at random.
   - **Related:** NLHPP's health reason says "3 RFIs on outlet positions". The 3 open RFIs listed are about insulation, a sprinkler clash and the design storm return period.

### Medium

8. **Overlays are too transparent, so text collides with the content behind.**
   - **What happens:** The Walkthrough card, the toasts and the Assistant panel let underlying text show through. You can see KPI values behind the Assistant answers, and "Metres by system" behind the guide's close button. The phone's tab bar on `/field` also shows content through it.
   - **Assistant panel position:** The panel (top: 12px) also sits over the top bar's Demo button and role switcher.
   - **Where:** both themes.
   - **Evidence:** `qa/screenshots/1440x900-light-demo-07-q01.png`, `1920x1080-dark-demo-07-q03.png`, `1440x900-light-demo-04-field.png`, `1440x900-light-demo-05d-valuation-approved.png` (toast over the modal title).
   - **Suspected cause:** `.glass-strong` in `src/index.css`, and `src/assistant/AssistantPanel.tsx` (`color-mix … 95%`).

9. **The Walkthrough card covers page controls.**
   - **What happens:** At 1440 on `/field` it covers the "Open Dexcom in Capcon OS" office card. It can be tucked away. The old build's guide blocked "Log", "Approve and submit" and "Send to Aaron"; the current build no longer does.
   - **Evidence:** `qa/screenshots/1440x900-light-demo-04-field.png`
   - **Source:** `src/presenter/Walkthrough.tsx`

10. **Layout breaks at 1280×720.**
    - **What breaks:**
      - KPI labels are truncated on every page ("Metres installed thi…", "Renewals in 9…", "Visits due, 30…").
      - The `/hsqe` Safety log header collapses to "S." and "2 open items" wraps one word per line.
      - The Tenders kanban titles are clipped.
      - On `/maintenance`, the "Draft quote" and "Advance" buttons overflow their cards by 7px.
      - On `/prefab`, the "Reorder" button overflows.
      - On Command, the agent card timestamps overflow by 7–12px.
    - **Evidence:** `qa/screenshots/1280x720-light-hsqe.png`, `1280x720-light-maintenance.png`, `1280x720-dark-tenders.png`, `1280x720-light-command.png`
    - **Files:** the page files and `Kpi` in `src/components/ui/index.tsx`.

11. **The CE-2291 programme timeline's "Jan 27" axis label sticks out of its container** by 4–10px at every viewport.
    - **Evidence:** the `*-projects_CE_2291.png` shots
    - **File:** `src/components/projects/job/Timeline.tsx`

12. **The Projects table header "SECTOR · CONTRACTOR" is clipped** (153px of text in a 140px cell) at 1920.
    - **File:** `src/pages/Projects.tsx`

13. **Crew count differs: "15 crews in the field" on Eugene's home, "14 crews out" on Command.**
    - The 15 includes the maintenance team MT-01.
    - **File:** `src/pages/RoleHome.tsx:270`

14. **Group margin appears as three different numbers.**
    - **Where:** 18.5% on Eugene's KPI and the Command chart, "average 17.6%" in Margin by sector, and 17.3% "group" in the Assistant's pharma answer.
    - **Effect:** Each has its own definition, but nothing on screen explains the difference.
    - **Evidence:** `qa/screenshots/1920x1080-light-home_eugene.png` and `qa/out/assistant-1440x900-light-demo.json`

15. **The agent log says the Clonee Phase 3 BOQ was "46 line items, sent to Aaron for review" before the Takeoff Agent has run.**
    - When it does run, the Takeoff Agent itself reports 13 line items.
    - **Cause:** the `{tender}` ticker template in `src/components/layout/Shell.tsx` and `src/data/agents.ts`.

### Low

16. After a manual click-to-pick booking of IE Crew 8 on Clonee Wednesday, the Scheduler Agent card still offers "Approve move" for the same booking (`src/pages/Crews.tsx`).
17. **Implausible amounts:**
    - The over-60-day application for Water treatment works, Ballycoolin is "App 1, certified €792" at 78 days, which looks too small.
    - The valuation "Reconciles" line is about £6 off because the rate shown is rounded: 3,277 × £168.27 + £19,400 = £570,821, against £570,815 shown.
18. **Command map polish:**
    - City labels (Glasgow, Manchester, Birmingham) sit under the pins.
    - There is a stray dot above the map card.
    - The Overseas design list says 7 jobs but shows 6 and clips the last one.
    - The "Revenue vs cost" subtitle wraps with a dangling "·".
19. **Advisories against the real-company rule:**
    - NLHPP, a real public project, is shown "At risk" with a held-spools story. The brief asks for this, but it goes against the spirit of rule 6.
    - Dexcom shows an amber "1 RFI".
    - National Children's Hospital has a "damaged baffle" defect and quote.
    - Consider neutral wording for all of these.
20. "Tender win rate by sector" shows Commercial at 100%, which looks odd on screen and is probably a small sample.

**Notes on the automated reconciliation:**
- Four "same label, different value" hits are false positives by design. Per-job WIP sits on job Commercial tabs, the "Tender pipeline" quick link appears on Eugene's home, "Over 60 days" shows a value on one page and a count on another, and "Live sites" is a slider on `/efficiency`.
- The automated "real company + negative word" check is a heuristic, so I also reviewed the screenshots by eye.
