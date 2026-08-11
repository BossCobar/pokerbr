import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PokerBR — Poker entre amigos',
  description: 'Texas Hold\'em e Cucurucho com fichas virtuais',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-[#0d1117] text-white">
        {children}
      </body>
    </html>
  );
}
