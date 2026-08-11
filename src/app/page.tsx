import { Suspense } from 'react';
import { HomeScreen } from '@/components/home/HomeScreen';

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d1117]" />}>
      <HomeScreen />
    </Suspense>
  );
}
