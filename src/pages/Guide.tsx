import { BookOpen, ExternalLink, Keyboard, ListChecks, PlayCircle, RotateCcw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { Button, Card, CardHeader, PageHeader, Pill } from '../components/ui';
import { ASSISTANT_NOTE, BEFORE_THE_CALL, PAGE_NOTES, SHORTCUTS, TOUR, TOUR_TARGET_SECS } from '../presenter/notes';
import { NoteBody } from '../presenter/NotesDrawer';

const mins = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Guide() {
  const setDemo = useStore((s) => s.setDemo);
  const setAssistantOpen = useStore((s) => s.setAssistantOpen);
  const [openNote, setOpenNote] = useState<string | null>('/command');
  const notes = [...PAGE_NOTES.filter((n) => n.route !== '/guide'), ASSISTANT_NOTE];

  const reset = () => {
    // State lives in memory: a reload restores the seed story (you stay signed in).
    const base = window.location.href.split('#')[0];
    window.location.href = `${base}#/command`;
    window.location.reload();
  };
  const secondScreen = () => {
    const base = window.location.href.split('#')[0];
    window.open(`${base}#/guide`, 'capcon-presenter', 'width=760,height=900');
  };

  let cum = 0;
  return (
    <div>
      <PageHeader
        eyebrow="Presenter"
        title="Presenter guide"
        subtitle={`Your run sheet for the call: ${TOUR.length} steps in 9 chapters, about ${Math.round(TOUR_TARGET_SECS / 60)} minutes. Notes for any page are one key away: press N.`}
        actions={
          <>
            <Button icon={<ExternalLink size={15} />} onClick={secondScreen} title="Open this guide in its own window for a second screen">
              Open on second screen
            </Button>
            <Button icon={<RotateCcw size={15} />} onClick={reset} title="Reload the seed story: Clonee uncovered, Thurrock in draft">
              Reset demo
            </Button>
            <Button variant="primary" icon={<PlayCircle size={15} />} onClick={() => setDemo({ active: true, step: 0 })}>
              Start walkthrough
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Run sheet" subtitle="Click a step to jump straight to it in the walkthrough" icon={<ListChecks size={15} />} />
          <div className="space-y-1">
            {TOUR.map((s, i) => {
              cum += s.secs;
              const newChapter = i === 0 || TOUR[i - 1].chapter !== s.chapter;
              return (
                <div key={i}>
                  {newChapter && (
                    <div className="mb-1 mt-3 flex items-center gap-2 first:mt-0">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white dark:text-[#06101e]">{s.chapter}</span>
                      <span className="text-[13px] font-semibold text-ink">{s.chapterTitle}</span>
                      <span className="text-[11.5px] text-ink-3">{s.route}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setDemo({ active: true, step: i })}
                    className="group grid w-full grid-cols-[1fr_auto] gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-sunk"
                  >
                    <div className="min-w-0 pl-8">
                      <div className="text-[13px] font-medium text-ink group-hover:text-brand">{s.title}</div>
                      <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">“{s.say}”</div>
                      <div className="mt-0.5 text-[12px] leading-snug text-ink-3">
                        <span className="font-medium text-brand-2">Do: </span>
                        {s.do}
                      </div>
                    </div>
                    <div className="text-right text-[11.5px] text-ink-3 tnum">
                      <div>{s.secs}s</div>
                      <div className="text-ink-3/70">by {mins(cum)}</div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Before the call" icon={<ListChecks size={15} />} />
            <ol className="space-y-2">
              {BEFORE_THE_CALL.map((t, i) => (
                <li key={t} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <CardHeader title="Keyboard" icon={<Keyboard size={15} />} />
            <div className="space-y-1.5">
              {SHORTCUTS.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-ink-2">{v}</span>
                  <kbd className="whitespace-nowrap rounded-md bg-sunk px-2 py-0.5 text-[11.5px] font-medium text-ink">{k}</kbd>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Scripted questions for Ask Capcon" subtitle="These always work, and so do close variants" icon={<Sparkles size={15} />} />
            <div className="flex flex-wrap gap-1.5">
              {[
                'Where are we on Dexcom?',
                'Which sites have nobody on them tomorrow?',
                'What applications for payment are over 60 days?',
                "Which tenders close this week and who's pricing them?",
                'Whose IPAF expires this month?',
                'How many metres did we install in the UK last week?',
                "What's our margin on pharma jobs this year?",
                'Which maintenance contracts renew in the next 90 days?',
                "What's blocking NLHPP?",
                'Draft an update email to John Paul Construction on Dexcom.',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setAssistantOpen(true);
                    window.setTimeout(() => window.dispatchEvent(new CustomEvent('capcon:ask', { detail: q })), 250);
                  }}
                  className="rounded-full bg-brand-soft px-2.5 py-1 text-left text-[12px] font-medium text-brand hover:brightness-95"
                >
                  {q}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <h2 className="mb-3 mt-8 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3">
        <BookOpen size={14} /> How each part works
      </h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {notes.map((n) => {
          const open = openNote === n.route;
          return (
            <Card key={n.route} padded={false} className={clsx('overflow-hidden', open && 'lg:col-span-2')}>
              <button onClick={() => setOpenNote(open ? null : n.route)} className="flex w-full items-start gap-3 px-5 py-4 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14.5px] font-semibold text-ink">{n.title}</span>
                    {!n.route.startsWith('#') && <Pill>{n.route}</Pill>}
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{n.oneLiner}</p>
                </div>
                <span className="mt-1 text-[12px] font-medium text-brand">{open ? 'Hide' : 'Show'}</span>
              </button>
              {open && (
                <div className="border-t hairline px-5 pb-5 pt-4">
                  <NoteBody note={n} compact />
                  {!n.route.startsWith('#') && (
                    <Link to={n.route === '/home' ? '/home/eugene' : n.route} className="mt-4 inline-flex text-[12.5px] font-medium text-brand hover:underline">
                      Open {n.title} →
                    </Link>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
