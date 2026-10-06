import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs=[]; p.on('console', m => (m.type()==='error'||m.type()==='warning') && errs.push(m.text()));
await p.goto((process.env.BASE ?? 'http://localhost:4173') + '/'); await p.click('[data-testid=sign-in]');
await p.getByRole('button', { name: 'Demo' }).click(); await p.waitForTimeout(1500);
for (let i=0;i<4;i++){ await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);} // step 5 crews
await p.waitForTimeout(2000);
await p.mouse.click(700, 220); await p.waitForTimeout(600);
console.log('pill after click:', await p.locator('[data-testid=tour-pill]').count());
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1500);
console.log('card back after →:', await p.locator('[data-testid=demo-guide]').count(), await p.locator('[data-testid=demo-guide] h3').first().textContent());
await p.reload(); await p.waitForTimeout(1500);
console.log('still signed in after reload:', await p.locator('[data-testid=sign-in]').count() === 0);
console.log('errors', errs); await b.close();
