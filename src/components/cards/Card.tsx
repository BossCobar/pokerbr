'use client';
import { motion } from 'framer-motion';
import { parseCard } from '@/game/deck';
import type { CardCode } from '@/game/types';

const suitColor: Record<string, string> = {
  '♥': '#e53e3e', '♦': '#e53e3e',
  '♣': '#1a202c', '♠': '#1a202c',
};
const suitBg: Record<string, string> = {
  '♥': 'from-white to-red-50', '♦': 'from-white to-red-50',
  '♣': 'from-white to-gray-50', '♠': 'from-white to-gray-50',
};

interface Props {
  card: CardCode;
  delay?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm:  { outer: 'w-9 h-13',   rank: 'text-base', suit: 'text-lg',  corner: 'text-[9px]',  p: 'p-0.5' },
  md:  { outer: 'w-12 h-17',  rank: 'text-xl',   suit: 'text-2xl', corner: 'text-[10px]', p: 'p-1'   },
  lg:  { outer: 'w-16 h-24',  rank: 'text-3xl',  suit: 'text-3xl', corner: 'text-xs',     p: 'p-1.5' },
  xl:  { outer: 'w-20 h-28',  rank: 'text-4xl',  suit: 'text-4xl', corner: 'text-sm',     p: 'p-2'   },
};

export function Card({ card, delay = 0, size = 'md' }: Props) {
  const { display, symbol } = parseCard(card);
  const color = suitColor[symbol] ?? '#1a202c';
  const bg = suitBg[symbol] ?? 'from-white to-gray-50';
  const s = sizes[size] ?? sizes.md;

  return (
    <motion.div
      initial={{ rotateY: 180, opacity: 0, y: -16 }}
      animate={{ rotateY: 0, opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, type: 'spring', stiffness: 200, damping: 20 }}
      className={`${s.outer} relative bg-gradient-to-br ${bg} rounded-lg shadow-xl border border-gray-200/80 flex flex-col items-center justify-center font-black select-none overflow-hidden flex-shrink-0`}
      style={{ aspectRatio: '9/13', minWidth: size === 'sm' ? 36 : size === 'md' ? 48 : size === 'lg' ? 64 : 80 }}
    >
      {/* Corner top-left */}
      <div className={`absolute top-0.5 left-1 leading-none ${s.corner} font-black`} style={{ color }}>
        <div>{display}</div>
        <div>{symbol}</div>
      </div>

      {/* Center suit */}
      <div className={`${s.suit} leading-none select-none`} style={{ color }}>{symbol}</div>

      {/* Corner bottom-right (rotated) */}
      <div className={`absolute bottom-0.5 right-1 leading-none ${s.corner} font-black rotate-180`} style={{ color }}>
        <div>{display}</div>
        <div>{symbol}</div>
      </div>

      {/* Gloss overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none rounded-lg" />
    </motion.div>
  );
}
