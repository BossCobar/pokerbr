'use client';
import { useMemo, useState } from 'react';
import { TableFelt } from './TableFelt';
import { CommunityCards } from './CommunityCards';
import { Pot } from './Pot';
import { PlayerSeat } from './PlayerSeat';
import { BettingControls } from './BettingControls';
import { HandStrength } from './HandStrength';
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
  onLeaveSeat: () => void;
  onStartGame: () => void;
  onSendChat: (text: string) => void;
  onCucuruchoDecision: (payIn: boolean) => void;
  onRequestRebuy: () => void;
}

const phaseLabel: Record<string, string> = {
  waiting: 'Aguardando', preflop: 'Pré-Flop', flop: 'Flop',
  turn: 'Turn', river: 'River', showdown: 'Showdown', result: 'Resultado',
};
const phaseColor: Record<string, string> = {
  waiting: 'text-gray-400', preflop: 'text-blue-400', flop: 'text-green-400',
  turn: 'text-yellow-400', river: 'text-orange-400', showdown: 'text-purple-400', result: 'text-[#c8a84b]',
};

export function PokerTable({
  room, myId, myCards, cucuruchoPayInActive, cucuruchoPayInAmount,
  onAction, onSitDown, onLeaveSeat, onStartGame, onSendChat, onCucuruchoDecision, onRequestRebuy,
}: Props) {
  const { players, chatMessages } = room;
  const game = room.game;
  const [copied, setCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const seated = useMemo(() =>
    players.filter(p => p.seatIndex !== null),
    [players]
  );

  const me = players.find(p => p.id === myId);
  const isHost = room.hostId === myId;
  const amSeated = me?.seatIndex !== null;

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

  const currentBet = game?.currentBet ?? 0;
  const callAmount = me && game ? getCallAmount(me, currentBet) : 0;
  const canCheck = me && game ? me.bet >= currentBet : false;

  function copyCode() {
    navigator.clipboard.writeText(room.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!game) {
    return (
      <div className="w-full h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-[#c8a84b] text-xl font-bold animate-pulse">Conectando à sala...</div>
      </div>
    );
  }

  const needsRebuy = me && me.chips <= 0 && room.config?.allowRebuy && game.phase === 'waiting';

  return (
    <div className="w-full h-[100dvh] bg-[#0a0f1a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 bg-[#0d1117]/90 border-b border-gray-800 z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg px-2 sm:px-3 py-1.5 transition-colors"
          >
            <span className="text-gray-400 text-xs hidden sm:inline">Sala:</span>
            <span className="text-[#c8a84b] font-mono font-bold text-sm tracking-widest">{room.code}</span>
            <span className="text-gray-600 text-xs">{copied ? '✓' : '⎘'}</span>
          </button>
          {game.mode === 'cucurucho' && (
            <span className="text-xs bg-yellow-600/20 border border-yellow-600/40 text-yellow-400 px-1.5 py-0.5 rounded-full font-semibold hidden sm:inline">
              🐔 Cucurucho
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className={`text-xs font-bold hidden sm:inline ${phaseColor[game.phase] ?? 'text-gray-400'}`}>
            {phaseLabel[game.phase] ?? game.phase}
          </span>
          {game.handNumber > 0 && (
            <span className="text-gray-600 text-xs hidden sm:inline">· #{game.handNumber}</span>
          )}
          <button
            onClick={() => setSoundOn(s => !s)}
            className="text-gray-600 hover:text-gray-400 text-lg transition-colors"
            title={soundOn ? 'Som ligado' : 'Som desligado'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          {amSeated && (
            <button
              onClick={onLeaveSeat}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 sm:px-3 py-1.5 rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">Sair do lugar</span>
              <span className="sm:hidden">↩</span>
            </button>
          )}
          {isHost && game.phase === 'waiting' && seated.length >= 2 && (
            <button
              onClick={onStartGame}
              className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-2 sm:px-4 py-1.5 rounded-lg transition-colors shadow-lg shadow-green-900/30"
            >
              <span className="hidden sm:inline">▶ Iniciar Jogo</span>
              <span className="sm:hidden">▶</span>
            </button>
          )}
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="md:hidden text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg p-1.5 transition-colors"
            aria-label="Menu"
          >
            💬
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Table area */}
        <div className="flex-1 relative min-w-0">
          {/* Felt */}
          <div className="absolute inset-1 sm:inset-2 md:inset-6">
            <TableFelt>
              <div className="flex flex-col items-center gap-1 sm:gap-2">
                {game.communityCards.length > 0 && (
                  <CommunityCards cards={game.communityCards} street={game.street} />
                )}
                <Pot amount={game.pot} />
                {game.phase === 'waiting' && (
                  <div className="text-gray-500 text-xs sm:text-sm font-medium text-center px-2">
                    {seated.length < 2
                      ? `Aguardando... (${seated.length}/${room.maxSeats})`
                      : isHost
                        ? 'Iniciar Jogo'
                        : 'Aguardando host...'
                    }
                  </div>
                )}
                {game.sidePots.length > 1 && (
                  <div className="flex gap-1 flex-wrap justify-center">
                    {game.sidePots.map((sp, i) => (
                      <div key={i} className="text-[10px] sm:text-xs bg-black/40 text-gray-400 rounded px-1.5 py-0.5">
                        Side {i + 1}: {sp.amount.toLocaleString('pt-BR')}
                      </div>
                    ))}
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
              totalSeats={room.maxSeats}
              myCards={myCards}
              isMyTurn={isMyTurn && player?.id === myId}
              myId={myId}
              isSeated={amSeated}
              onSit={onSitDown}
            />
          ))}

          {/* Winner overlay */}
          {game.phase === 'result' && <WinnerOverlay result={game.lastResult} />}

          {/* Cucurucho overlay */}
          <CucuruchoOverlay
            active={cucuruchoPayInActive}
            amount={cucuruchoPayInAmount}
            onDecide={onCucuruchoDecision}
          />
        </div>

        {/* Sidebar — desktop always visible, mobile overlay */}
        <>
          {/* Mobile backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar panel */}
          <div className={`
            fixed md:relative inset-y-0 right-0 z-50
            w-72 sm:w-80 md:w-60
            flex flex-col gap-2 p-2
            bg-[#0d1117] md:bg-[#0d1117]/60
            border-l border-gray-800
            transition-transform duration-300
            md:translate-x-0 md:flex md:flex-shrink-0
            ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          `}>
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden self-end text-gray-400 hover:text-white text-xl p-1"
            >
              ✕
            </button>

            <div className="flex-1 min-h-0">
              <Chat messages={chatMessages ?? []} onSend={onSendChat} myId={myId} />
            </div>

            <HandHistory actions={game.actionHistory ?? []} />

            {/* Stats + rebuy */}
            {me && (
              <div className="bg-black/40 rounded-xl p-3 text-xs border border-gray-800">
                <div className="text-[#c8a84b] font-bold mb-2">📊 {me.nickname}</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-400">
                  <div>Fichas: <span className="text-white font-semibold">{me.chips.toLocaleString('pt-BR')}</span></div>
                  <div>Mãos: <span className="text-white">{me.stats.handsPlayed}</span></div>
                  <div>Vitórias: <span className="text-white">{me.stats.handsWon}</span></div>
                  {me.stats.handsPlayed > 0 && (
                    <div>VPIP: <span className="text-white">{Math.round((me.stats.vpipHands / me.stats.handsPlayed) * 100)}%</span></div>
                  )}
                  {me.stats.totalWinnings > 0 && (
                    <div className="col-span-2">
                      Ganhos: <span className="text-green-400">+{me.stats.totalWinnings.toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>
                {needsRebuy && (
                  <button
                    onClick={onRequestRebuy}
                    className="w-full mt-2 py-1.5 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg text-xs transition-colors"
                  >
                    Rebuy ({room.config?.rebuyAmount?.toLocaleString('pt-BR') ?? ''} fichas)
                  </button>
                )}
              </div>
            )}

            {/* Players list */}
            <div className="bg-black/40 rounded-xl p-3 text-xs border border-gray-800">
              <div className="text-gray-500 font-bold mb-2 uppercase tracking-wider">Jogadores</div>
              <div className="space-y-1">
                {players.filter(p => p.seatIndex !== null).map(p => (
                  <div key={p.id} className="flex justify-between items-center">
                    <span className={`truncate max-w-[120px] ${p.id === myId ? 'text-[#c8a84b]' : 'text-gray-300'}`}>
                      {p.isDealer ? '🎯 ' : ''}{p.nickname}
                    </span>
                    <span className="text-gray-500">{p.chips.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
                {players.filter(p => p.seatIndex === null).length > 0 && (
                  <div className="text-gray-700 text-[10px] mt-1">
                    +{players.filter(p => p.seatIndex === null).length} espectador(es)
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      </div>

      {/* Hand strength display when not your turn (observing) */}
      {!isMyTurn && myCards.length >= 2 && me && game.phase !== 'waiting' && game.phase !== 'result' && (
        <div className="flex-shrink-0 px-2 pb-2 flex justify-center z-30">
          <HandStrength holeCards={myCards} communityCards={game.communityCards} />
        </div>
      )}

      {/* Betting controls */}
      {isMyTurn && me && game.phase !== 'waiting' && game.phase !== 'result' && (
        <div className="flex-shrink-0 p-2 sm:p-3 bg-[#0d1117]/90 border-t border-gray-800 flex flex-col items-center gap-2 z-30">
          {myCards.length >= 2 && (
            <HandStrength holeCards={myCards} communityCards={game.communityCards} />
          )}
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
