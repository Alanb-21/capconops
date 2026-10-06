// Generates docs/PRESENTER_NOTES.md from src/presenter/notes.ts (single source).
import { writeFileSync } from 'node:fs';
import { ASSISTANT_NOTE, BEFORE_THE_CALL, PAGE_NOTES, SHORTCUTS, TOUR, TOUR_TARGET_SECS, type PageNote } from '../src/presenter/notes';

const L: string[] = [];
L.push('# Capcon OS: presenter notes', '');
L.push(`Generated from \`src/presenter/notes.ts\` (run \`npm run notes\`). The same content appears in the app: press **N** on any page, or open **Presenter guide** in the sidebar.`, '');
L.push('## Before the call', '');
BEFORE_THE_CALL.forEach((t, i) => L.push(`${i + 1}. ${t}`));
L.push('', '## Keyboard', '', '| Key | Does |', '|---|---|');
SHORTCUTS.forEach(([k, v]) => L.push(`| ${k} | ${v} |`));
L.push('', `## Run sheet (about ${Math.round(TOUR_TARGET_SECS / 60)} minutes)`, '', 'Press **Demo** in the top bar to start the walkthrough. It moves between pages for you and highlights what to point at.', '');
let ch = 0;
let cum = 0;
for (const s of TOUR) {
  cum += s.secs;
  if (s.chapter !== ch) {
    ch = s.chapter;
    L.push(`### ${s.chapter}. ${s.chapterTitle}  \`${s.route}\``, '');
  }
  L.push(`**${s.title}** (${s.secs}s, by ${Math.floor(cum / 60)}:${String(cum % 60).padStart(2, '0')})`, '');
  L.push(`- Say: “${s.say}”`, `- Do: ${s.do}`, `- How it works: ${s.how}`);
  if (s.ask) L.push(`- If asked “${s.ask.q}”: ${s.ask.a}`);
  L.push('');
}
L.push('## How each part works', '');
const one = (n: PageNote) => {
  L.push(`### ${n.title}${n.route.startsWith('/') ? `  \`${n.route}\`` : ''}`, '', n.oneLiner, '');
  if (n.how.length) L.push('**How it works**', '', ...n.how.map((x) => `- ${x}`), '');
  if (n.click.length) L.push('**Click this**', '', ...n.click.map((x) => `- ${x}`), '');
  if (n.say.length) L.push('**Say this**', '', ...n.say.map((x) => `> ${x}`), '');
  if (n.qa.length) L.push('**If they ask**', '', ...n.qa.map((x) => `- *“${x.q}”* ${x.a}`), '');
};
PAGE_NOTES.filter((n) => n.route !== '/guide').forEach(one);
one(ASSISTANT_NOTE);
writeFileSync('docs/PRESENTER_NOTES.md', L.join('\n'));
console.log('wrote docs/PRESENTER_NOTES.md', L.length, 'lines');
