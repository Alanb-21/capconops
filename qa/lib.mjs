// Shared helpers for the Capcon OS QA sweep.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export const BASE = process.env.QA_BASE ?? 'http://localhost:4173/';
export const SHOTS = path.resolve('qa/screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

export const REAL_COMPANIES = ['John Paul Construction', 'John Paul', 'Bouygues', 'Toureen', 'PM Group', 'KPF', 'Diageo', 'RDS', 'Connacht Rugby', 'Dexcom', 'Arup', 'Atkins', 'AECOM', 'Jacobs'];
export const NEGATIVE = '\\b(debts?|aged debt|overdue|late|lateness|delay(s|ed)?|disput\\w*|blocked|behind|unpaid|at risk|at-risk|chase[sd]?|chasers?|chasing|problems?|penalt\\w*|slipp\\w*|stood down|not handed over|pay less|claims?|arrears|withheld|past due|days? late|missed|defaults?)\\b';

export async function launch() {
  return chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
}

/** New signed-in page with listeners that collect console/network problems into `sink`. */
export async function newPage(browser, { width, height, theme = 'light' }, sink) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: 'light', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page._qaWhere = () => page.url().split('#')[1] ?? '/';
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') sink.push({ kind: 'console-' + m.type(), where: page._qaWhere(), detail: m.text().slice(0, 400) });
  });
  page.on('pageerror', (e) => sink.push({ kind: 'pageerror', where: page._qaWhere(), detail: String(e).slice(0, 400) }));
  page.on('requestfailed', (r) => sink.push({ kind: 'requestfailed', where: page._qaWhere(), detail: `${r.method()} ${r.url()} ${r.failure()?.errorText ?? ''}` }));
  page.on('response', (r) => {
    if (r.status() >= 400) sink.push({ kind: 'http-' + r.status(), where: page._qaWhere(), detail: `${r.request().method()} ${r.url()}` });
  });
  await page.goto(BASE);
  await page.click('[data-testid=sign-in]');
  await page.waitForSelector('#main-scroll, main', { timeout: 15000 });
  await page.waitForTimeout(600);
  if (theme === 'dark') {
    await page.click('[aria-label="Toggle theme"]');
    await page.waitForTimeout(400);
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (!isDark) sink.push({ kind: 'theme', where: '/', detail: 'Theme toggle did not set .dark' });
  }
  return { ctx, page };
}

/** In-app navigation (hash change, keeps store state). */
export async function nav(page, route, wait = 2000) {
  await page.evaluate((r) => {
    window.location.hash = r;
  }, route);
  await page.waitForTimeout(wait);
  await page.evaluate(() => document.getElementById('main-scroll')?.scrollTo({ top: 0 }));
  await page.waitForTimeout(150);
}

export function slug(s) {
  return s.replace(/^\//, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+$/, '') || 'root';
}

export async function shot(page, name, { full = false } = {}) {
  const file = path.join(SHOTS, name + '.png');
  if (!full) {
    await page.screenshot({ path: file });
    return path.relative(process.cwd(), file);
  }
  // Grow the viewport to the height of the main scroll area so the whole page is captured.
  const vp = page.viewportSize();
  const h = await page.evaluate(() => {
    const m = document.getElementById('main-scroll');
    return m ? m.scrollHeight + (window.innerHeight - m.clientHeight) : document.documentElement.scrollHeight;
  });
  const target = Math.min(9000, Math.max(vp.height, h));
  if (target > vp.height) {
    await page.setViewportSize({ width: vp.width, height: target });
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: file });
  if (target > vp.height) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(300);
  }
  return path.relative(process.cwd(), file);
}

