// The 12-minute demo path, driven end to end with the real actions, plus the ten Assistant questions.
import fs from 'node:fs';
import path from 'node:path';
import { newPage, nav, shot, domChecks, mainText } from './lib.mjs';

export const QUESTIONS = [
  'Where are we on Dexcom?',
  'Which sites have nobody on them tomorrow?',
  'What applications for payment are over 60 days?',
  'Which tenders close this week and who’s pricing them?',
  'Whose IPAF expires this month?',
  'How many metres did we install in the UK last week?',
  'What’s our margin on pharma jobs this year?',
  'Which maintenance contracts renew in the next 90 days?',
  'What’s blocking NLHPP?',
  'Draft an update email to John Paul Construction on Dexcom.',
];

// Click like a user; if something covers the target, record it and fall back to a DOM click.
async function userClick(page, sel, report) {
  const loc = typeof sel === 'string' ? page.locator(sel).first() : sel;
  try {
    await loc.click({ timeout: 3000 });
  } catch (e) {
    const m = String(e.message).match(/<([a-z]+)[^>]*data-testid="([^"]+)"[^>]*>[^\n]*intercepts pointer events/) ?? String(e.message).match(/(<[^\n]{0,160}) intercepts pointer events/);
    report(`Cannot click ${typeof sel === 'string' ? sel : String(sel)} as a user would: ${m ? (m[2] ? `[data-testid=${m[2]}]` : m[1]) : 'not clickable'} covers it`);
    await loc.dispatchEvent('click');
  }
}

const num = (s) => (s == null ? null : Number(String(s).replace(/[^\d.-]/g, '')));

