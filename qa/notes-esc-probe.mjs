// Probe: does Escape close the notes drawer, and does it stay open across navigation?
import { launch, newPage, nav } from './lib.mjs';
const b = await launch(); const sink = [];
const { page } = await newPage(b, { width: 1440, height: 900 }, sink);
const isOpen = () => page.evaluate(() => document.body.innerText.includes('Presenter notes · press N'));
await nav(page, '/command', 1500);
await page.keyboard.press('n'); await page.waitForTimeout(800);
console.log('after N:', await isOpen());
await page.keyboard.press('Escape'); await page.waitForTimeout(800);
console.log('after Escape:', await isOpen());
await page.screenshot({ path: 'qa/screenshots/notes-after-escape.png' });
const btnClickable = await page.locator('[data-testid=notes-button]').click({ timeout: 2000 }).then(() => true).catch(() => false);
await page.waitForTimeout(800);
console.log('notes button clickable while drawer open:', btnClickable, '; open now:', await isOpen());
if (await isOpen()) { await page.keyboard.press('n'); await page.waitForTimeout(800); }
console.log('after N:', await isOpen());
await nav(page, '/crews', 1500);
console.log('after navigating to /crews:', await isOpen());
await b.close();
