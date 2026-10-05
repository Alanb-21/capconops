import { motion } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';
import { roleById } from '../../data/people';
import { CapconLogo } from './CapconLogo';
import { NAV } from './nav';

export function Sidebar() {
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const toggle = useStore((s) => s.toggleSidebar);
  const role = useStore((s) => s.role);
  const pending = useStore((s) => s.approvals.filter((a) => a.status === 'Pending').length);
  const home = roleById(role).home;

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      className="glass relative z-20 m-3 mr-0 flex shrink-0 flex-col overflow-hidden rounded-[24px]"
    >
      <div className={clsx('flex h-16 items-center px-4', collapsed ? 'justify-center' : 'justify-between')}>
        <NavLink to={home} className="min-w-0" aria-label="Capcon OS home">
          <CapconLogo collapsed={collapsed} />
        </NavLink>
      </div>
      {!collapsed && (
        <div className="-mt-1 mb-2 px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3">
          Capcon <span className="text-brand">OS</span>
        </div>
      )}
      <nav className="scroll-thin flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
        {NAV.map((g) => (
          <div key={g.label} className="mb-2">
            {!collapsed && <div className="px-2.5 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-3/80">{g.label}</div>}
            {collapsed && <div className="mx-auto my-2 h-px w-6 bg-[var(--c-hairline)]" />}
            {g.items.filter((it) => !(it.to === '/home' && role === 'donnacha')).map((it) => {
              const to = it.to === '/home' ? home : it.to;
              const Icon = it.icon;
              return (
                <NavLink
                  key={it.to}
                  to={to}
                  title={collapsed ? it.label : undefined}
                  className={({ isActive }) =>
                    clsx(
                      'group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                      collapsed && 'justify-center',
                      isActive ? 'text-brand' : 'text-ink-2 hover:bg-sunk hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-brand-soft" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                      )}
                      <Icon size={18} className="relative shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                      {!collapsed && <span className="relative truncate">{it.label}</span>}
                      {it.to === '/agents' && pending > 0 && (
                        <span className={clsx('relative ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[10.5px] font-semibold text-white dark:text-[#06101e]', collapsed && 'absolute right-1 top-0.5 ml-0 h-4 min-w-4 text-[9px]')}>
                          {pending}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className={clsx('border-t hairline px-3 py-3', collapsed ? 'flex justify-center' : 'flex items-center justify-between')}>
        {!collapsed && <span className="pl-2 text-[11px] text-ink-3">Built by MTMN Digital</span>}
        <button onClick={toggle} className="rounded-lg p-1.5 text-ink-3 hover:bg-sunk hover:text-ink" aria-label="Collapse sidebar">
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>
    </motion.aside>
  );
}
