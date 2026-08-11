'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGame } from '@/lib/hooks/useGame';
import type { GameMode } from '@/game/types';

const CHIP_PRESETS = [500, 1000, 2000, 5000, 10000];
const BB_PRESETS = [10, 20, 50, 100, 200];
const TIME_PRESETS = [{ label: '15s', value: 15 }, { label: '30s', value: 30 }, { label: '60s', value: 60 }, { label: '∞', value: 0 }];

export function HomeScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinCode = searchParams?.get('join') ?? '';

  const [tab, setTab] = useState<'create' | 'join'>(joinCode ? 'join' : 'create');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState(joinCode);

  // Create settings
  const [mode, setMode] = useState<GameMode>('holdem');
  const [bigBlind, setBigBlind] = useState(20);
  const [startingChips, setStartingChips] = useState(1000);
  const [maxSeats, setMaxSeats] = useState(6);
  const [turnTimeLimit, setTurnTimeLimit] = useState(30);
  const [allowRebuy, setAllowRebuy] = useState(false);
  const [rebuyAmount, setRebuyAmount] = useState(1000);
  const [cucuruchoAnteMultiplier, setCucuruchoAnteMultiplier] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Join settings
  const [asSpectator, setAsSpectator] = useState(false);

  const { createRoom, joinRoom, setNickname: saveNickname, setRoomCode, roomState } = useGame();

  useEffect(() => {
    if (roomState?.code) router.push(`/room/${roomState.code}`);
  }, [roomState?.code]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;
    saveNickname(nickname.trim());
    createRoom({
      nickname: nickname.trim(), bigBlind, startingChips, maxSeats, mode, turnTimeLimit,
      cucuruchoAnteMultiplier, allowRebuy, rebuyAmount,
    });
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim() || !code.trim()) return;
    saveNickname(nickname.trim());
    setRoomCode(code.trim().toUpperCase());
    joinRoom(code.trim().toUpperCase(), nickname.trim(), asSpectator);
  }

  const smallBlind = Math.floor(bigBlind / 2);

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute top-10 left-10 text-gray-800 text-8xl opacity-20 rotate-12">♠</div>
        <div className="absolute top-20 right-16 text-gray-800 text-6xl opacity-15 -rotate-6">♥</div>
        <div className="absolute bottom-16 left-16 text-gray-800 text-7xl opacity-15 rotate-6">♣</div>
        <div className="absolute bottom-10 right-10 text-gray-800 text-8xl opacity-20 -rotate-12">♦</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#c8a84b]/5 blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-5xl sm:text-7xl mb-2 sm:mb-3 drop-shadow-2xl">🃏</div>
          <h1 className="text-4xl sm:text-5xl font-black text-[#c8a84b] tracking-wider drop-shadow-lg">PokerBR</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-2 tracking-wide">Texas Hold&apos;em &amp; Cucurucho · Fichas Virtuais</p>
        </div>

        {/* Nickname (shared) */}
        <div className="mb-4">
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="Seu apelido de jogador"
            maxLength={20}
            required
            className="w-full bg-[#161b27] text-white rounded-xl px-4 py-3.5 outline-none border border-gray-700 focus:border-[#c8a84b] transition-colors text-center text-lg font-semibold placeholder:text-gray-600"
          />
        </div>

        {/* Tabs */}
        <div className="flex mb-4 bg-[#0d1117]/80 rounded-xl p-1 border border-gray-800">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                tab === t
                  ? 'bg-[#c8a84b] text-black shadow-lg shadow-yellow-900/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'create' ? '🎯 Criar Mesa' : '🚪 Entrar na Mesa'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="bg-[#161b27] rounded-2xl p-6 border border-gray-700/50 space-y-5">

            {/* Game Mode */}
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2 font-semibold">Modo de Jogo</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'holdem', label: "Texas Hold'em", icon: '🃏', desc: 'Clássico sem modificações' },
                  { value: 'cucurucho', label: 'Cucurucho', icon: '🐔', desc: 'Mão especial: pague o pote!' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMode(opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      mode === opt.value
                        ? 'border-[#c8a84b] bg-[#c8a84b]/10'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-lg mb-0.5">{opt.icon}</div>
                    <div className="text-white text-sm font-bold">{opt.label}</div>
                    <div className="text-gray-500 text-xs">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cucurucho settings */}
            {mode === 'cucurucho' && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4">
                <div className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-3">🐔 Configurações do Cucurucho</div>
                <div className="text-gray-400 text-xs mb-3 leading-relaxed">
                  Quando o dealer chega no botão cucurucho, todos pagam <strong className="text-yellow-300">ante = BB × multiplicador</strong>.
                  Após o flop, cada jogador deve pagar o valor do pote para continuar ou fazer fold.
                </div>
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-2">Multiplicador do Ante</label>
                  <div className="flex gap-2">
                    {[5, 8, 10, 15, 20].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCucuruchoAnteMultiplier(m)}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                          cucuruchoAnteMultiplier === m
                            ? 'bg-yellow-600 text-black'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {m}×
                      </button>
                    ))}
                  </div>
                  <div className="text-gray-600 text-xs mt-1.5">
                    Com BB={bigBlind}: ante = <span className="text-yellow-400 font-bold">{bigBlind * cucuruchoAnteMultiplier}</span> fichas
                  </div>
                </div>
              </div>
            )}

            {/* Blinds */}
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2 font-semibold">Big Blind</label>
              <div className="flex gap-2 mb-2">
                {BB_PRESETS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBigBlind(v)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      bigBlind === v ? 'bg-[#c8a84b] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <input
                type="number" value={bigBlind} min={2} max={10000}
                onChange={e => setBigBlind(Math.max(2, Number(e.target.value)))}
                className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-sm outline-none border border-gray-700 focus:border-[#c8a84b]"
              />
              <div className="text-gray-600 text-xs mt-1">Small Blind: {smallBlind}</div>
            </div>

            {/* Starting chips */}
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2 font-semibold">Fichas Iniciais</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {CHIP_PRESETS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setStartingChips(v)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      startingChips === v ? 'bg-[#c8a84b] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {v.toLocaleString('pt-BR')}
                  </button>
                ))}
              </div>
              <input
                type="number" value={startingChips} min={100} max={1000000}
                onChange={e => setStartingChips(Math.max(100, Number(e.target.value)))}
                className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-sm outline-none border border-gray-700 focus:border-[#c8a84b]"
              />
              <div className="text-gray-600 text-xs mt-1">
                Stack: {Math.floor(startingChips / bigBlind)} BBs
              </div>
            </div>

            {/* Seats & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2 font-semibold">Lugares</label>
                <div className="flex gap-1">
                  {[2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxSeats(n)}
                      className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${
                        maxSeats === n ? 'bg-[#c8a84b] text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2 font-semibold">Tempo/Turno</label>
                <div className="flex gap-1">
                  {TIME_PRESETS.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTurnTimeLimit(t.value)}
                      className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${
                        turnTimeLimit === t.value ? 'bg-[#c8a84b] text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(a => !a)}
                className="text-gray-500 text-xs hover:text-gray-300 transition-colors flex items-center gap-1"
              >
                {showAdvanced ? '▾' : '▸'} Configurações avançadas
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-3 pl-3 border-l border-gray-700">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setAllowRebuy(a => !a)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${allowRebuy ? 'bg-green-600' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${allowRebuy ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-gray-300 text-sm">Permitir Rebuy</span>
                  </label>
                  {allowRebuy && (
                    <div>
                      <label className="text-gray-500 text-xs block mb-1">Fichas do Rebuy</label>
                      <input
                        type="number" value={rebuyAmount} min={100}
                        onChange={e => setRebuyAmount(Number(e.target.value))}
                        className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 text-sm outline-none border border-gray-700"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!nickname.trim()}
              className="w-full py-3.5 bg-[#c8a84b] hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black rounded-xl text-lg transition-all shadow-lg shadow-yellow-900/30 hover:shadow-yellow-800/40 hover:scale-[1.01] active:scale-[0.99]"
            >
              Criar Mesa
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="bg-[#161b27] rounded-2xl p-6 border border-gray-700/50 space-y-4">
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-widest block mb-2 font-semibold">Código da Sala</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="Ex: ABC123"
                maxLength={6}
                required
                className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 outline-none border border-gray-700 focus:border-[#c8a84b] font-mono text-2xl uppercase tracking-[0.5em] text-center transition-colors"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
              <div
                onClick={() => setAsSpectator(a => !a)}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${asSpectator ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${asSpectator ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <div>
                <div className="text-white text-sm font-semibold">Entrar como espectador</div>
                <div className="text-gray-500 text-xs">Assista à partida sem jogar</div>
              </div>
            </label>
            <button
              type="submit"
              disabled={!nickname.trim() || !code.trim()}
              className="w-full py-3.5 bg-[#c8a84b] hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black rounded-xl text-lg transition-all shadow-lg shadow-yellow-900/30 hover:scale-[1.01] active:scale-[0.99]"
            >
              Entrar na Mesa
            </button>
          </form>
        )}

        <p className="text-center text-gray-700 text-xs mt-6">
          Sem cadastro · Fichas virtuais · 100% gratuito
        </p>
      </div>
    </div>
  );
}
