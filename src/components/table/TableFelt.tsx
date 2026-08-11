'use client';
import React from 'react';

export function TableFelt({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Outer rim */}
      <div className="absolute inset-0 rounded-[50%] bg-gradient-to-b from-[#8B6914] to-[#5a4209] shadow-2xl" />
      {/* Felt */}
      <div className="absolute inset-4 rounded-[50%] bg-gradient-to-b from-[#2d7a4e] to-[#1a5f3f] shadow-inner overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
      </div>
      {/* Content */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
