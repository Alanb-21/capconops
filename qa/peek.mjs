// Dev helper: print main text of a route. Usage: node qa/peek.mjs /route
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4173/'); await p.click('[data-testid=sign-in]');
await p.goto('http://localhost:4173/#' + process.argv[2]); await p.waitForTimeout(3000);
console.log(await p.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText));
await b.close();
