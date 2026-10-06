// Presenter features: 12-step walkthrough (Demo button), notes drawer (N / notes-button), /guide, reload keeps sign-in.
import { newPage, nav, shot, domChecks } from './lib.mjs';

export async function runPresenter(browser, vp, theme, add, { notesRoutes = ['/command', '/crews', '/finance', '/field', '/guide'] } = {}) {
  const sink = [];
  const tag = `${vp.width}x${vp.height}-${theme}-presenter`;
  const { ctx, page } = await newPage(browser, { ...vp, theme }, sink);
  let flushed = 0;
  const flush = (route, s) => {
    for (const e of sink.slice(flushed)) add({ ...e, route: `${route} (${e.where})`, vp: tag, shot: s });
    flushed = sink.length;
  };
  const check = async (route, s) => {
    for (const f of await domChecks(page)) add({ ...f, route, vp: tag, shot: s });
    const op = await page.evaluate(() => +getComputedStyle(document.getElementById('main-scroll')?.firstElementChild ?? document.body).opacity);
    if (op < 0.99) add({ kind: 'empty-main', route, vp: tag, detail: `Page invisible (opacity ${op})`, shot: s });
  };

  // --- walkthrough
  await nav(page, '/command', 1500);
  await page.locator('header button', { hasText: 'Demo' }).click();
  await page.waitForTimeout(1500);
  if (!(await page.locator('[data-testid=demo-guide]').isVisible().catch(() => false))) add({ kind: 'action', route: '/command', vp: tag, detail: 'Demo button did not open the walkthrough card' });
  const steps = [];
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1800);
    const title = (await page.locator('[data-testid=demo-guide] h3').first().textContent().catch(() => '')) ?? '';
    const spot = await page.locator('[data-testid=tour-spotlight]').count();
    const route = (page.url().split('#')[1] ?? '').split('?')[0];
    const s = await shot(page, `${tag}-step${String(i + 1).padStart(2, '0')}`);
    steps.push({ i: i + 1, title, route, spot });
    await check(`walkthrough step ${i + 1} ${route}`, s);
    // does the card overlap the spotlight target?
    const ov = await page.evaluate(() => {
      const c = document.querySelector('[data-testid=demo-guide]')?.getBoundingClientRect();
      const t = document.querySelector('[data-testid=tour-spotlight]')?.getBoundingClientRect();
      if (!c || !t) return 0;
      const w = Math.max(0, Math.min(c.right, t.right - 6) - Math.max(c.left, t.left + 6));
      const h = Math.max(0, Math.min(c.bottom, t.bottom - 6) - Math.max(c.top, t.top + 6));
      return Math.round((w * h) / Math.max(1, (t.width - 12) * (t.height - 12)) * 100);
    });
    if (ov > 25) add({ kind: 'overlap', severity: 'medium', route: `walkthrough step ${i + 1} ${route}`, vp: tag, detail: `Walkthrough card covers ${ov}% of the spotlighted element ("${title}")`, shot: s });
    flush(`walkthrough step ${i + 1}`, s);
    const finish = (await page.locator('[data-testid=demo-next]').textContent().catch(() => '')) ?? '';
    if (/Finish/.test(finish)) {
      await page.click('[data-testid=demo-next]');
      await page.waitForTimeout(1200);
      break;
    }
    if (await page.locator('[data-testid=tour-pill]').isVisible().catch(() => false)) await page.click('[data-testid=tour-pill]');
    await page.click('[data-testid=demo-next]');
  }
  if (steps.length !== 12) add({ kind: 'action', route: 'walkthrough', vp: tag, detail: `Walkthrough had ${steps.length} steps, expected 12` });
  if (await page.locator('[data-testid=demo-guide], [data-testid=tour-pill]').first().isVisible().catch(() => false)) add({ kind: 'action', route: 'walkthrough', vp: tag, detail: 'Walkthrough still visible after Finish' });

  // tuck: click in the page, card becomes the pill; ArrowRight advances
  await page.locator('header button', { hasText: 'Demo' }).click();
  await page.waitForTimeout(1200);
  await page.mouse.click(vp.width / 2, 120);
  await page.waitForTimeout(700);
  const pill = await page.locator('[data-testid=tour-pill]').isVisible().catch(() => false);
  let s = await shot(page, `${tag}-tucked`);
  if (!pill) add({ kind: 'action', route: 'walkthrough', vp: tag, detail: 'Clicking in the app did not tuck the walkthrough into the pill', shot: s });
  const before = page.url();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1500);
  const t2 = (await page.locator('[data-testid=demo-guide] h3, [data-testid=tour-pill]').first().textContent().catch(() => '')) ?? '';
  if (/The whole business/.test(t2) && page.url() === before) add({ kind: 'action', route: 'walkthrough', vp: tag, detail: 'ArrowRight did not advance the walkthrough' });
  await page.locator('[aria-label="End walkthrough"]').click().catch(async () => {
    await page.click('[data-testid=tour-pill]').catch(() => {});
    await page.locator('[aria-label="End walkthrough"]').click().catch(() => {});
  });
  await page.waitForTimeout(600);
  flush('walkthrough tuck', s);

  // --- notes drawer on several pages, by button and by N
  for (const [k, r] of notesRoutes.entries()) {
    await nav(page, r, 1500);
    if (k % 2 === 0) await page.click('[data-testid=notes-button]');
    else await page.keyboard.press('n');
    await page.waitForTimeout(900);
    s = await shot(page, `${tag}-notes-${r.replace(/\W+/g, '_')}`);
    const open = await page.evaluate(() => document.body.innerText.includes('Presenter notes · press N'));
    if (!open) add({ kind: 'action', route: r, vp: tag, detail: `Notes drawer did not open (${k % 2 === 0 ? 'button' : 'N key'})`, shot: s });
    await check(`${r} (notes open)`, s);
    if (open) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(700);
      const still = await page.evaluate(() => document.body.innerText.includes('Presenter notes · press N'));
      if (still) {
        add({ kind: 'ux', severity: 'medium', route: r, vp: tag, detail: 'Escape does not close the notes drawer (N or the × closes it)', shot: s });
        await page.keyboard.press('n');
        await page.waitForTimeout(700);
      }
    }
    flush(`notes ${r}`, s);
  }

  // --- reload keeps sign-in
  await nav(page, '/finance', 1000);
  await page.reload();
  await page.waitForTimeout(2500);
  const signIn = await page.locator('[data-testid=sign-in]').count();
  const route = (page.url().split('#')[1] ?? '').split('?')[0];
  s = await shot(page, `${tag}-after-reload`);
  if (signIn) add({ kind: 'action', route: '/finance', vp: tag, detail: 'Reload showed the sign-in screen again', shot: s });
  if (route !== '/finance') add({ kind: 'action', route: '/finance', vp: tag, detail: `Reload landed on ${route}`, shot: s });
  await check('/finance (after reload)', s);
  flush('reload', s);
  await ctx.close();
  return steps;
}
