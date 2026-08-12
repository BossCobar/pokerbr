'use client';
import React from 'react';

export function TableFelt({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Ambient golden glow behind the whole table */}
      <div
        className="absolute inset-0 rounded-[50%]"
        style={{
          background: 'radial-gradient(ellipse, rgba(200,168,75,0.18) 0%, transparent 70%)',
          filter: 'blur(12px)',
        }}
      />

      {/* Outer drop shadow */}
      <div className="absolute inset-0 rounded-[50%] shadow-[0_0_80px_rgba(0,0,0,0.9)]" />

      {/* Golden rail — gradient band */}
      <div
        className="absolute inset-0 rounded-[50%]"
        style={{
          background: 'linear-gradient(135deg, #b8892a 0%, #e8c560 30%, #8B6914 65%, #c8a84b 100%)',
          padding: '6px',
        }}
      >
        <div
          className="w-full h-full rounded-[50%]"
          style={{ background: 'linear-gradient(170deg, #5a3e0a 0%, #2e1e04 100%)' }}
        />
      </div>

      {/* Felt surface */}
      <div
        className="absolute rounded-[50%] overflow-hidden"
        style={{ inset: '8px' }}
      >
        {/* Base felt gradient — deep green */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 50% 40%, #1e5c35 0%, #143d24 60%, #0d2b19 100%)',
          }}
        />
        {/* SVG noise texture */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <filter id="felt-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#felt-noise)" />
        </svg>
        {/* Soft light from above */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(255,255,255,0.07) 0%, transparent 70%)',
          }}
        />
        {/* Inner rim shadow */}
        <div
          className="absolute inset-0 rounded-[50%]"
          style={{ boxShadow: 'inset 0 0 70px rgba(0,0,0,0.55)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
