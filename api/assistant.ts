// Vercel serverless function (Node runtime): optional Claude answers for the
// Capcon Assistant. Only used for questions the in-app engine does not
// recognise. If ANTHROPIC_API_KEY is not set, or anything goes wrong, it
// returns 200 { fallback: true } and the client uses its local answer.

interface Req {
  method?: string;
  body?: unknown;
}
interface Res {
  status: (code: number) => Res;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
}

const MODEL = 'claude-sonnet-5-5';

const SYSTEM = `You are Ask Capcon, the assistant inside Capcon OS, the operations platform of Capcon Engineering Ltd: an Irish siphonic and gravity rainwater drainage specialist headquartered in Maynooth, Co. Kildare, with offices in the UK, Singapore and Malaysia. Capcon designs, prefabricates (HDPE, stainless, aluminium spools), installs, commissions and maintains roof drainage on data centres, pharma plants, airports, stadiums, hospitals and warehouses.

You are answering a member of the Capcon leadership team. Rules:
- Use only the JSON data provided with the question. If the data does not answer it, say so plainly in one sentence and suggest a question you can answer (jobs, crews, valuations, tenders, tickets, metres installed, maintenance renewals).
- Irish/UK English (programme, metres, organisation). Calm, plain, specific. No hype.
- Keep it short: at most about 120 words. You may use **bold** and "- " bullet lines. No headings, no tables, no code.
- Never invent numbers, names, debts, disputes or delays. Never criticise a real, named company.`;

function clip(v: unknown, max: number): string {
  try {
    const s = typeof v === 'string' ? v : JSON.stringify(v ?? null);
    return s.length > max ? s.slice(0, max) : s;
  } catch {
    return '';
  }
}

export default async function handler(req: Req, res: Res) {
  const fallback = () => {
    try {
      res.status(200).json({ fallback: true });
    } catch {
      /* response already sent */
    }
  };
  try {
    res.setHeader('cache-control', 'no-store');
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
    const key = env.ANTHROPIC_API_KEY;
    if (req.method !== 'POST' || !key) return fallback();

    let body: Record<string, unknown> = {};
    if (typeof req.body === 'string') body = JSON.parse(req.body || '{}') as Record<string, unknown>;
    else if (req.body && typeof req.body === 'object') body = req.body as Record<string, unknown>;

    const question = clip(body.question, 600).trim();
    if (!question) return fallback();
    const data = clip(body.data, 12000);
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

    const messages: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const h of history) {
      if (!h || typeof h !== 'object') continue;
      const role = (h as { role?: unknown }).role === 'assistant' ? 'assistant' : 'user';
      const text = clip((h as { text?: unknown }).text, 1200).trim();
      if (!text) continue;
      // keep strict user/assistant alternation, starting with user
      if (!messages.length && role === 'assistant') continue;
      if (messages.length && messages[messages.length - 1].role === role) messages[messages.length - 1].content += `\n${text}`;
      else messages.push({ role, content: text });
    }
    const userTurn = `Live Capcon OS data (JSON):\n${data}\n\nQuestion: ${question}`;
    if (messages.length && messages[messages.length - 1].role === 'user') messages[messages.length - 1].content += `\n\n${userTurn}`;
    else messages.push({ role: 'user', content: userTurn });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3800);
    let r: Response;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 600,
          system: SYSTEM,
          messages,
        }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!r.ok) return fallback();
    const out = (await r.json()) as { stop_reason?: string; content?: { type?: string; text?: string }[] };
    if (out.stop_reason === 'refusal') return fallback();
    const text = (out.content ?? [])
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text as string)
      .join('')
      .trim();
    if (!text) return fallback();
    res.status(200).json({ text });
  } catch {
    fallback();
  }
}
