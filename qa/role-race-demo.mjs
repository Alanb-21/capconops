// Repro: start the walkthrough (Demo) from a role home page; the top bar should switch to Donnacha.
import { launch, newPage, nav } from './lib.mjs';
const b = await launch(); const sink = [];
const { page } = await newPage(b, { width: 1440, height: 900 }, sink);
await nav(page, '/home/valerie', 1500);
await page.locator('header button', { hasText: 'Demo' }).click(); await page.waitForTimeout(2000);
const label = (await page.locator('[data-testid=role-switcher]').innerText()).replace(/\s+/g, ' ');
console.log(JSON.stringify({ url: page.url().split('#')[1], label }));
await page.screenshot({ path: 'qa/screenshots/role-race-demo-from-valerie.png' }); await b.close();
