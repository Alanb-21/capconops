// 1280x720 spot check: screenshots + clipped-text detector for the given routes.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/command', '/hsqe', '/tenders', '/maintenance', '/prefab', '/projects', '/finance'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(BASE + '/'); await p.click('[data-testid=sign-in]');
for (const r of routes) {
  await p.goto(BASE + '/#' + r); await p.waitForTimeout(3500);
  const clipped = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('#main-scroll button, #main-scroll a')) {
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') out.push('btn:' + el.textContent.trim().slice(0, 40));
      const r = el.getBoundingClientRect(); const card = el.closest('.glass,.glass-strong');
      if (card) { const c = card.getBoundingClientRect(); if (r.right > c.right + 2) out.push('overflows card:' + el.textContent.trim().slice(0, 40)); }
    }
    for (const el of document.querySelectorAll('#main-scroll h3')) if (el.clientWidth < 40 && el.textContent.length > 4) out.push('squashed h3:' + el.textContent.trim().slice(0, 30));
    return out.slice(0, 8);
  });
  console.log(r, clipped.length ? clipped : 'ok');
  await p.screenshot({ path: `qa/screenshots/1280-${r.replace(/\W+/g, '_')}.png` });
}
await b.close();
