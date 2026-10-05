import { motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Background } from './Background';
import { CapconLogo } from './CapconLogo';
import { Avatar } from '../ui';

// Cosmetic sign-in: one click passes. No credentials are collected.
export function SignIn() {
  const signIn = useStore((s) => s.signIn);
  return (
    <div className="grid h-full place-items-center px-4">
      <Background />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong w-full max-w-[420px] rounded-[28px] px-8 py-9 text-center"
      >
        <div className="flex justify-center">
          <CapconLogo />
        </div>
        <div className="mt-6 text-[26px] font-semibold tracking-[-0.025em] text-ink">
          Capcon <span className="text-brand">OS</span>
        </div>
        <p className="mt-1 text-[13.5px] text-ink-3">Operations platform · Ireland · UK · Asia</p>
        <button
          onClick={signIn}
          autoFocus
          className="glass mt-8 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:-translate-y-0.5"
          data-testid="sign-in"
        >
          <Avatar name="Donnacha Tobin" size={40} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-ink">Donnacha Tobin</div>
            <div className="text-[12px] text-ink-3">Operations Director</div>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white dark:text-[#06101e]">
            <ArrowRight size={17} />
          </span>
        </button>
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-3">
          <Lock size={12} /> Single sign-on with Microsoft 365 (demo)
        </div>
        <div className="mt-7 text-[11px] text-ink-3">Demo environment · illustrative data · Built by MTMN Digital</div>
      </motion.div>
    </div>
  );
}
