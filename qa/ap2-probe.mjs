// Probe: after manually booking only IE-08 Wed on Clonee, what happens to the Scheduler suggestion (AP-2) and Clonee Thu/Fri?
import { launch, newPage, nav, mainText } from './lib.mjs';
const b = await launch(); const sink = [];
const { page } = await newPage(b, { width: 1440, height: 900 }, sink);
await nav(page, '/crews', 1800);
await page.click('[data-testid=cell-IE-08-Wed]'); await page.click('[data-testid=pick-CE-2333]'); await page.waitForTimeout(1200);
const t = await mainText(page);
console.log('SCHEDULER CARD:', (t.match(/SCHEDULER AGENT SUGGESTS[\s\S]{0,260}/i) ?? ['(none)'])[0].replace(/\n/g, ' | '));
console.log('SITES NEEDING:', (t.match(/Sites needing a crew\n[\s\S]{0,200}/) ?? [''])[0].replace(/\n/g, ' | '));
await page.evaluate(() => document.getElementById('main-scroll').scrollTo({ top: 0 }));
await page.screenshot({ path: 'qa/screenshots/ap2-after-wed-only.png' });
await nav(page, '/agents', 1500);
const a = await mainText(page);
console.log('AP-2 in queue:', /Move IE Crew 8 to Clonee/.test(a), (a.match(/Waiting for approval[\s\S]{0,60}/) ?? [''])[0].replace(/\n/g, ' | '));
await b.close();
