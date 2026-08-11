'use client';
import { motion } from 'framer-motion';
import { parseCard } from '@/game/deck';
import type { CardCode } from '@/game/types';

const suitColor: Record<string, string> = {
  '♥': 'text-red-500', '♦': 'text-red-500',
  '♣': 'text-white',  '♠': 'text-white',
};

interface Props {
  card: CardCode;
  delay?: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'w-10 h-14 text-sm', md: 'w-14 h-20 text-base', lg: 'w-16 h-24 text-lg' };

export function Card({ card, delay = 0, size = 'md' }: Props) {
  const { display, symbol } = parseCard(card);
  return (
    <motion.div
      initial={{ rotateY: 180, opacity: 0, y: -20 }}
      animate={{ rotateY: 0, opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, type: 'spring' }}
      className={`${sizes[size]} relative bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col items-center justify-center font-bold select-none`}
    >
      <span className={`${suitColor[symbol]} leading-none`}>{display}</span>
      <span className={`${suitColor[symbol]} text-xl leading-none`}>{symbol}</span>
    </motion.div>
  );
}
