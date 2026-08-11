'use client';
import { motion } from 'framer-motion';

interface Props { size?: 'sm' | 'md' | 'lg'; }
const sizes = { sm: 'w-10 h-14', md: 'w-14 h-20', lg: 'w-16 h-24' };

export function CardBack({ size = 'md' }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${sizes[size]} bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg shadow-lg border-2 border-blue-400 flex items-center justify-center`}
    >
      <div className="w-3/4 h-3/4 border-2 border-blue-300 rounded opacity-50" />
    </motion.div>
  );
}
