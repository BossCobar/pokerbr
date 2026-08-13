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
    roomState, myCards, nickname,
    cucuruchoPayInActive, cucuruchoPayInAmount,
    joinRoom, sitDown, leaveSeat, sendAction,
    sendCucuruchoDecision, sendChat, requestRebuy, myId,
  } = useGame();

  useEffect(() => {
    if (!nickname) {
      router.push(`/?join=${code}`);
      return;
    }
    // Always emit join-room on mount — server addPlayer is idempotent,
    // this ensures socket room membership is current even if the host
    // navigated here after create-room without an explicit join.
    joinRoom(code, nickname, false);
  }, [code]);

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
      onSendChat={sendChat}
      onCucuruchoDecision={sendCucuruchoDecision}
      onRequestRebuy={requestRebuy}
    />
  );
}
