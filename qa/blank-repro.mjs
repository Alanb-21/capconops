// Repro for pages that stay invisible (opacity 0) after navigating. Uses real sidebar clicks.
// Usage: node qa/blank-repro.mjs "Testing & Handover" "Tenders & Estimating" ...
import { launch, newPage } from './lib.mjs';
const seq = process.argv.slice(2);
const b = await launch(); const sink = [];
const { page } = await newPage(b, { width: 1440, height: 900 }, sink);
for (const label of seq) {
  await page.locator('aside, nav').getByText(label, { exact: true }).first().click();
  await page.waitForTimeout(3000);
  const op = await page.evaluate(() => { const k = document.getElementById('main-scroll')?.firstElementChild; return k ? (+getComputedStyle(k).opacity).toFixed(2) + ' ' + (k.querySelector('h1')?.innerText ?? '') : 'none'; });
  console.log(label.padEnd(24), '->', page.url().split('#')[1], 'opacity', op);
}
await page.screenshot({ path: 'qa/screenshots/blank-page-repro.png' });
await b.close();
