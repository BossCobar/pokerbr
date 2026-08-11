'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { HandResult, CardCode } from '@/game/types';
import { Card } from '@/components/cards/Card';

export function WinnerOverlay({ result }: { result: HandResult | null }) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
        >
          <div className="bg-black/85 border-2 border-[#c8a84b] rounded-2xl p-6 text-center shadow-2xl">
            <div className="text-[#c8a84b] text-2xl font-bold mb-1">🏆 {result.winnerNickname}</div>
            {result.handName && (
              <div className="text-white text-lg mb-1">{result.handName}</div>
            )}
            <div className="text-green-400 text-xl font-bold mb-3">
              +{result.potWon.toLocaleString('pt-BR')} fichas
            </div>
            {result.handCards && result.handCards.length > 0 && (
              <div className="flex gap-1 justify-center">
                {(result.handCards as CardCode[]).map((c, i) => (
                  <Card key={c + i} card={c} delay={i * 0.05} size="sm" />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
