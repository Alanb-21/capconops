// Capcon OS QA sweep. Needs the preview server on :4173 (npm run build && npm run preview).
// Usage: node qa/run-qa.mjs [all|sweep|small|presenter|demo]   (default all)
// Writes screenshots to qa/screenshots/, page text to qa/out/text/, results to qa/out/results.json.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { launch, newPage, nav, shot, slug, domChecks, mainText, BASE } from './lib.mjs';
import { runDemo } from './demo-path.mjs';
import { runPresenter } from './presenter.mjs';

const MODE = process.argv[2] ?? 'all';
const OUT = path.resolve('qa/out');
fs.mkdirSync(path.join(OUT, 'text'), { recursive: true });

// expected figures from the seed (computed with tsx so the numbers come straight from src/data)
let EXP;
try {
  execSync('npx -y tsx qa/data-snapshot.ts > qa/out/expected.json', { stdio: ['ignore', 'ignore', 'inherit'], timeout: 180000 });
  EXP = JSON.parse(fs.readFileSync('qa/out/expected.json', 'utf8'));
} catch (e) {
  console.error('could not compute expected data', e.message);
  process.exit(2);
}

const BASE_ROUTES = [
  '/command', '/home/eugene', '/home/robert', '/home/stephen', '/home/aaron', '/home/valerie', '/home/julia',
  '/projects', '/projects?view=stand',
  '/projects/CE-2291', '/projects/CE-2337', '/projects/CE-2304', '/projects/CE-2333',
  '/crews', '/prefab', '/handover', '/tenders', '/design', '/finance', '/maintenance', '/hsqe', '/agents', '/integrations', '/efficiency', '/field', '/guide',
];
const JOB_TABS = ['diary', 'programme', 'commercial', 'docs', 'hs'];
const TAB_ROUTES = ['CE-2291', 'CE-2337', 'CE-2304', 'CE-2333'].flatMap((id) => JOB_TABS.map((t) => `/projects/${id}?tab=${t}`));
const ROUTES = [...BASE_ROUTES, ...TAB_ROUTES];
const ROLES = [
  ['Donnacha Tobin', '/command'], ['Eugene Finn', '/home/eugene'], ['Robert Finn', '/home/robert'], ['Stephen Morris', '/home/stephen'],
  ["Aaron O'Neill", '/home/aaron'], ['Valerie Curran', '/home/valerie'], ['Julia Cavanaugh', '/home/julia'], ['Barry McEvoy', '/field'],
];

const findings = []; // {severity, kind, route, vp, theme, detail, shot}
const add = (f) => findings.push(f);

function sevFor(kind) {
  if (['pageerror', 'console-error', 'not-found', 'empty-main', 'requestfailed', 'real-company-negative'].includes(kind) || kind.startsWith('http-')) return 'high';
  if (['bad-text', 'overflow-document', 'overflow-main', 'reconcile', 'console-warning', 'action'].includes(kind)) return 'high';
  if (['text-clipped', 'text-overflow', 'element-overflow', 'chart-empty'].includes(kind)) return 'medium';
  return 'low';
}

async function sweep(browser, vp, theme, { full = false, routes = ROUTES, roles = true, saveText = false } = {}) {
  const sink = [];
  const { ctx, page } = await newPage(browser, { ...vp, theme }, sink);
  const tag = `${vp.width}x${vp.height}-${theme}`;
  const texts = {};
  for (const r of routes) {
    const before = sink.length;
    await nav(page, r, 2200);
    const s = await shot(page, `${tag}-${slug(r)}`, { full });
    if (page._qaInvisible === r) add({ kind: 'empty-main', route: r, vp: tag, detail: 'Page content still invisible (route fade-in not finished) 8 s after navigation', shot: s });
    const hash = page.url().split('#')[1] ?? '';
    if (hash.split('?')[0] !== r.split('?')[0]) add({ kind: 'not-found', route: r, vp: tag, detail: `Route redirected to ${hash}`, shot: s });
    for (const f of await domChecks(page)) add({ ...f, route: r, vp: tag, shot: s });
    for (const e of sink.slice(before)) add({ ...e, route: r, vp: tag, shot: s });
    texts[r] = await mainText(page);
    if (saveText) fs.writeFileSync(path.join(OUT, 'text', `${slug(r)}.txt`), texts[r]);
    process.stdout.write('.');
  }
  if (roles) {
    for (const [person, home] of ROLES) {
      const before = sink.length;
      await page.click('[data-testid=role-switcher]');
      await page.waitForTimeout(350);
      await page.locator('.glass-strong button', { hasText: person }).first().click();
      await page.waitForTimeout(2000);
      const hash = (page.url().split('#')[1] ?? '').split('?')[0];
      const s = await shot(page, `${tag}-role-${slug(person)}`);
      if (hash !== home) add({ kind: 'action', route: `role:${person}`, vp: tag, detail: `Role switch landed on ${hash}, expected ${home}`, shot: s });
      const label = await page.locator('[data-testid=role-switcher]').innerText().catch(() => '');
      if (vp.width >= 1024 && !label.includes(person)) add({ kind: 'action', route: `role:${person}`, vp: tag, detail: `Role switcher shows "${label.replace(/\s+/g, ' ')}" after picking ${person}`, shot: s });
      for (const f of await domChecks(page)) add({ ...f, route: `role:${person}`, vp: tag, shot: s });
      for (const e of sink.slice(before)) add({ ...e, route: `role:${person}`, vp: tag, shot: s });
      process.stdout.write('r');
    }
  }
  // the demo-data pill must be visible
  const pill = await page.locator('header >> text=Demo data').isVisible().catch(() => false);
  if (!pill) add({ kind: 'action', route: '(top bar)', vp: tag, detail: '"Demo data" pill not visible', shot: '' });
  for (const e of sink.filter((x) => !findings.some((f) => f.detail === x.detail))) add({ ...e, route: e.where, vp: tag });
  await ctx.close();
  console.log(` ${tag} done`);
  return texts;
}