/** DOM checks run on the current page. Returns a list of findings. */
export async function domChecks(page) {
  return page.evaluate(
    ({ companies, negative }) => {
      const out = [];
      const main = document.getElementById('main-scroll') ?? document.querySelector('main');
      const mainText = (main?.innerText ?? '').trim();
      if (mainText.length < 40) out.push({ kind: 'empty-main', detail: `main text length ${mainText.length}` });
      if (/couldn.t find|not found|404/i.test(mainText.slice(0, 400))) out.push({ kind: 'not-found', detail: mainText.slice(0, 120) });

      const body = document.body.innerText;
      const bad = [/\bNaN\b/, /\bundefined\b/, /\bInfinity\b/, /\[object Object\]/, /\bnull\b/, /-0(?:\.0)?%/, /€-|£-/];
      for (const re of bad) {
        const m = body.match(new RegExp('.{0,50}' + re.source + '.{0,50}'));
        if (m) out.push({ kind: 'bad-text', detail: `${re.source}: …${m[0].replace(/\s+/g, ' ')}…` });
      }

      const de = document.documentElement;
      if (de.scrollWidth > de.clientWidth + 1) out.push({ kind: 'overflow-document', detail: `documentElement scrollWidth ${de.scrollWidth} > clientWidth ${de.clientWidth}` });
      if (main && main.scrollWidth > main.clientWidth + 1) out.push({ kind: 'overflow-main', detail: `#main-scroll scrollWidth ${main.scrollWidth} > clientWidth ${main.clientWidth}` });

      const desc = (el) => {
        const c = typeof el.className === 'string' ? el.className : el.getAttribute('class') ?? '';
        const t = (el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 70);
        return `<${el.tagName.toLowerCase()} class="${c.slice(0, 80)}"> "${t}"`;
      };
      const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      const visible = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const seen = new Set();
      const all = document.querySelectorAll('body *');
      for (const el of all) {
        if (el.closest('svg') || el.tagName === 'svg') continue;
        const sw = el.scrollWidth;
        const cw = el.clientWidth;
        if (!cw || sw <= cw + 2) continue;
        if (!visible(el)) continue;
        const cs = getComputedStyle(el);
        const ox = cs.overflowX;
        if (ox === 'auto' || ox === 'scroll') continue;
        if (cs.textOverflow === 'ellipsis') continue;
        if (el.closest('[aria-hidden=true]')) continue;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') continue;
        const er = el.getBoundingClientRect();
        // text spilling or clipped within its own box
        if (hasOwnText(el) && sw > cw + 3) {
          const key = 'self:' + desc(el);
          if (!seen.has(key)) {
            seen.add(key);
            out.push({ kind: ox === 'hidden' || ox === 'clip' ? 'text-clipped' : 'text-overflow', detail: `${desc(el)} scrollWidth ${sw} > clientWidth ${cw}` });
          }
          continue;
        }
        // descendants with text that stick out horizontally
        for (const d of el.querySelectorAll('*')) {
          if (d.closest('svg')) continue;
          if (!hasOwnText(d) || !visible(d)) continue;
          // ignore descendants inside their own scroller below el
          let p = d.parentElement;
          let inScroller = false;
          while (p && p !== el) {
            const o = getComputedStyle(p).overflowX;
            if (o === 'auto' || o === 'scroll') { inScroller = true; break; }
            if (o === 'hidden' || o === 'clip') { inScroller = true; break; } // handled at that level
            p = p.parentElement;
          }
          if (inScroller) continue;
          const pos = getComputedStyle(d).position;
          if (pos === 'fixed') continue;
          const dr = d.getBoundingClientRect();
          if (dr.right > er.right + 3 || dr.left < er.left - 3) {
            const key = 'desc:' + desc(d);
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ kind: ox === 'hidden' || ox === 'clip' ? 'text-clipped' : 'element-overflow', detail: `${desc(d)} sticks out of ${desc(el)} by ${Math.round(Math.max(dr.right - er.right, er.left - dr.left))}px` });
          }
        }
      }

      // charts: recharts wrappers with zero size or no drawn marks
      document.querySelectorAll('.recharts-wrapper').forEach((w) => {
        const r = w.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) out.push({ kind: 'chart-empty', detail: `recharts wrapper ${Math.round(r.width)}x${Math.round(r.height)}` });
      });

      // real companies next to negative words (innermost elements that contain both)
      const neg = new RegExp(negative, 'i');
      const compRes = companies.map((c) => [c, c === 'RDS' || c === 'KPF' || c === 'AECOM' ? new RegExp('\\b' + c + '\\b') : new RegExp('\\b' + c.replace(/ /g, '\\s+') + '\\b', 'i')]);
      const hits = [];
      for (const el of all) {
        if (!visible(el)) continue;
        const t = el.innerText;
        if (!t || t.length > 260) continue;
        const comp = compRes.find(([, re]) => re.test(t));
        if (!comp) continue;
        const nm = t.match(neg);
        if (!nm) continue;
        hits.push({ el, t, comp: comp[0], word: nm[0] });
      }
      const inner = hits.filter((h) => !hits.some((o) => o !== h && h.el.contains(o.el)));
      const dedupe = new Set();
      for (const h of inner) {
        const t = h.t.replace(/\s+/g, ' ').trim();
        if (dedupe.has(t)) continue;
        dedupe.add(t);
        out.push({ kind: 'real-company-negative', detail: `[${h.comp} + "${h.word}"] ${t.slice(0, 220)}` });
      }
      return out;
    },
    { companies: REAL_COMPANIES, negative: NEGATIVE },
  );
}

export async function mainText(page) {
  return page.evaluate(() => (document.getElementById('main-scroll') ?? document.body).innerText);
}