export async function runDemo(browser, vp, theme, EXP, add) {
  const sink = [];
  const tag = `${vp.width}x${vp.height}-${theme}-demo`;
  const { ctx, page } = await newPage(browser, { ...vp, theme }, sink);
  const fail = (route, detail, s = '') => add({ kind: 'action', route, vp: tag, detail, shot: s });
  const rec = (route, detail, s = '') => add({ kind: 'reconcile', route, vp: tag, detail, shot: s });
  const check = async (route, s) => {
    for (const f of await domChecks(page)) add({ ...f, route, vp: tag, shot: s });
  };
  let flushed = 0;
  const flushSink = (route, s) => {
    for (const e of sink.slice(flushed)) add({ ...e, route: `${route} (${e.where})`, vp: tag, shot: s });
    flushed = sink.length;
  };
  const answers = {};
  let mark = 0;

  // baseline figures
  await nav(page, '/command', 2500);
  const cmd0 = await mainText(page);
  const wtd0 = num((cmd0.match(/Metres installed this week\n([\d,]+) m/) ?? [])[1]);
  await nav(page, '/projects/CE-2291', 1500);
  const inst0 = num(await page.textContent('[data-testid=installed-m]'));
  await nav(page, '/command', 1500);

  // ---- Step 1: Demo button
  await page.locator('header button', { hasText: 'Demo' }).click();
  await page.waitForSelector('[data-testid=demo-guide]', { timeout: 5000 }).catch(() => fail('/command', 'Demo guide did not open'));
  await page.waitForTimeout(1500);
  let s = await shot(page, `${tag}-01-command`);
  await check('demo:/command', s);
  const stepRoutes = [];
  let stepIdx = 0; // index of the current walkthrough step
  const ensureGuide = async () => {
    if (await page.locator('[data-testid=tour-pill]').isVisible().catch(() => false)) {
      await page.click('[data-testid=tour-pill]');
      await page.waitForTimeout(500);
    }
  };
  const goStep = async (i) => {
    await ensureGuide();
    await page.locator(`[aria-label^="Go to step ${i + 1}:"], [aria-label="Go to step ${i + 1}"]`).first().click().catch(() => {});
    stepIdx = i;
    await page.waitForTimeout(1500);
  };
  // Press Next until the walkthrough lands on `expect` (the tour may have several steps per page).
  const next = async (expect, name) => {
    let h = '';
    for (let k = 0; k < 6; k++) {
      await ensureGuide();
      await page.click('[data-testid=demo-next]');
      stepIdx++;
      await page.waitForTimeout(2200);
      h = (page.url().split('#')[1] ?? '').split('?')[0];
      stepRoutes.push(h);
      if (h === expect) break;
      const shx = await shot(page, `${tag}-${name}-pre${k}`);
      await check(`demo:${h} (step ${stepIdx + 1})`, shx);
    }
    const sh = await shot(page, `${tag}-${name}`);
    if (h !== expect) fail(`demo step ${name}`, `Demo Next never reached ${expect} (last ${h})`, sh);
    const vis = await page.evaluate(() => +getComputedStyle(document.getElementById('main-scroll')?.firstElementChild ?? document.body).opacity);
    if (vis < 0.99) add({ kind: 'empty-main', route: expect, vp: tag, detail: `Demo step landed on ${expect} but the page is invisible (opacity ${vis})`, shot: sh });
    await check(`demo:${expect}`, sh);
    return sh;
  };

  // ---- Step 2: Clonee
  await next('/projects/CE-2333', '02-clonee');

  // ---- Step 3: Crews
  s = await next('/crews', '03-crews');
  mark = sink.length;
  const cell = '[data-testid=cell-IE-08-Wed]';
  const before = (await page.textContent(cell).catch(() => '')).trim();
  if (theme === 'light') {
    // click-to-pick fallback
    await userClick(page, cell, (d) => add({ kind: 'overlap', severity: 'high', route: (page.url().split('#')[1] ?? ''), vp: tag, detail: d, shot: s }));
    await page.waitForSelector('[data-testid=site-picker]', { timeout: 5000 }).catch(() => fail('/crews', 'Site picker did not open on clicking IE-08 Wed'));
    await userClick(page, '[data-testid=pick-CE-2333]', (d) => add({ kind: 'overlap', severity: 'high', route: (page.url().split('#')[1] ?? ''), vp: tag, detail: d, shot: s }));
    await page.waitForTimeout(900);
    const after = (await page.textContent(cell)).trim();
    s = await shot(page, `${tag}-03b-crews-picked`);
    if (!/Clonee/.test(after)) fail('/crews', `IE-08 Wed shows "${after}" after picking Clonee (before "${before}")`, s);
    const ap = page.locator('button', { hasText: 'Approve move' });
    if (await ap.isVisible().catch(() => false)) {
      add({ kind: 'ux', severity: 'low', route: '/crews', vp: tag, detail: 'After manually booking IE Crew 8 on Clonee Wed, the Scheduler Agent card still offers "Approve move" for the same booking (stale suggestion).', shot: s });
      await userClick(page, ap, (d) => add({ kind: 'overlap', severity: 'high', route: (page.url().split('#')[1] ?? ''), vp: tag, detail: d, shot: s }));
      await page.waitForTimeout(900);
      s = await shot(page, `${tag}-03c-crews-approved-after-pick`);
    }
  } else {
    await userClick(page, page.locator('button', { hasText: 'Approve move' }), (d) => add({ kind: 'overlap', severity: 'high', route: (page.url().split('#')[1] ?? ''), vp: tag, detail: d, shot: s }));
    await page.waitForTimeout(1000);
    s = await shot(page, `${tag}-03b-crews-approved`);
  }
  for (const d of ['Wed', 'Thu', 'Fri']) {
    const t = (await page.textContent(`[data-testid=cell-IE-08-${d}]`).catch(() => '')).trim();
    if (!/Clonee/.test(t)) fail('/crews', `After approval IE-08 ${d} shows "${t}", expected Clonee`, s);
  }
  const banner = await page.locator('[data-testid=compliance-banner]').first().textContent().catch(() => '');
  if (!/Compliance Agent/.test(banner ?? '')) fail('/crews', 'Compliance Agent banner not shown after booking', s);
  await check('/crews (after booking)', s);
  flushSink('/crews actions', s, mark);
  // Clonee job page must now show a crew tomorrow, and nothing should still claim "no crew booked tomorrow"
  await nav(page, '/projects/CE-2333', 1800);
  s = await shot(page, `${tag}-03d-clonee-after-booking`);
  const clTxt = await mainText(page);
  if (/no crew booked tomorrow/i.test(clTxt) || /Tomorrow\nNo crew booked/i.test(clTxt)) rec('/projects/CE-2333', 'After IE Crew 8 was booked on Clonee Wed–Fri, the job page still says "no crew booked tomorrow"', s);
  const behind = [...clTxt.matchAll(/(\d+) (?:working )?days behind/g)].map((m) => m[1]);
  if (new Set(behind).size > 1) rec('/projects/CE-2333', `Clonee shows conflicting programme slippage on one screen: ${behind.map((b) => b + ' days behind').join(' vs ')}`, s);
  await goStep(stepIdx);

  // ---- Step 4: Field
  s = await next('/field', '04-field');
  mark = sink.length;
  const office0 = num(await page.textContent('[data-testid=office-installed]').catch(() => null));
  if (office0 !== inst0) rec('/field', `Office card shows ${office0} m installed at Dexcom, job page shows ${inst0}`, s);
  await userClick(page, '[data-testid=tab-log]', (d) => add({ kind: 'overlap', severity: 'high', route: '/field', vp: tag, detail: d, shot: s }));
  await page.waitForTimeout(600);
  const fm = num(await page.textContent('[data-testid=field-metres]'));
  if (fm !== 48) fail('/field', `Log screen pre-filled with ${fm} m, demo script says 48`);
  await userClick(page, '[data-testid=snap-photo]', (d) => add({ kind: 'overlap', severity: 'high', route: '/field', vp: tag, detail: d, shot: s }));
  await page.waitForTimeout(500);
  await userClick(page, '[data-testid=submit-install]', (d) => add({ kind: 'overlap', severity: 'high', route: '/field', vp: tag, detail: d, shot: s }));
  await page.waitForTimeout(2500);
  s = await shot(page, `${tag}-04b-field-submitted`);
  const office1 = num(await page.textContent('[data-testid=office-installed]').catch(() => null));
  if (office1 !== office0 + 48) rec('/field', `Office card ${office0} → ${office1}, expected +48`, s);
  await userClick(page, '[data-testid=view-in-os]', (d) => add({ kind: 'overlap', severity: 'high', route: '/field', vp: tag, detail: d, shot: s }));
  await page.waitForTimeout(2200);
  s = await shot(page, `${tag}-04c-dexcom-after-log`);
  const inst1 = num(await page.textContent('[data-testid=installed-m]'));
  const pct1 = num(await page.textContent('[data-testid=job-pct]'));
  const designed = EXP.showcase['CE-2291'].designed;
  if (inst1 !== inst0 + 48) rec('/projects/CE-2291', `Installed ${inst0} → ${inst1} after logging 48 m (expected ${inst0 + 48})`, s);
  if (pct1 !== Math.round(((inst0 + 48) / designed) * 100)) rec('/projects/CE-2291', `% complete ${pct1}% != ${inst0 + 48}/${designed}`, s);
  const jobTxt = await mainText(page);
  const wk = num((jobTxt.match(/([\d,]+) m this week/) ?? [])[1]);
  if (wk !== EXP.showcase['CE-2291'].weekToDate + 48) rec('/projects/CE-2291', `Job "m this week" = ${wk}, expected ${EXP.showcase['CE-2291'].weekToDate + 48}`, s);
  await nav(page, '/projects/CE-2291?tab=diary', 1500);
  s = await shot(page, `${tag}-04d-dexcom-diary`);
  const diaryTxt = await mainText(page);
  if (!/48 m/.test(diaryTxt)) rec('/projects/CE-2291?tab=diary', 'Diary does not show the 48 m entry from the technician app', s);
  await nav(page, '/projects', 1500);
  const projTxt = await mainText(page);
  const row = projTxt.match(/CE-2291 ·[\s\S]{0,120}?\n(\d+)%\n([\d,]+) \/ ([\d,]+) m/);
  if (!row || num(row[2]) !== inst0 + 48) rec('/projects', `Projects list Dexcom row ${row ? row[2] : '?'} m, expected ${inst0 + 48}`, s);
  await nav(page, '/command', 2500);
  s = await shot(page, `${tag}-04e-command-after-log`);
  const cmd1 = await mainText(page);
  const wtd1 = num((cmd1.match(/Metres installed this week\n([\d,]+) m/) ?? [])[1]);
  if (wtd1 !== wtd0 + 48) rec('/command', `Metres this week ${wtd0} → ${wtd1} after field log, expected +48`, s);
  flushSink('/field actions', s, mark);
  // back into the demo at the field step
  await goStep(stepIdx);

  // ---- Step 5: Finance
  s = await next('/finance', '05-finance');
  mark = sink.length;
  const fin0 = await mainText(page);
  await userClick(page, page.locator('button', { hasText: 'Draft application' }).first(), (d) => add({ kind: 'overlap', severity: 'high', route: (page.url().split('#')[1] ?? ''), vp: tag, detail: d, shot: s }));
  await page.waitForTimeout(1200);
  s = await shot(page, `${tag}-05b-valuation-drafting`);
  await page.locator('button', { hasText: 'Approve and submit' }).waitFor({ timeout: 20000 }).catch(() => fail('/finance', 'Approve and submit never appeared'));
  await page.waitForTimeout(800);
  s = await shot(page, `${tag}-05c-valuation-draft`);
  await check('/finance (valuation drawer)', s);
  const draftTxt = await page.evaluate(() => document.body.innerText);
  if (!/Thurrock/.test(draftTxt)) fail('/finance', 'Valuation draft does not mention Thurrock', s);
  await userClick(page, page.locator('button', { hasText: 'Approve and submit' }), (d) => add({ kind: 'overlap', severity: 'high', route: (page.url().split('#')[1] ?? ''), vp: tag, detail: d, shot: s }));
  await page.waitForTimeout(1500);
  s = await shot(page, `${tag}-05d-valuation-approved`);
  const fin1 = await mainText(page);
  if (/Distribution warehouse, Thurrock\nCE-2309\nNorthwold Construction/.test(fin1) && /Draft application/.test(fin1.split('Thurrock')[1]?.slice(0, 120) ?? '')) fail('/finance', 'Thurrock still listed as needing a draft after approval', s);
  const apps0 = (fin0.match(/(\d+) jobs need an application/) ?? [])[1];
  const apps1 = (fin1.match(/(\d+) jobs need an application/) ?? [])[1];
  if (apps0 && apps1 && num(apps1) !== num(apps0) - 1) rec('/finance', `"jobs need an application" ${apps0} → ${apps1}, expected -1`, s);
  await check('/finance (after approve)', s);
  flushSink('/finance actions', s, mark);

  // ---- Step 6: Tenders
  s = await next('/tenders', '06-tenders');
  mark = sink.length;
  const ten0 = await mainText(page);
  await userClick(page, page.locator('button', { hasText: 'Run Takeoff Agent' }).first(), (d) => add({ kind: 'overlap', severity: 'high', route: (page.url().split('#')[1] ?? ''), vp: tag, detail: d, shot: s }));
  await page.waitForTimeout(800);
  await userClick(page, page.locator('button', { hasText: 'Use sample pack' }), (d) => add({ kind: 'overlap', severity: 'high', route: (page.url().split('#')[1] ?? ''), vp: tag, detail: d, shot: s }));
  await page.waitForTimeout(1500);
  s = await shot(page, `${tag}-06b-takeoff-running`);
  await page.locator('button', { hasText: 'Send to Aaron for review' }).waitFor({ timeout: 60000 }).catch(() => fail('/tenders', 'Takeoff Agent never finished (no Send to Aaron button)'));
  await page.waitForTimeout(800);
  s = await shot(page, `${tag}-06c-takeoff-done`);
  await check('/tenders (takeoff results)', s);
  await userClick(page, page.locator('button', { hasText: 'Send to Aaron for review' }), (d) => add({ kind: 'overlap', severity: 'high', route: (page.url().split('#')[1] ?? ''), vp: tag, detail: d, shot: s }));
  await page.waitForTimeout(1800);
  s = await shot(page, `${tag}-06d-takeoff-sent`);
  const ten1 = await mainText(page);
  if (!/priced by Takeoff Agent/i.test(ten1)) fail('/tenders', 'No "priced by Takeoff Agent" confirmation after sending to Aaron', s);
  const open0 = num((ten0.match(/Tenders open\n(\d+)/) ?? [])[1]);
  const open1 = num((ten1.match(/Tenders open\n(\d+)/) ?? [])[1]);
  const pipe1 = (ten1.match(/Open pipeline\n([^\n]+)/) ?? [])[1];
  await check('/tenders (after send)', s);
  flushSink('/tenders actions', s, mark);
  await nav(page, '/command', 2200);
  const cmd2 = await mainText(page);
  const cOpen = num((cmd2.match(/Tender pipeline\n[^\n]+\n(\d+) open/) ?? [])[1]);
  const cPipe = (cmd2.match(/Tender pipeline\n([^\n]+)/) ?? [])[1];
  if (cOpen !== open1) rec('/command vs /tenders', `After Takeoff: Command says ${cOpen} open tenders, Tenders page says ${open1} (before ${open0})`);
  if (cPipe !== pipe1) rec('/command vs /tenders', `After Takeoff: Command pipeline ${cPipe}, Tenders page ${pipe1}`);
  await nav(page, '/home/aaron', 2000);
  const aaronTxt = await mainText(page);
  fs.writeFileSync(path.join('qa/out/text', `${tag}-aaron-after-takeoff.txt`), aaronTxt);
  await goStep(stepIdx);

  // ---- Step 7: Assistant on Command
  s = await next('/command', '07-assistant');
  mark = sink.length;
  const panelOpen = await page.locator('[data-testid=assist-panel]').isVisible().catch(() => false);
  if (!panelOpen) fail('/command', 'Demo step 7 did not open the Assistant', s);
  // also check Ctrl+K toggles it
  await page.click('[data-testid=assist-close]').catch(() => {});
  await page.waitForTimeout(600);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(900);
  if (!(await page.locator('[data-testid=assist-panel]').isVisible().catch(() => false))) fail('/command', 'Control+K did not open the Assistant');
  let qi = 0;
  for (const q of QUESTIONS) {
    qi++;
    const n0 = await page.locator('[data-testid=assist-msg]').count();
    await page.fill('[data-testid=assist-input]', q);
    await page.press('[data-testid=assist-input]', 'Enter');
    try {
      await page.waitForFunction((n) => {
        const ms = document.querySelectorAll('[data-testid=assist-msg]');
        return ms.length > n && ms[ms.length - 1].getAttribute('data-done') === '1' && !document.querySelector('[data-testid=assist-typing]');
      }, n0, { timeout: 45000 });
    } catch {
      fail('assistant', `Answer to "${q}" did not finish streaming within 45 s`);
    }
    await page.waitForTimeout(700);
    // scroll the user question into view so the screenshot shows Q + A
    await page.evaluate(() => {
      const ms = document.querySelectorAll('[data-testid=assist-msg]');
      const last = ms[ms.length - 1];
      const prev = last?.previousElementSibling;
      (prev ?? last)?.scrollIntoView({ block: 'start' });
    });
    await page.waitForTimeout(300);
    const sh = await shot(page, `${tag}-07-q${String(qi).padStart(2, '0')}`);
    const txt = await page.evaluate(() => {
      const ms = document.querySelectorAll('[data-testid=assist-msg]');
      return ms[ms.length - 1]?.innerText ?? '';
    });
    answers[q] = { text: txt, shot: sh };
    await check(`assistant: ${q}`, sh);
  }
  flushSink('assistant', s, mark);
  fs.writeFileSync(path.join('qa/out', `assistant-${tag}.json`), JSON.stringify(answers, null, 1));
  checkAnswers(answers, EXP, { inst: inst0 + 48, rec: (d, sh) => rec('assistant', d, sh) });

  // ---- Steps 8-9 and finish
  await page.click('[data-testid=assist-close]').catch(() => {});
  await next('/integrations', '08-integrations');
  await next('/efficiency', '09-efficiency');
  for (let k = 0; k < 8 && (await page.locator('[data-testid=demo-guide], [data-testid=tour-pill]').first().isVisible().catch(() => false)); k++) {
    await ensureGuide();
    await page.click('[data-testid=demo-next]');
    await page.waitForTimeout(1500);
  }
  s = await shot(page, `${tag}-10-finished`);
  if (await page.locator('[data-testid=demo-guide]').isVisible().catch(() => false)) fail('demo', 'Demo guide still visible after Finish', s);

  // ---- after-actions consistency: no-crew-tomorrow and crews
  await nav(page, '/command', 2200);
  s = await shot(page, `${tag}-11-command-end`);
  await check('/command (end of demo)', s);
  const cmdEnd = await mainText(page);
  fs.writeFileSync(path.join('qa/out/text', `${tag}-command-end.txt`), cmdEnd);
  if (/Thurrock application not submitted/.test(cmdEnd)) rec('/command', 'Attention feed still says "Thurrock application not submitted … Needs Valerie’s approval" after Valerie approved and submitted it on /finance', s);
  if (/Clonee is 6 days behind with no crew booked tomorrow/.test(cmdEnd)) rec('/command', 'Attention feed still says Clonee has no crew booked tomorrow after IE Crew 8 was booked', s);
  flushSink('end of demo', s);
  await ctx.close();
}

