'use client';
import { useMemo } from 'react';
import { TableFelt } from './TableFelt';
import { CommunityCards } from './CommunityCards';
import { Pot } from './Pot';
import { PlayerSeat } from './PlayerSeat';
import { BettingControls } from './BettingControls';
import { Chat } from './Chat';
import { HandHistory } from './HandHistory';
import { WinnerOverlay } from './WinnerOverlay';
import { CucuruchoOverlay } from './CucuruchoOverlay';
import type { RoomState, CardCode, ActionType } from '@/game/types';
import { getCallAmount } from '@/game/holdem';

interface Props {
  room: RoomState;
  myId: string;
  myCards: CardCode[];
  cucuruchoPayInActive: boolean;
  cucuruchoPayInAmount: number;
  onAction: (type: ActionType, amount?: number) => void;
  onSitDown: (seatIndex: number) => void;
  onStartGame: () => void;
  onSendChat: (text: string) => void;
  onCucuruchoDecision: (payIn: boolean) => void;
}

export function PokerTable({
  room, myId, myCards, cucuruchoPayInActive, cucuruchoPayInAmount,
  onAction, onSitDown, onStartGame, onSendChat, onCucuruchoDecision,
}: Props) {
  const { players, chatMessages } = room;
  const game = room.game;

  const seated = useMemo(() =>
    players.filter(p => p.seatIndex !== null),
    [players]
  );

  const me = players.find(p => p.id === myId);
  const isHost = room.hostId === myId;

  const isMyTurn = useMemo(() => {
    if (!game) return false;
    const seatedPlayers = players.filter(p => p.seatIndex !== null && p.status !== 'spectating' && p.isConnected);
    const curr = seatedPlayers[game.currentPlayerIndex];
    return curr?.id === myId;
  }, [game, players, myId]);

  const seats = useMemo(() =>
    Array.from({ length: room.maxSeats }, (_, i) => ({
      seatIndex: i,
      player: seated.find(p => p.seatIndex === i) ?? null,
    })),
    [room.maxSeats, seated]
  );

  const callAmount = me && game ? getCallAmount(me, game.bigBlind) : 0;
  const canCheck = me && game ? me.bet >= game.bigBlind : false;

  // Guard: if game state is not yet initialized, show a lobby screen
  if (!game) {
    return (
      <div className="relative w-full h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-[#c8a84b] text-xl font-bold animate-pulse">Aguardando estado do jogo...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#0d1117] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/50 z-30">
        <div className="text-[#c8a84b] font-bold text-sm">
          Mesa: <span className="font-mono">{room.code}</span>
          {game.mode === 'cucurucho' && <span className="ml-2 text-xs bg-yellow-600 text-black px-1 rounded">🐔 Cucurucho</span>}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-gray-400 text-xs">Mão #{game.handNumber}</span>
          {isHost && game.phase === 'waiting' && seated.length >= 2 && (
            <button
              onClick={onStartGame}
              className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
            >
              Iniciar Jogo
            </button>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Table */}
        <div className="flex-1 relative">
          <div className="absolute inset-4">
            <TableFelt>
              {/* Center content */}
              <div className="flex flex-col items-center gap-3">
                <CommunityCards cards={game.communityCards} />
                <Pot amount={game.pot} />
                {game.phase === 'waiting' && (
                  <div className="text-gray-400 text-sm">
                    {seated.length < 2 ? 'Aguardando jogadores...' : 'Aguardando host iniciar...'}
                  </div>
                )}
              </div>
            </TableFelt>
          </div>

          {/* Player seats */}
          {seats.map(({ seatIndex, player }) => (
            <PlayerSeat
              key={seatIndex}
              player={player}
              seatIndex={seatIndex}
              myCards={myCards}
              isMyTurn={isMyTurn && player?.id === myId}
              myId={myId}
              onSit={onSitDown}
            />
          ))}

          {/* Winner overlay */}
          {game.phase === 'result' && (
            <WinnerOverlay result={game.lastResult} />
          )}

          {/* Cucurucho pay-in overlay */}
          <CucuruchoOverlay
            active={cucuruchoPayInActive}
            amount={cucuruchoPayInAmount}
            onDecide={onCucuruchoDecision}
          />
        </div>

        {/* Sidebar */}
        <div className="w-64 flex flex-col gap-2 p-2 bg-black/30">
          <div className="flex-1 min-h-0">
            <Chat
              messages={chatMessages ?? []}
              onSend={onSendChat}
              myId={myId}
            />
          </div>
          <HandHistory actions={game.actionHistory ?? []} />

          {/* My stats */}
          {me && (
            <div className="bg-black/50 rounded-xl p-3 text-xs text-gray-400 border border-gray-700">
              <div className="text-[#c8a84b] font-bold mb-1">Suas estatísticas</div>
              <div>Fichas: <span className="text-white">{me.chips.toLocaleString('pt-BR')}</span></div>
              <div>Mãos: <span className="text-white">{me.stats.handsPlayed}</span></div>
              <div>Vitórias: <span className="text-white">{me.stats.handsWon}</span></div>
              {me.stats.handsPlayed > 0 && (
                <div>VPIP: <span className="text-white">
                  {Math.round((me.stats.vpipHands / me.stats.handsPlayed) * 100)}%
                </span></div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Betting controls - shown when it's my turn */}
      {isMyTurn && me && game.phase !== 'waiting' && game.phase !== 'result' && (
        <div className="p-3 bg-black/60 border-t border-gray-700 flex justify-center z-30">
          <BettingControls
            canCheck={canCheck}
            callAmount={callAmount}
            minRaise={game.minRaise ?? game.bigBlind * 2}
            myChips={me.chips}
            pot={game.pot}
            turnStartedAt={game.turnStartedAt ?? Date.now()}
            turnTimeLimit={game.turnTimeLimit ?? 30}
            onAction={onAction}
          />
        </div>
      )}
    </div>
  );
}
