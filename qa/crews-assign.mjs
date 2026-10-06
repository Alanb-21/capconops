// Playwright check: the click-to-assign fallback on Crews books IE Crew 8 on Clonee (Wed)
// and the page logs no console errors.
import { chromium } from 'playwright';
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`); });
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://localhost:5173/');
await p.click('[data-testid=sign-in]');
await p.goto('http://localhost:5173/#/crews');
await p.waitForSelector('[data-testid=cell-IE-08-Wed]');
const before = (await p.textContent('[data-testid=cell-IE-08-Wed]')).trim();
await p.click('[data-testid=cell-IE-08-Wed]');
await p.waitForSelector('[data-testid=site-picker]');
await p.click('[data-testid=pick-CE-2333]');
await p.waitForTimeout(600);
const after = (await p.textContent('[data-testid=cell-IE-08-Wed]')).trim();
const banner = await p.locator('[data-testid=compliance-banner]').first().textContent().catch(() => '');
const siteWedStill = await p.locator('[data-testid=site-CE-2333]').count();
if (out) await p.screenshot({ path: out });
await b.close();
const ok = before.includes('Unassigned') && after.includes('Clonee') && banner.includes('Compliance Agent') && errs.length === 0;
console.log(JSON.stringify({ before, after, banner, cloneeStillListed: siteWedStill > 0, errors: errs }, null, 1));
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