// ---------------------------------------------------------------- reconciliation over page text
function reconcile(texts, tag) {
  const R = (kind, route, detail) => add({ kind: 'reconcile', route, vp: tag, detail });
  const grab = (route, re) => {
    const m = (texts[route] ?? '').match(re);
    return m ? m[1] : null;
  };
  const n = (s) => (s == null ? null : Number(String(s).replace(/[,\s]/g, '')));
  // live sites = jobs
  const live = n(grab('/command', /Live sites\n([\d,]+)/));
  if (live !== EXP.jobs) R('reconcile', '/command', `KPI "Live sites" = ${live}, jobs in data = ${EXP.jobs}`);
  const proj = n(grab('/projects', /\n([\d,]+)\njobs\n/));
  if (proj !== EXP.jobs) R('reconcile', '/projects', `Projects list count = ${proj}, jobs in data = ${EXP.jobs}`);
  const rows = (texts['/projects'] ?? '').match(/CE-\d{4} ·/g)?.length ?? 0;
  if (rows && rows !== EXP.jobs) R('reconcile', '/projects', `Projects table renders ${rows} job rows, header says ${proj} (rows may be paginated)`);
  const wtd = n(grab('/command', /Metres installed this week\n([\d,]+) m/));
  if (wtd !== EXP.weekToDate) R('reconcile', '/command', `Metres this week KPI ${wtd} != data ${EXP.weekToDate}`);
  const tOpen = n(grab('/tenders', /Tenders open\n(\d+)/));
  const cOpen = n(grab('/command', /Tender pipeline\n[^\n]+\n(\d+) open/));
  if (tOpen !== EXP.openTenders || cOpen !== EXP.openTenders) R('reconcile', '/tenders,/command', `Open tenders: Tenders page ${tOpen}, Command ${cOpen}, data ${EXP.openTenders}`);
  const closing = n(grab('/tenders', /Closing this week\n(\d+)/));
  if (closing !== EXP.closingThisWeek.length) R('reconcile', '/tenders', `Closing this week ${closing} != data ${EXP.closingThisWeek.length}`);
  const over60 = n(grab('/finance', /Over 60 days\n(\d+)/));
  if (over60 !== EXP.over60.count) R('reconcile', '/finance', `Over 60 days ${over60} != data ${EXP.over60.count}`);
  // job pages: % complete equals installed/designed shown
  for (const id of Object.keys(EXP.showcase)) {
    const t = texts[`/projects/${id}`] ?? '';
    const e = EXP.showcase[id];
    const pc = n((t.match(/(?:% complete|Design complete)\n(\d+)%/) ?? [])[1]);
    const inst = t.match(/Installed \/ designed\n([\d,]+) \/ ([\d,]+) m/);
    if (e.designOnly) {
      if (pc !== Math.round(e.pct * 100)) R('reconcile', `/projects/${id}`, `Design complete ${pc}% != data ${Math.round(e.pct * 100)}%`);
    } else {
      if (!inst) R('reconcile', `/projects/${id}`, 'Could not read Installed / designed');
      else {
        const [a, b] = [n(inst[1]), n(inst[2])];
        if (a !== e.installed || b !== e.designed) R('reconcile', `/projects/${id}`, `Installed/designed ${a}/${b} != data ${e.installed}/${e.designed}`);
        if (pc !== Math.round((a / b) * 100)) R('reconcile', `/projects/${id}`, `% complete ${pc}% != installed/designed ${Math.round((a / b) * 100)}%`);
      }
    }
    // the same job in the projects list
    const row = (texts['/projects'] ?? '').match(new RegExp(`${id} ·[^\\n]*\\n[^\\n]*\\n?[^\\n]*?\\n(\\d+)%\\n([\\d,]+) / ([\\d,]+) m`));
    if (row && !e.designOnly && (n(row[2]) !== e.installed || n(row[1]) !== Math.round(e.pct * 100))) R('reconcile', '/projects', `${id} list row ${row[1]}% ${row[2]}/${row[3]} m vs job page`);
  }
  // same labelled KPI value everywhere it appears
  const LABELS = ['Work in progress', 'Applications outstanding', 'Cash received, 30 days', 'Tender pipeline', 'Open pipeline', 'Tenders open', 'Closing this week', 'Over 60 days', 'Retentions held', 'Crew utilisation', 'Live sites', 'Win rate, 12 months', 'Win rate', 'Near misses, 30 days', 'Maintenance visits due', 'Aged debt', 'Order book'];
  for (const L of LABELS) {
    const vals = {};
    for (const [r, t] of Object.entries(texts)) {
      const re = new RegExp(`(?:^|\\n)${L.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n([^\\n]+)`, 'g');
      for (const m of t.matchAll(re)) (vals[m[1].trim()] ??= []).push(r);
    }
    // Compare like with like: skip per-job tabs (job-level figures), the /efficiency sliders and non-numeric text,
    // and only flag when two pages show different values of the same kind (money vs count).
    for (const v of Object.keys(vals)) {
      vals[v] = vals[v].filter((r) => !r.includes('?tab=') && r !== '/efficiency');
      if (!vals[v].length || !/\d/.test(v)) delete vals[v];
    }
    const kinds = {};
    for (const v of Object.keys(vals)) (kinds[/[€£]/.test(v) ? 'money' : 'count'] ??= []).push(v);
    if (Object.values(kinds).some((k) => k.length > 1)) R('reconcile', Object.values(vals).flat().join(', '), `"${L}" shows different values on different pages: ${JSON.stringify(vals)}`);
  }
  fs.writeFileSync(path.join(OUT, 'kpi-values.json'), JSON.stringify(EXP, null, 1));
}

