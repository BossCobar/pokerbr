'use client';
import { motion } from 'framer-motion';

interface Props { size?: 'sm' | 'md' | 'lg' | 'xl'; }

const sizes = {
  sm: { outer: 'w-9 h-13', inner: 'w-6 h-8' },
  md: { outer: 'w-12 h-17', inner: 'w-8 h-12' },
  lg: { outer: 'w-16 h-24', inner: 'w-10 h-16' },
  xl: { outer: 'w-20 h-28', inner: 'w-14 h-20' },
};

export function CardBack({ size = 'md' }: Props) {
  const s = sizes[size] ?? sizes.md;
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${s.outer} bg-gradient-to-br from-[#1a237e] via-[#283593] to-[#1565c0] rounded-lg shadow-xl border border-blue-400/30 flex items-center justify-center flex-shrink-0 overflow-hidden relative`}
      style={{ minWidth: size === 'sm' ? 36 : size === 'md' ? 48 : size === 'lg' ? 64 : 80 }}
    >
      {/* Diamond pattern */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 8px),
                           repeating-linear-gradient(-45deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 8px)`
        }}
      />
      <div className={`${s.inner} border border-blue-300/40 rounded flex items-center justify-center relative z-10`}>
        <span className="text-blue-200/60 text-xs font-bold">🃏</span>
      </div>
      {/* Gloss */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 rounded-lg pointer-events-none" />
    </motion.div>
  );
}
