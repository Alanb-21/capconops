// Repro: switching role from a /home/:role page to a role whose home is not /home/* keeps the old role.
import { launch, newPage, nav } from './lib.mjs';
const b = await launch(); const sink = [];
const { page } = await newPage(b, { width: 1440, height: 900 }, sink);
const res = [];
for (const [from, to, toHome] of [['/home/valerie', 'Donnacha Tobin', '/command'], ['/home/julia', 'Barry McEvoy', '/field'], ['/home/eugene', 'Robert Finn', '/home/robert']]) {
  await nav(page, from, 1200);
  await page.click('[data-testid=role-switcher]'); await page.waitForTimeout(300);
  await page.locator('.glass-strong button', { hasText: to }).first().click(); await page.waitForTimeout(1200);
  const label = (await page.locator('[data-testid=role-switcher]').innerText()).replace(/\s+/g, ' ');
  const greet = await page.evaluate(() => document.getElementById('main-scroll').innerText.slice(0, 80).replace(/\s+/g, ' '));
  res.push({ from, picked: to, url: page.url().split('#')[1], label, ok: label.includes(to), top: greet });
}
console.log(JSON.stringify(res, null, 1)); await page.screenshot({ path: 'qa/screenshots/role-race-repro.png' }); await b.close();
process.exit(res.every((r) => r.ok) ? 0 : 1);
