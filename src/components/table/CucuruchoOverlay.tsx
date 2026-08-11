'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  active: boolean;
  amount: number;
  onDecide: (payIn: boolean) => void;
}

export function CucuruchoOverlay({ active, amount, onDecide }: Props) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.7 }}
            className="bg-[#0d1117] border-2 border-[#c8a84b] rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl"
          >
            <div className="text-4xl mb-3">🐔</div>
            <div className="text-[#c8a84b] text-2xl font-bold mb-2">Cucurucho!</div>
            <div className="text-white text-sm mb-1">Mão especial ativada!</div>
            <div className="text-gray-300 text-sm mb-4">
              Para continuar, pague o pote atual:
              <span className="text-[#c8a84b] font-bold ml-1">{amount.toLocaleString('pt-BR')} fichas</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onDecide(false)}
                className="flex-1 py-3 bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl"
              >
                Fold
              </button>
              <button
                onClick={() => onDecide(true)}
                className="flex-1 py-3 bg-[#c8a84b] hover:bg-yellow-400 text-black font-bold rounded-xl"
              >
                Pagar ({amount.toLocaleString('pt-BR')})
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
