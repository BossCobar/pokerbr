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

const lastActionColor: Record<string, string> = {
  'Fold': 'text-red-400',
  'Check': 'text-gray-400',
  'All-in': 'text-purple-400',
};

function getLastActionColor(action: string): string {
  if (action in lastActionColor) return lastActionColor[action];
  if (action.startsWith('Call')) return 'text-blue-400';
  if (action.startsWith('Raise')) return 'text-yellow-400';
  return 'text-gray-400';
}

export function PlayerSeat({ player, seatIndex, totalSeats, myCards, isMyTurn, myId, isSeated, onSit }: Props) {
  const style = getSeatStyle(seatIndex, totalSeats);
  const isMe = player?.id === myId;
  // Use own cards from myCards prop for me; use holeCards from room state for opponents (revealed at showdown)
  const cards = isMe ? myCards : (player?.holeCards ?? []);

  if (!player) {
    return (
      <div style={style} className="z-20">
        {!isSeated && (
          <button
            onClick={() => onSit(seatIndex)}
            className="w-12 h-10 sm:w-16 sm:h-14 rounded-xl border-2 border-dashed border-gray-700 text-gray-600 text-xs hover:border-[#c8a84b] hover:text-[#c8a84b] active:border-[#c8a84b] active:text-[#c8a84b] transition-all flex flex-col items-center justify-center bg-black/30 hover:bg-[#c8a84b]/5 touch-manipulation"
          >
            <span className="text-base sm:text-lg leading-none">+</span>
            <span className="text-[9px] sm:text-[10px]">Sentar</span>
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
          boxShadow: ['0 0 0px rgba(251,191,36,0)', '0 0 20px rgba(251,191,36,0.9)', '0 0 0px rgba(251,191,36,0)'],
        } : { boxShadow: '0 0 0px rgba(0,0,0,0)' }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className={`border-2 rounded-xl p-1 sm:p-2 text-center bg-black/80 backdrop-blur-sm ${borderClass}`}
        style={{ minWidth: '76px', maxWidth: '100px' }}
      >
        {/* Badges row */}
        <div className="flex justify-center gap-0.5 mb-0.5 text-[8px] font-bold flex-wrap items-center">
          {player.isDealer && (
            <span className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center font-black text-[9px] shadow-md flex-shrink-0">D</span>
          )}
          {player.isSB && <span className="bg-blue-600 text-white rounded-full px-1 leading-tight">SB</span>}
          {player.isBB && <span className="bg-red-600 text-white rounded-full px-1 leading-tight">BB</span>}
          {/* Show "Eu" only when no role badge is present, to avoid crowding */}
          {isMe && !player.isDealer && !player.isSB && !player.isBB && (
            <span className="text-[#c8a84b] font-black text-[8px]">★</span>
          )}
        </div>

        {/* Name */}
        <div className={`text-[10px] sm:text-xs font-bold truncate leading-tight px-0.5 ${isMe ? 'text-[#c8a84b]' : 'text-white'}`}>
          {player.nickname}
        </div>

        {/* Chips */}
        <div className="text-gray-300 text-[10px] font-semibold mt-0.5">
          {player.chips.toLocaleString('pt-BR')}
        </div>

        {/* Current bet chip */}
        {player.bet > 0 && (
          <div
            className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black mt-0.5"
            style={{ background: 'rgba(200,168,75,0.18)', color: '#f0c040', border: '1px solid rgba(200,168,75,0.3)' }}
          >
            🪙 {player.bet.toLocaleString('pt-BR')}
          </div>
        )}

        {/* Last action badge */}
        {player.lastAction && (
          <div className={`text-[8px] sm:text-[9px] font-semibold mt-0.5 ${getLastActionColor(player.lastAction)}`}>
            {player.lastAction}
          </div>
        )}

        {/* ALL-IN badge */}
        {player.status === 'allin' && (
          <div className="text-[9px] font-bold mt-0.5 bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 rounded px-1">
            ALL-IN
          </div>
        )}

        {/* Status text (fold only — allin has its own badge above) */}
        {player.status === 'folded' && (
          <div className="text-[8px] sm:text-[9px] font-bold mt-0.5 text-red-500">
            FOLD
          </div>
        )}
        {player.status === 'waiting' && (
          <div className="text-[8px] sm:text-[9px] text-gray-500 mt-0.5">
            Aguardando
          </div>
        )}

        {/* Cards */}
        <div className="flex gap-0.5 justify-center mt-0.5 sm:mt-1">
          {isMe && myCards.length > 0
            ? myCards.map((c, i) => <Card key={c} card={c} delay={i * 0.12} size="sm" />)
            : cards.length > 0
              ? cards.map((c, i) => <Card key={c} card={c} delay={i * 0.12} size="sm" />)
              : player.status !== 'waiting' && player.status !== 'spectating' && player.status !== 'folded' && !isMe
                ? [0, 1].map(i => <CardBack key={i} size="sm" />)
                : null
          }
        </div>
      </motion.div>
    </div>
  );
}
