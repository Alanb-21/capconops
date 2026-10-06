import { BookOpen, Lightbulb, MessageCircleQuestion, MessageSquareQuote, MousePointerClick, PlayCircle } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Button, Drawer } from '../components/ui';
import { ASSISTANT_NOTE, noteForPath, type PageNote } from './notes';

/** "How this works" notes for the current page. Opens with the Notes button or N. */
export function NotesDrawer() {
  const open = useStore((s) => s.notesOpen);
  const setOpen = useStore((s) => s.setNotesOpen);
  const assistantOpen = useStore((s) => s.assistantOpen);
  const setDemo = useStore((s) => s.setDemo);
  const loc = useLocation();
  const nav = useNavigate();
  const note = assistantOpen ? ASSISTANT_NOTE : noteForPath(loc.pathname);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N' || e.key === '?') {
        e.preventDefault();
        setOpen(!useStore.getState().notesOpen);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [setOpen]);

  return (
    <Drawer open={open} onClose={() => setOpen(false)} title={`How it works: ${note.title}`} subtitle="Presenter notes · press N to open or close" width={460}>
      <NoteBody note={note} />
      <div className="mt-6 flex flex-wrap gap-2 border-t hairline pt-4">
        <Button
          size="sm"
          variant="primary"
          icon={<PlayCircle size={14} />}
          onClick={() => {
            setOpen(false);
            setDemo({ active: true, step: 0 });
          }}
        >
          Start walkthrough
        </Button>
        <Button
          size="sm"
          icon={<BookOpen size={14} />}
          onClick={() => {
            setOpen(false);
            nav('/guide');
          }}
        >
          Full presenter guide
        </Button>
      </div>
    </Drawer>
  );
}

export function NoteBody({ note, compact }: { note: PageNote; compact?: boolean }) {
  return (
    <div className="space-y-5">
      <p className={compact ? 'text-[13px] text-ink-2' : 'text-[14px] leading-snug text-ink'}>{note.oneLiner}</p>
      <Section icon={<Lightbulb size={14} />} title="How it works" items={note.how} />
      <Section icon={<MousePointerClick size={14} />} title="Click this" items={note.click} />
      <Section icon={<MessageSquareQuote size={14} />} title="Say this" items={note.say} quote />
      {note.qa.length > 0 && (
        <div>
          <SectionTitle icon={<MessageCircleQuestion size={14} />} title="If they ask" />
          <div className="space-y-2">
            {note.qa.map((x) => (
              <div key={x.q} className="rounded-xl bg-sunk px-3 py-2">
                <div className="text-[12.5px] font-medium text-ink">“{x.q}”</div>
                <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{x.a}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-3">
      <span className="text-brand">{icon}</span>
      {title}
    </div>
  );
}

function Section({ icon, title, items, quote }: { icon: ReactNode; title: string; items: string[]; quote?: boolean }) {
  if (!items.length) return null;
  return (
    <div>
      <SectionTitle icon={icon} title={title} />
      <ul className="space-y-1.5">
        {items.map((t) => (
          <li key={t} className={quote ? 'border-l-2 border-[var(--c-brand)] pl-3 text-[13px] leading-snug text-ink' : 'flex gap-2 text-[13px] leading-snug text-ink-2'}>
            {!quote && <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--c-ink-3)]" />}
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
