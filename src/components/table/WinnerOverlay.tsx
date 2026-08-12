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
          <div className="bg-black/90 border-2 border-[#c8a84b] rounded-2xl p-4 sm:p-6 text-center shadow-2xl max-w-[90vw]">
            <div className="text-[#c8a84b] text-xl sm:text-2xl font-bold mb-1">
              🏆 {result.winnerNickname}
            </div>
            {result.handName && (
              <div className="text-white text-base sm:text-lg mb-1">{result.handName}</div>
            )}
            <div className="text-green-400 text-lg sm:text-xl font-bold mb-3">
              +{result.potWon.toLocaleString('pt-BR')} fichas
            </div>
            {result.handCards && result.handCards.length > 0 && (
              <div className="flex gap-1 justify-center mb-3">
                {(result.handCards as CardCode[]).map((c, i) => (
                  <Card key={c + i} card={c} delay={i * 0.05} size="sm" />
                ))}
              </div>
            )}
            {/* Show all hands at showdown */}
            {result.allHands && result.allHands.length > 1 && (
              <div className="border-t border-gray-700 pt-3 mt-1">
                <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-2">Mãos reveladas</div>
                <div className="flex flex-col gap-1.5">
                  {result.allHands.map(h => (
                    <div key={h.playerId} className="flex items-center justify-between gap-3 text-xs">
                      <span className={`font-bold ${h.playerId === result.winnerId ? 'text-[#c8a84b]' : 'text-gray-400'}`}>
                        {h.playerId === result.winnerId ? '🏆 ' : ''}{h.nickname}
                      </span>
                      <div className="flex gap-0.5">
                        {h.cards.map((c, i) => (
                          <Card key={c + i} card={c} delay={i * 0.05} size="sm" />
                        ))}
                      </div>
                      <span className="text-gray-500 text-[10px] min-w-[60px] text-right">
                        {h.handName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
