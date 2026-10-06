// Probe: does main content become visible after in-app navigation in the sweep order? Samples page-wrapper opacity.
// Usage: node qa/blank-probe.mjs [width height theme]
import { launch, newPage } from './lib.mjs';
const [vw, vh, theme] = [+(process.argv[2] ?? 1280), +(process.argv[3] ?? 720), process.argv[4] ?? 'light'];
const b = await launch(); const sink = [];
const { page } = await newPage(b, { width: vw, height: vh, theme }, sink);
for (const r of ['/crews', '/prefab', '/handover', '/tenders', '/design', '/finance', '/maintenance', '/tenders']) {
  await page.evaluate((x) => { location.hash = x; }, r);
  const samples = [];
  let prev = 0;
  for (const t of [300, 1000, 2200, 5000, 10000]) {
    await page.waitForTimeout(t - prev); prev = t;
    samples.push(t + ':' + (await page.evaluate(() => {
      const k = document.getElementById('main-scroll')?.firstElementChild;
      return k ? (+getComputedStyle(k).opacity).toFixed(2) + '/' + (k.querySelector('h1')?.innerText ?? '').slice(0, 12) : 'none';
    })));
  }
  console.log(r.padEnd(14), samples.join('  '));
}
console.log(sink); await b.close();
