// Slow-moving brand gradient mesh with a very faint rainfall motif.
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'var(--c-bg)' }} />
      <div
        className="mesh-a absolute -left-[15%] -top-[25%] h-[75vh] w-[65vw] rounded-full blur-[90px]"
        style={{ background: 'radial-gradient(closest-side, var(--mesh-1), transparent)' }}
      />
      <div
        className="mesh-b absolute -right-[10%] top-[10%] h-[70vh] w-[55vw] rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(closest-side, var(--mesh-2), transparent)' }}
      />
      <div
        className="mesh-a absolute bottom-[-30%] left-[25%] h-[70vh] w-[60vw] rounded-full blur-[110px]"
        style={{ background: 'radial-gradient(closest-side, var(--mesh-3), transparent)', animationDelay: '-12s' }}
      />
      <div className="rainfall absolute inset-0 opacity-70" />
    </div>
  );
}
