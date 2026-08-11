'use client';
import { motion } from 'framer-motion';
import { Card } from '@/components/cards/Card';
import { CardBack } from '@/components/cards/CardBack';
import type { Player, CardCode } from '@/game/types';

interface Props {
  player: Player | null;
  seatIndex: number;
  myCards: CardCode[];
  isMyTurn: boolean;
  myId: string;
  onSit: (seatIndex: number) => void;
}

const seatPositions = [
  'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-16 right-8',
  'top-1/2 right-4 -translate-y-1/2',
  'top-16 right-8',
  'top-4 right-1/3',
  'top-4 left-1/2 -translate-x-1/2',
  'top-4 left-1/3',
  'top-16 left-8',
  'top-1/2 left-4 -translate-y-1/2',
  'bottom-16 left-8',
];

const statusLabel: Record<string, string> = {
  active: '', waiting: 'Aguardando', folded: 'Fold', allin: 'All-in', spectating: '', eliminated: 'Eliminado',
};
const statusColor: Record<string, string> = {
  active: 'border-green-400', waiting: 'border-gray-500', folded: 'border-red-800 opacity-60',
  allin: 'border-yellow-400', spectating: 'border-gray-700', eliminated: 'border-red-900 opacity-40',
};

export function PlayerSeat({ player, seatIndex, myCards, isMyTurn, myId, onSit }: Props) {
  const pos = seatPositions[seatIndex] ?? 'top-0 left-0';
  const isMe = player?.id === myId;
  const cards = isMe ? myCards : [];

  if (!player) {
    return (
      <div className={`absolute ${pos} z-20`}>
        <button
          onClick={() => onSit(seatIndex)}
          className="w-20 h-16 rounded-xl border-2 border-dashed border-gray-600 text-gray-500 text-xs hover:border-green-500 hover:text-green-400 transition-colors flex flex-col items-center justify-center"
        >
          <span>+</span>
          <span>Sentar</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`absolute ${pos} z-20`}>
      <motion.div
        animate={isMyTurn ? { boxShadow: ['0 0 0px #fbbf24', '0 0 20px #fbbf24', '0 0 0px #fbbf24'] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
        className={`border-2 rounded-xl p-2 min-w-[80px] text-center ${statusColor[player.status] ?? 'border-gray-600'} bg-black/70`}
      >
        <div className="text-xs font-bold text-white truncate max-w-[80px]">
          {player.nickname} {player.isDealer ? '🎯' : ''}{player.isSB ? 'SB' : ''}{player.isBB ? 'BB' : ''}
        </div>
        <div className="text-[#c8a84b] text-xs font-semibold">{player.chips.toLocaleString('pt-BR')}</div>
        {player.bet > 0 && (
          <div className="text-yellow-300 text-xs">Aposta: {player.bet.toLocaleString('pt-BR')}</div>
        )}
        {statusLabel[player.status] && (
          <div className="text-gray-400 text-xs">{statusLabel[player.status]}</div>
        )}
        <div className="flex gap-1 justify-center mt-1">
          {isMe
            ? cards.map((c, i) => <Card key={c} card={c} delay={i * 0.1} size="sm" />)
            : player.holeCards.length > 0
              ? [0, 1].map(i => <CardBack key={i} size="sm" />)
              : null
          }
        </div>
      </motion.div>
    </div>
  );
}
