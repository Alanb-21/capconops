import { useStore } from '../../store/useStore';

// Real logo files are picked up at build time if present in src/brand/
// (see src/brand/README.md). Otherwise a neutral typographic wordmark is shown;
// we do not redraw Capcon's artwork.
const files = import.meta.glob('../../brand/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const findLogo = (name: string) => Object.entries(files).find(([k]) => k.endsWith(name))?.[1];
const LOGO_DARK_TEXT = findLogo('capcon-logo-dark.svg');
const LOGO_WHITE_TEXT = findLogo('capcon-logo-white.svg');

export function CapconLogo({ collapsed }: { collapsed?: boolean }) {
  const theme = useStore((s) => s.theme);
  const src = theme === 'dark' ? LOGO_WHITE_TEXT : LOGO_DARK_TEXT;
  if (src && !collapsed) return <img src={src} alt="Capcon Engineering" className="h-8 w-auto max-w-[170px] object-contain" />;
  return <Wordmark collapsed={collapsed} />;
}

function Wordmark({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden className="shrink-0">
        <rect width="30" height="30" rx="8" fill="var(--c-brand)" />
        <path d="M15 6.5c3.4 4.3 5.6 7.4 5.6 10.2a5.6 5.6 0 1 1-11.2 0c0-2.8 2.2-5.9 5.6-10.2Z" fill="white" opacity="0.95" />
        <path d="M12.3 17.2a2.9 2.9 0 0 0 2.7 2.6" stroke="var(--c-brand)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
      {!collapsed && (
        <div className="leading-none">
          <div className="text-[15px] font-bold tracking-[0.14em] text-brand-ink">CAPCON</div>
          <div className="mt-0.5 text-[8.5px] font-semibold tracking-[0.32em] text-ink-3">ENGINEERING</div>
        </div>
      )}
    </div>
  );
}
