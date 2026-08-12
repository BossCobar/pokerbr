'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HandResult, CardCode } from '@/game/types';
import { Card } from '@/components/cards/Card';

export function WinnerOverlay({ result }: { result: HandResult | null }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!result) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) { clearInterval(interval); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [result]);

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
        >
          <div
            className="rounded-2xl p-4 sm:p-6 text-center shadow-2xl max-w-[92vw] border border-[#c8a84b]/40"
            style={{
              background: 'linear-gradient(135deg, rgba(10,16,26,0.97) 0%, rgba(5,10,14,0.97) 100%)',
              boxShadow: '0 0 60px rgba(200,168,75,0.25), 0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            <div className="text-[#c8a84b] text-xl sm:text-2xl font-black mb-1">
              🏆 {result.winnerNickname}
            </div>
            {result.handName && (
              <div className="text-white text-base sm:text-lg font-semibold mb-1">{result.handName}</div>
            )}
            <div className="text-green-400 text-lg sm:text-2xl font-black mb-3">
              +{result.potWon.toLocaleString('pt-BR')} fichas
            </div>

            {result.handCards && result.handCards.length > 0 && (
              <div className="flex gap-1.5 justify-center mb-3">
                {(result.handCards as CardCode[]).map((c, i) => (
                  <Card key={c + i} card={c} delay={i * 0.06} size="sm" />
                ))}
              </div>
            )}

            {/* All hands at showdown */}
            {result.allHands && result.allHands.length > 1 && (
              <div className="border-t border-white/10 pt-3 mt-1">
                <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Mãos reveladas</div>
                <div className="flex flex-col gap-1.5">
                  {result.allHands.map(h => (
                    <div key={h.playerId} className="flex items-center justify-between gap-3 text-xs">
                      <span className={`font-bold truncate max-w-[80px] ${h.playerId === result.winnerId ? 'text-[#c8a84b]' : 'text-gray-400'}`}>
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

            {/* Countdown */}
            <div className="mt-3 text-gray-600 text-[11px] font-medium">
              {countdown > 0 ? `Próxima mão em ${countdown}s...` : 'Iniciando...'}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
