'use client';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TableFelt } from './TableFelt';
import { CommunityCards } from './CommunityCards';
import { Pot } from './Pot';
import { PlayerSeat } from './PlayerSeat';
import { BettingControls } from './BettingControls';
import { HandStrength } from './HandStrength';
import { Card } from '@/components/cards/Card';
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
  waiting: '#6b7280', preflop: '#60a5fa', flop: '#34d399',
  turn: '#facc15', river: '#fb923c', showdown: '#c084fc', result: '#c8a84b',
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

  const seated = useMemo(() => players.filter(p => p.seatIndex !== null), [players]);
  const me = players.find(p => p.id === myId);
  const isHost = room.hostId === myId;
  const amSeated = me?.seatIndex !== null;
  const inGame = game?.phase !== 'waiting' && game?.phase !== 'result';
  const showMyCards = amSeated && myCards.length === 2 && inGame;

  const isMyTurn = useMemo(() => {
    if (!game) return false;
    const sp = players.filter(p => p.seatIndex !== null && p.status !== 'spectating' && p.isConnected);
    return sp[game.currentPlayerIndex]?.id === myId;
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
  const needsRebuy = me && me.chips <= 0 && room.config?.allowRebuy && game?.phase === 'waiting';
  // Total chips at stake = collected pot + all current street bets (makes pot visible preflop too)
  const effectivePot = game ? game.pot + players.reduce((s, p) => s + p.bet, 0) : 0;

  function copyCode() {
    navigator.clipboard.writeText(room.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!game) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at center, #0d1f2d 0%, #050a0e 100%)' }}>
        <div className="text-[#c8a84b] text-xl font-bold animate-pulse">Conectando à sala...</div>
      </div>
    );
  }

  const phaseC = phaseColor[game.phase] ?? '#6b7280';

  return (
    <div data-phase={game.phase} className="w-full h-[100dvh] flex flex-col overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 30%, #0a1628 0%, #050a0e 100%)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 z-30 flex-shrink-0 border-b border-white/5" style={{ background: 'rgba(5,10,14,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2">
          {/* Room code pill */}
          <button onClick={copyCode} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors border border-[#c8a84b]/20 hover:border-[#c8a84b]/50" style={{ background: 'rgba(200,168,75,0.08)' }}>
            <span className="text-gray-500 text-[10px] uppercase tracking-widest hidden sm:inline">Sala</span>
            <span className="text-[#c8a84b] font-mono font-black text-sm tracking-[0.2em]">{room.code}</span>
            <span className="text-gray-600 text-xs">{copied ? '✓' : '⎘'}</span>
          </button>

          {/* Phase pill */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 border text-xs font-bold" style={{ borderColor: `${phaseC}40`, background: `${phaseC}12`, color: phaseC }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: phaseC }} />
            {phaseLabel[game.phase] ?? game.phase}
            {game.handNumber > 0 && <span className="opacity-50">#{game.handNumber}</span>}
          </div>

          {game.mode === 'cucurucho' && (
            <span className="text-xs bg-yellow-600/10 border border-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded-full font-bold hidden sm:inline">🐔 Cucurucho</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setSoundOn(s => !s)} className="text-gray-600 hover:text-gray-300 text-base transition-colors p-1" title={soundOn ? 'Som ligado' : 'Mudo'}>
            {soundOn ? '🔊' : '🔇'}
          </button>
          {amSeated && (
            <button onClick={onLeaveSeat} className="text-[10px] sm:text-xs border border-gray-700 hover:border-gray-500 text-gray-500 hover:text-white px-2 py-1.5 rounded-lg transition-colors">
              <span className="hidden sm:inline">Sair do lugar</span>
              <span className="sm:hidden">↩</span>
            </button>
          )}
          {isHost && game.phase === 'waiting' && seated.length >= 2 && (
            <button onClick={onStartGame} className="text-xs font-black px-3 py-1.5 rounded-lg transition-all shadow-lg" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 0 16px rgba(22,163,74,0.4)' }}>
              ▶ Iniciar
            </button>
          )}
          <button onClick={() => setSidebarOpen(o => !o)} className="md:hidden text-gray-500 hover:text-white border border-gray-700 rounded-lg p-1.5 transition-colors">
            💬
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex flex-1 min-h-0 relative">

        {/* Table area */}
        <div className="flex-1 relative min-w-0">
          {/* Felt */}
          <div className="absolute inset-1 sm:inset-3 md:inset-5">
            <TableFelt>
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                {game.communityCards.length > 0 && (
                  <CommunityCards cards={game.communityCards} street={game.street} />
                )}
                <Pot amount={effectivePot} />
                {game.phase === 'waiting' && (
                  <div className="text-gray-600 text-xs sm:text-sm text-center px-2 font-medium">
                    {seated.length < 2
                      ? `Aguardando jogadores... (${seated.length}/${room.maxSeats})`
                      : isHost ? 'Clique em Iniciar para começar' : 'Aguardando o host...'
                    }
                  </div>
                )}
                {game.sidePots.length > 1 && (
                  <div className="flex gap-1 flex-wrap justify-center">
                    {game.sidePots.map((sp, i) => (
                      <div key={i} className="text-[10px] bg-black/50 text-gray-500 rounded px-1.5 py-0.5 border border-gray-700/50">
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
          <CucuruchoOverlay active={cucuruchoPayInActive} amount={cucuruchoPayInAmount} onDecide={onCucuruchoDecision} />
        </div>

        {/* ── Sidebar ── */}
        {sidebarOpen && <div className="fixed inset-0 bg-black/70 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
        <div className={`
          fixed md:relative inset-y-0 right-0 z-50 w-72 sm:w-80 md:w-56
          flex flex-col gap-2 p-2
          border-l border-white/5
          transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `} style={{ background: 'rgba(5,10,14,0.97)' }}>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden self-end text-gray-500 hover:text-white text-xl p-1">✕</button>

          <div className="flex-1 min-h-0">
            <Chat messages={chatMessages ?? []} onSend={onSendChat} myId={myId} />
          </div>
          <HandHistory actions={game.actionHistory ?? []} />

          {me && (
            <div className="rounded-xl p-3 text-xs border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-[#c8a84b] font-bold mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {me.nickname}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-500">
                <div>Fichas: <span className="text-white font-bold">{me.chips.toLocaleString('pt-BR')}</span></div>
                <div>Mãos: <span className="text-white">{me.stats.handsPlayed}</span></div>
                <div>Wins: <span className="text-green-400">{me.stats.handsWon}</span></div>
                {me.stats.handsPlayed > 0 && (
                  <div>VPIP: <span className="text-white">{Math.round((me.stats.vpipHands / me.stats.handsPlayed) * 100)}%</span></div>
                )}
                {me.stats.totalWinnings > 0 && (
                  <div className="col-span-2">Ganhos: <span className="text-green-400 font-bold">+{me.stats.totalWinnings.toLocaleString('pt-BR')}</span></div>
                )}
              </div>
              {needsRebuy && (
                <button onClick={onRequestRebuy} className="w-full mt-2 py-1.5 bg-green-700 hover:bg-green-600 text-white font-bold rounded-lg text-xs transition-colors">
                  Rebuy ({room.config?.rebuyAmount?.toLocaleString('pt-BR') ?? ''} fichas)
                </button>
              )}
            </div>
          )}

          <div className="rounded-xl p-3 text-xs border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="text-gray-600 font-bold mb-2 uppercase tracking-wider text-[10px]">Jogadores</div>
            <div className="space-y-1.5">
              {players.filter(p => p.seatIndex !== null).map(p => (
                <div key={p.id} className="flex justify-between items-center">
                  <span className={`truncate max-w-[110px] font-medium ${p.id === myId ? 'text-[#c8a84b]' : 'text-gray-400'}`}>
                    {p.isDealer ? '🎯 ' : ''}{p.nickname}
                  </span>
                  <span className="text-gray-600 font-mono text-[10px]">{p.chips.toLocaleString('pt-BR')}</span>
                </div>
              ))}
              {players.filter(p => p.seatIndex === null).length > 0 && (
                <div className="text-gray-700 text-[10px] pt-1 border-t border-gray-800">
                  👁 {players.filter(p => p.seatIndex === null).length} espectador(es)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile: large card panel ── */}
      <AnimatePresence>
        {showMyCards && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="md:hidden flex-shrink-0 px-4 py-2 flex items-center gap-4 border-t border-white/5"
            style={{ background: 'linear-gradient(to top, rgba(5,10,14,1) 0%, rgba(10,16,26,0.9) 100%)' }}
          >
            {/* Two large hole cards */}
            <div className="flex gap-2 flex-shrink-0">
              {myCards.map((c, i) => (
                <Card key={c} card={c} delay={i * 0.1} size="lg" />
              ))}
            </div>
            {/* Hand strength */}
            <div className="flex-1 min-w-0">
              <HandStrength holeCards={myCards} communityCards={game.communityCards} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop: hand strength below table when not your turn ── */}
      {!isMyTurn && showMyCards && (
        <div className="hidden md:flex flex-shrink-0 px-4 pb-2 justify-center">
          <div className="w-full max-w-sm">
            <HandStrength holeCards={myCards} communityCards={game.communityCards} />
          </div>
        </div>
      )}

      {/* ── Rebuy banner (prominent, all viewports) ── */}
      {needsRebuy && (
        <div className="flex-shrink-0 flex items-center justify-center gap-3 px-4 py-3 border-t border-orange-500/30 z-30"
          style={{ background: 'rgba(249,115,22,0.08)' }}>
          <div className="text-orange-400 text-sm font-bold">Você ficou sem fichas!</div>
          <button
            onClick={onRequestRebuy}
            className="px-4 py-1.5 rounded-lg font-black text-sm text-black transition-all active:scale-95 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 0 16px rgba(249,115,22,0.4)' }}
          >
            Rebuy · {room.config?.rebuyAmount?.toLocaleString('pt-BR')} fichas
          </button>
        </div>
      )}

      {/* ── "SUA VEZ" banner (mobile) ── */}
      <AnimatePresence>
        {isMyTurn && game.phase !== 'waiting' && game.phase !== 'result' && (
          <motion.div
            key="sua-vez"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden flex-shrink-0 flex items-center justify-center py-1.5 z-20 gap-2"
            style={{ background: 'rgba(200,168,75,0.08)', borderBottom: '1px solid rgba(200,168,75,0.2)' }}
          >
            <span className="w-2 h-2 rounded-full bg-[#c8a84b] animate-pulse" />
            <span className="text-[#c8a84b] text-xs font-black tracking-widest uppercase">Sua vez</span>
            <span className="w-2 h-2 rounded-full bg-[#c8a84b] animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Betting controls ── */}
      <AnimatePresence>
        {isMyTurn && me && game.phase !== 'waiting' && game.phase !== 'result' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex-shrink-0 px-2 sm:px-3 pt-1 pb-2 sm:pb-3 z-30 border-t border-white/5 flex flex-col items-center gap-2"
            style={{ background: 'rgba(5,10,14,0.95)', backdropFilter: 'blur(12px)' }}
          >
            {/* Desktop: hand strength inline with controls */}
            {showMyCards && (
              <div className="hidden md:block w-full max-w-lg">
                <HandStrength holeCards={myCards} communityCards={game.communityCards} />
              </div>
            )}
            <BettingControls
              canCheck={canCheck}
              callAmount={callAmount}
              minRaise={game.minRaise ?? game.bigBlind * 2}
              myChips={me.chips}
              pot={effectivePot}
              turnStartedAt={game.turnStartedAt ?? Date.now()}
              turnTimeLimit={game.turnTimeLimit ?? 30}
              onAction={onAction}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
