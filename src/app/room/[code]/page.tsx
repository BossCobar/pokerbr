'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useGame } from '@/lib/hooks/useGame';
import { PokerTable } from '@/components/table/PokerTable';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string ?? '').toUpperCase();

  const {
    roomState, myCards, nickname, roomCode,
    cucuruchoPayInActive, cucuruchoPayInAmount,
    joinRoom, sitDown, leaveSeat, startGame, sendAction,
    sendCucuruchoDecision, sendChat, requestRebuy, myId,
  } = useGame();

  useEffect(() => {
    if (!nickname) {
      router.push(`/?join=${code}`);
      return;
    }
    if (roomCode !== code) {
      joinRoom(code, nickname, false);
    }
  }, [code, nickname]);

  if (!roomState) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-[#c8a84b] text-xl font-bold animate-pulse">Conectando à sala...</div>
      </div>
    );
  }

  return (
    <PokerTable
      room={roomState}
      myId={myId ?? ''}
      myCards={myCards}
      cucuruchoPayInActive={cucuruchoPayInActive}
      cucuruchoPayInAmount={cucuruchoPayInAmount}
      onAction={sendAction}
      onSitDown={sitDown}
      onLeaveSeat={leaveSeat}
      onStartGame={startGame}
      onSendChat={sendChat}
      onCucuruchoDecision={sendCucuruchoDecision}
      onRequestRebuy={requestRebuy}
    />
  );
}
