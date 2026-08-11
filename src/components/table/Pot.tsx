'use client';
import { motion, AnimatePresence } from 'framer-motion';

export function Pot({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <AnimatePresence>
      <motion.div
        key={amount}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2 bg-black/40 rounded-full px-4 py-1 text-[#c8a84b] font-bold text-sm shadow"
      >
        <span>🪙</span>
        <span>Pote: {amount.toLocaleString('pt-BR')}</span>
      </motion.div>
    </AnimatePresence>
  );
}
