// Optional Claude path for questions the local engine does not recognise.
// Calls the Vercel function at /api/assistant with a small slice of live data.
// Every failure (no function, no key, timeout, bad JSON) resolves to null so the
// caller silently uses the local fallback answer. Never throws, never logs.
import { dataSlice } from './engine';

const TIMEOUT_MS = 4000;

function enabled(): boolean {
  try {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return false;
    if (!window.location.protocol.startsWith('http')) return false; // file:// single-file build
    // Vite dev has no /api route; a 404 would show up as a console error, so only
    // call it in production builds, or in dev when explicitly switched on.
    if (import.meta.env.DEV) {
      try {
        return window.localStorage.getItem('capcon.claude') === '1';
      } catch {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function askClaude(question: string, history: { role: 'user' | 'assistant'; text: string }[]): Promise<string | null> {
  if (!enabled()) return null;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, history, data: dataSlice() }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    if (!(res.headers.get('content-type') ?? '').includes('application/json')) return null;
    const json: unknown = await res.json();
    if (!json || typeof json !== 'object') return null;
    const o = json as { text?: unknown; fallback?: unknown };
    if (o.fallback || typeof o.text !== 'string') return null;
    const text = o.text.trim();
    return text ? text : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
