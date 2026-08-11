'use client';
import { motion } from 'framer-motion';
import { Card } from '@/components/cards/Card';
import { CardBack } from '@/components/cards/CardBack';
import type { Player, CardCode } from '@/game/types';

interface Props {
  player: Player | null;
  seatIndex: number;
  totalSeats: number;
  myCards: CardCode[];
  isMyTurn: boolean;
  myId: string;
  isSeated: boolean;
  onSit: (seatIndex: number) => void;
}

function getSeatStyle(index: number, total: number): React.CSSProperties {
  // Ellipse: bottom center is seat 0, going clockwise
  const startAngle = Math.PI / 2; // bottom
  const angle = startAngle - (index / total) * 2 * Math.PI;
  const rx = 42; // horizontal radius %
  const ry = 38; // vertical radius %
  const cx = 50;
  const cy = 50;
  const x = cx + rx * Math.cos(angle);
  const y = cy - ry * Math.sin(angle);
  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
  };
}

const statusBorder: Record<string, string> = {
  active: 'border-green-500',
  waiting: 'border-gray-600',
  folded: 'border-red-900',
  allin: 'border-yellow-400',
  spectating: 'border-gray-800',
  'sitting-out': 'border-gray-700',
};

const statusText: Record<string, string> = {
  waiting: 'Aguardando',
  folded: 'FOLD',
  allin: 'ALL-IN',
  'sitting-out': 'Ausente',
};

export function PlayerSeat({ player, seatIndex, totalSeats, myCards, isMyTurn, myId, isSeated, onSit }: Props) {
  const style = getSeatStyle(seatIndex, totalSeats);
  const isMe = player?.id === myId;
  const cards = isMe ? myCards : [];

  if (!player) {
    return (
      <div style={style} className="z-20">
        {!isSeated && (
          <button
            onClick={() => onSit(seatIndex)}
            className="w-16 h-14 rounded-xl border-2 border-dashed border-gray-700 text-gray-600 text-xs hover:border-[#c8a84b] hover:text-[#c8a84b] transition-all flex flex-col items-center justify-center bg-black/30 hover:bg-[#c8a84b]/5"
          >
            <span className="text-lg leading-none">+</span>
            <span className="text-[10px]">Sentar</span>
          </button>
        )}
      </div>
    );
  }

  const borderClass = isMyTurn
    ? 'border-[#c8a84b]'
    : (statusBorder[player.status] ?? 'border-gray-600');

  const opacity = player.status === 'folded' ? 'opacity-50' : '';

  return (
    <div style={style} className={`z-20 ${opacity}`}>
      <motion.div
        animate={isMyTurn ? {
          boxShadow: ['0 0 0px rgba(251,191,36,0)', '0 0 16px rgba(251,191,36,0.8)', '0 0 0px rgba(251,191,36,0)'],
        } : { boxShadow: '0 0 0px rgba(0,0,0,0)' }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className={`border-2 rounded-xl p-2 text-center bg-black/80 backdrop-blur-sm ${borderClass} min-w-[88px] max-w-[100px]`}
      >
        {/* Badges row */}
        <div className="flex justify-center gap-0.5 mb-0.5 text-[9px] font-bold">
          {player.isDealer && <span className="bg-white text-black rounded px-1">D</span>}
          {player.isSB && <span className="bg-blue-500 text-white rounded px-1">SB</span>}
          {player.isBB && <span className="bg-red-500 text-white rounded px-1">BB</span>}
          {isMe && <span className="bg-[#c8a84b] text-black rounded px-1">Você</span>}
        </div>

        {/* Name */}
        <div className="text-white text-xs font-bold truncate leading-tight px-1">
          {player.nickname}
        </div>

        {/* Chips */}
        <div className="text-[#c8a84b] text-xs font-semibold mt-0.5">
          {player.chips.toLocaleString('pt-BR')}
        </div>

        {/* Current bet */}
        {player.bet > 0 && (
          <div className="text-yellow-300 text-[10px] font-medium">
            🪙 {player.bet.toLocaleString('pt-BR')}
          </div>
        )}

        {/* Status */}
        {statusText[player.status] && (
          <div className={`text-[9px] font-bold mt-0.5 ${player.status === 'allin' ? 'text-yellow-400' : player.status === 'folded' ? 'text-red-500' : 'text-gray-400'}`}>
            {statusText[player.status]}
          </div>
        )}

        {/* Cards */}
        <div className="flex gap-0.5 justify-center mt-1">
          {isMe && cards.length > 0
            ? cards.map((c, i) => <Card key={c} card={c} delay={i * 0.12} size="sm" />)
            : player.status !== 'waiting' && player.status !== 'spectating' && !isMe && player.holeCards.length > 0
              ? [0, 1].map(i => <CardBack key={i} size="sm" />)
              : null
          }
        </div>
      </motion.div>
    </div>
  );
}
