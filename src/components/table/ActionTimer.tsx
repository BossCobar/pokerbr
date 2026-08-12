'use client';
import { useTimer } from '@/lib/hooks/useTimer';
import { motion } from 'framer-motion';

interface Props { startedAt: number; limitSeconds: number; }

const R = 18;
const CX = 22;
const CIRC = 2 * Math.PI * R;

export function ActionTimer({ startedAt, limitSeconds }: Props) {
  const remaining = useTimer(startedAt, limitSeconds);
  const pct = Math.max(0, Math.min(1, remaining / limitSeconds));
  const isUrgent = remaining <= 5;
  const isWarning = pct <= 0.5;
  const stroke = isUrgent ? '#ef4444' : isWarning ? '#eab308' : '#22c55e';
  const dashOffset = CIRC * (1 - pct);

  if (limitSeconds <= 0) return null;

  return (
    <motion.div
      className="relative flex-shrink-0 flex items-center justify-center"
      animate={isUrgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={isUrgent ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } : {}}
    >
      <svg width={44} height={44} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        {/* Track */}
        <circle cx={CX} cy={CX} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
        {/* Progress arc */}
        <circle
          cx={CX} cy={CX} r={R}
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.35s ease' }}
        />
      </svg>
      {/* Centred seconds label — compensates for SVG rotation */}
      <span
        className="absolute text-[11px] font-black tabular-nums"
        style={{ color: stroke }}
      >
        {Math.ceil(remaining)}
      </span>
    </motion.div>
  );
}
