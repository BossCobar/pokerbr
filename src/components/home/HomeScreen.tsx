'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGame } from '@/lib/hooks/useGame';
import type { GameMode } from '@/game/types';

export function HomeScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinCode = searchParams?.get('join') ?? '';

  const [tab, setTab] = useState<'create' | 'join'>(joinCode ? 'join' : 'create');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState(joinCode);
  const [mode, setMode] = useState<GameMode>('holdem');
  const [bigBlind, setBigBlind] = useState(20);
  const [startingChips, setStartingChips] = useState(1000);
  const [maxSeats, setMaxSeats] = useState(6);
  const [asSpectator, setAsSpectator] = useState(false);

  const { createRoom, joinRoom, setNickname: saveNickname, setRoomCode, roomState } = useGame();

  useEffect(() => {
    if (roomState?.code) {
      router.push(`/room/${roomState.code}`);
    }
  }, [roomState?.code]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;
    saveNickname(nickname.trim());
    createRoom({ nickname: nickname.trim(), bigBlind, startingChips, maxSeats, mode, turnTimeLimit: 30 });
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim() || !code.trim()) return;
    saveNickname(nickname.trim());
    setRoomCode(code.trim().toUpperCase());
    joinRoom(code.trim().toUpperCase(), nickname.trim(), asSpectator);
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">♠️</div>
          <h1 className="text-4xl font-bold text-[#c8a84b] tracking-wider">PokerBR</h1>
          <p className="text-gray-500 text-sm mt-1">Poker entre amigos — fichas virtuais</p>
        </div>

        {/* Tabs */}
        <div className="flex mb-4 bg-black/40 rounded-xl p-1">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                tab === t ? 'bg-[#c8a84b] text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'create' ? 'Criar Mesa' : 'Entrar na Mesa'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="bg-black/40 rounded-2xl p-6 border border-gray-700 space-y-4">
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Apelido</label>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Seu apelido"
                maxLength={20}
                required
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 outline-none border border-gray-700 focus:border-[#c8a84b]"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Modo de Jogo</label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value as GameMode)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 outline-none border border-gray-700"
              >
                <option value="holdem">Texas Hold&apos;em</option>
                <option value="cucurucho">Cucurucho</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Big Blind</label>
                <input type="number" value={bigBlind} min={2} max={1000}
                  onChange={e => setBigBlind(Number(e.target.value))}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 py-2 text-sm outline-none border border-gray-700" />
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Fichas iniciais</label>
                <input type="number" value={startingChips} min={100} max={100000}
                  onChange={e => setStartingChips(Number(e.target.value))}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 py-2 text-sm outline-none border border-gray-700" />
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Lugares</label>
                <input type="number" value={maxSeats} min={2} max={9}
                  onChange={e => setMaxSeats(Number(e.target.value))}
                  className="w-full bg-gray-800 text-white rounded-lg px-2 py-2 text-sm outline-none border border-gray-700" />
              </div>
            </div>
            <button type="submit"
              className="w-full py-3 bg-[#c8a84b] hover:bg-yellow-400 text-black font-bold rounded-xl text-lg transition-colors">
              Criar Mesa
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="bg-black/40 rounded-2xl p-6 border border-gray-700 space-y-4">
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Apelido</label>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Seu apelido"
                maxLength={20}
                required
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 outline-none border border-gray-700 focus:border-[#c8a84b]"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Código da Sala</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
                maxLength={6}
                required
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 outline-none border border-gray-700 focus:border-[#c8a84b] font-mono uppercase tracking-widest"
              />
            </div>
            <label className="flex items-center gap-2 text-gray-400 text-sm cursor-pointer">
              <input type="checkbox" checked={asSpectator}
                onChange={e => setAsSpectator(e.target.checked)}
                className="accent-yellow-400" />
              Entrar como espectador
            </label>
            <button type="submit"
              className="w-full py-3 bg-[#c8a84b] hover:bg-yellow-400 text-black font-bold rounded-xl text-lg transition-colors">
              Entrar na Mesa
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