function checkAnswers(A, EXP, { inst, rec }) {
  const get = (i) => A[QUESTIONS[i]] ?? { text: '', shot: '' };
  const has = (i, re, msg) => {
    const a = get(i);
    if (!re.test(a.text)) rec(`Q${i + 1} "${QUESTIONS[i]}": ${msg}. Answer: ${a.text.replace(/\s+/g, ' ').slice(0, 300)}`, a.shot);
  };
  const dex = EXP.showcase['CE-2291'];
  const pct = Math.round((inst / dex.designed) * 100);
  has(0, new RegExp(`${pct}%`), `expected ${pct}% (after +48 m)`);
  has(0, new RegExp(inst.toLocaleString('en-GB')), `expected ${inst.toLocaleString('en-GB')} m installed`);
  // nobody tomorrow: Clonee now covered
  const a1 = get(1).text;
  if (/Clonee/.test(a1) && !/booked|covered|now has/i.test(a1)) rec(`Q2: still lists Clonee as having nobody tomorrow after IE Crew 8 was booked. Answer: ${a1.replace(/\s+/g, ' ').slice(0, 300)}`, get(1).shot);
  for (const n of ['Thurrock', 'Citywest']) has(1, new RegExp(n), `expected ${n}`);
  has(2, new RegExp(`\\b${EXP.over60.count}\\b`), `expected ${EXP.over60.count} applications`);
  for (const l of EXP.over60.list) has(2, new RegExp(l.split(',')[1].split(' |')[0].trim()), `expected ${l}`);
  has(3, new RegExp(`\\b${EXP.closingThisWeek.length}\\b`), `expected ${EXP.closingThisWeek.length} tenders`);
  for (const n of ['Tomás Mason', 'Kevin Lynch', 'Tom Quinn']) has(4, new RegExp(n), `expected ${n}`);
  const uk = EXP.weeklyUK[EXP.weeklyUK.length - 1];
  has(5, new RegExp(uk.toLocaleString('en-GB')), `expected ${uk} m (UK, last completed week)`);
  has(7, new RegExp(`\\b${EXP.renew90.length}\\b`), `expected ${EXP.renew90.length} contracts`);
  has(8, /8\b[^.]*spool|spool[^.]*\b8\b/i, 'expected 8 spools at re-test');
  has(8, /3 RFIs|three RFIs/i, 'expected 3 RFIs');
  const email = get(9).text;
  const neg = /\b(delay|late|behind|overdue|dispute|blocked|unpaid|chase|problem|issue)\w*/i;
  if (neg.test(email)) rec(`Q10 email to John Paul Construction contains negative wording "${email.match(neg)[0]}"`, get(9).shot);
}