const browser = await launch();
const t0 = Date.now();
try {
  if (MODE === 'all' || MODE === 'sweep') {
    const t1 = await sweep(browser, { width: 1440, height: 900 }, 'light', { full: true, saveText: true });
    reconcile(t1, '1440x900-light');
    await sweep(browser, { width: 1440, height: 900 }, 'dark', { full: true });
    await sweep(browser, { width: 1920, height: 1080 }, 'light');
    await sweep(browser, { width: 1920, height: 1080 }, 'dark');
  }
  if (MODE === 'all' || MODE === 'small') {
    await sweep(browser, { width: 1280, height: 720 }, 'light', { routes: BASE_ROUTES, roles: false });
    await sweep(browser, { width: 1280, height: 720 }, 'dark', { routes: ['/command', '/crews', '/finance', '/tenders', '/projects/CE-2291'], roles: false });
  }
  if (MODE === 'all' || MODE === 'presenter') {
    for (const [vp, th] of [[{ width: 1440, height: 900 }, 'light'], [{ width: 1440, height: 900 }, 'dark'], [{ width: 1920, height: 1080 }, 'light'], [{ width: 1920, height: 1080 }, 'dark'], [{ width: 1280, height: 720 }, 'light']]) {
      const st = await runPresenter(browser, vp, th, add);
      fs.writeFileSync(path.join(OUT, `walkthrough-${vp.width}-${th}.json`), JSON.stringify(st, null, 1));
      console.log(` presenter ${vp.width}-${th} done (${st.length} steps)`);
    }
  }
  if (MODE === 'all' || MODE === 'demo') {
    await runDemo(browser, { width: 1440, height: 900 }, 'light', EXP, add);
    await runDemo(browser, { width: 1920, height: 1080 }, 'dark', EXP, add);
  }
} finally {
  await browser.close();
}

for (const f of findings) f.severity ??= sevFor(f.kind);
const order = { high: 0, medium: 1, low: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity] || a.kind.localeCompare(b.kind));
fs.writeFileSync(path.join(OUT, `results-${MODE}.json`), JSON.stringify(findings, null, 1));
const byKind = findings.reduce((a, f) => ((a[`${f.severity}:${f.kind}`] = (a[`${f.severity}:${f.kind}`] || 0) + 1), a), {});
console.log(`\n${findings.length} findings in ${Math.round((Date.now() - t0) / 1000)}s against ${BASE}`, byKind);
const fails = findings.filter((f) => f.severity !== 'low');
console.log(fails.length ? 'QA: FAIL' : 'QA: PASS');
process.exit(fails.length ? 1 : 0);
