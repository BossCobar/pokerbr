'use client';
import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/game/types';

interface Props { messages: ChatMessage[]; onSend: (text: string) => void; myId: string; }

export function Chat({ messages, onSend, myId }: Props) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function send() {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  }

  return (
    <div className="flex flex-col h-full bg-black/60 rounded-xl border border-gray-700">
      <button
        onClick={() => setOpen(o => !o)}
        className="px-3 py-2 text-xs text-gray-400 font-bold uppercase tracking-wider flex justify-between border-b border-gray-700"
      >
        Chat {open ? '▾' : '▸'}
      </button>
      {open && (
        <>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
            {messages.map(m => (
              <div key={m.id} className={`text-xs ${m.playerId === myId ? 'text-blue-300' : 'text-gray-300'}`}>
                <span className="font-bold text-[#c8a84b]">{m.nickname}: </span>
                {m.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-1 p-2 border-t border-gray-700">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Mensagem..."
              className="flex-1 bg-gray-800 text-white text-xs rounded px-2 py-1 outline-none"
              maxLength={200}
            />
            <button
              onClick={send}
              className="text-xs bg-[#c8a84b] text-black px-2 py-1 rounded font-bold"
            >
              →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
