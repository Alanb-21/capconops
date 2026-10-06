import { chromium } from 'playwright';
const [,, url, out, dark] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://localhost:5173/');
await p.click('[data-testid=sign-in]');
await p.goto('http://localhost:5173/#' + url);
await p.waitForTimeout(3500);
if (dark) { await p.click('[aria-label="Toggle theme"]'); await p.waitForTimeout(500); }
await p.screenshot({ path: out }); if (process.env.SCROLL) { await p.evaluate(()=>document.getElementById('main-scroll').scrollTo(0, 1e5)); await p.waitForTimeout(1200); await p.screenshot({ path: out.replace('.png','-b.png') }); }
console.log('errors:', errs);
await b.close();
