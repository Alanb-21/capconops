// Steps through the presenter walkthrough, screenshots each step, checks the
// spotlight finds its target and that nothing logs a console error.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.OUT ?? 'qa/screenshots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errs.push(m.text()));
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(BASE + '/');
await p.click('[data-testid=sign-in]');
await p.waitForTimeout(800);
await p.getByRole('button', { name: 'Demo' }).click();
const targets = [true, true, true, true, true, true, false, true, true, false, true, false];
let fail = 0;
for (let i = 0; i < targets.length; i++) {
  await p.waitForTimeout(2600);
  const title = await p.locator('[data-testid=demo-guide] h3').first().textContent();
  const spot = await p.locator('[data-testid=tour-spotlight]').count();
  const ok = !targets[i] || spot > 0;
  if (!ok) fail++;
  console.log(`${i + 1}. ${title} · spotlight ${spot ? 'yes' : 'no'}${ok ? '' : '  <-- MISSING'}`);
  await p.screenshot({ path: `${OUT}/walkthrough-${String(i + 1).padStart(2, '0')}.png` });
  if (i < targets.length - 1) await p.click('[data-testid=demo-next]');
}
// notes drawer + guide
await p.keyboard.press('Escape');
await p.keyboard.press('n');
await p.waitForTimeout(700);
await p.screenshot({ path: `${OUT}/notes-drawer.png` });
await p.keyboard.press('n');
await p.goto(BASE + '/#/guide');
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/guide.png`, fullPage: false });
console.log('console errors:', errs);
await b.close();
process.exit(fail || errs.length ? 1 : 0);
