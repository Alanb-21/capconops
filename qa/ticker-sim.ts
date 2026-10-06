// Simulates the agent activity ticker (Shell.tsx useAgentTicker) for N ticks and lists lines that put a
// real, public job/company next to negative wording. Run: npx -y tsx qa/ticker-sim.ts [ticks]
import { JOBS } from '../src/data/seed';
import { AGENTS } from '../src/data/agents';
const N = +(process.argv[2] ?? 400); // 400 ticks x 9 s = 60 min
const live = JOBS.filter((j) => j.stage === 'Install' && !j.showcase && !j.mainContractorPublic); // mirrors Shell.tsx
const neg = /(no update|not yet submitted|no crew|flagged|missing|chased|nudged|expires|late|delay|behind)/i;
const out: string[] = [];
let start = 0;
// the store clock starts at some minute; sample a wide range of starting points
for (let n = 0; n < N; n++) {
  const agent = AGENTS[n % AGENTS.length];
  const tpl = agent.logTemplates[Math.floor(n / AGENTS.length) % agent.logTemplates.length];
  const job = live[(n * 7) % live.length];
  if (!tpl.includes('{job}') && !tpl.includes('{mc}')) continue;
  const real = job.showcase || job.mainContractorPublic;
  const text = tpl.replace('{job}', job.shortName ?? job.name).replace('{mc}', job.mainContractor === 'Undisclosed' ? 'the main contractor' : job.mainContractor).replace('{m}', '20');
  if (real && neg.test(text)) out.push(`tick ${n} (~${Math.round((n * 9) / 60)} min): [${agent.name}] ${text}   (${job.id}, MC ${job.mainContractor})`);
}
console.log(`Install-stage jobs: ${live.length}; real/public among them: ${live.filter((j) => j.showcase || j.mainContractorPublic).map((j) => j.shortName ?? j.name).join(', ')}`);
console.log(out.join('\n') || 'none');
