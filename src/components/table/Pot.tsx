'use client';
import { motion, AnimatePresence } from 'framer-motion';

export function Pot({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={amount}
        initial={{ scale: 0.8, opacity: 0, y: -4 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex items-center gap-2 rounded-full px-4 py-1.5 font-black text-sm border border-[#c8a84b]/30 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(200,168,75,0.15) 0%, rgba(200,168,75,0.05) 100%)',
          color: '#f0c040',
          boxShadow: '0 0 20px rgba(200,168,75,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <span className="text-base">🪙</span>
        <span>Pote: {amount.toLocaleString('pt-BR')}</span>
      </motion.div>
    </AnimatePresence>
  );
}
