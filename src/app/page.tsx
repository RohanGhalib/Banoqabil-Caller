'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { currentUser } = useApp();

  useEffect(() => {
    // Standard delay to ensure context loads
    const timer = setTimeout(() => {
      if (!currentUser) {
        router.push('/login');
      } else if (currentUser.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/caller/dashboard');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentUser, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6" id="home-landing-page">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* JI Green Loading Screen */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-[#0d5c3a]">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          Jamat-e-Islami Multan
        </h1>
        <p className="text-sm text-slate-500">
          Call Center Portal — Loading your session...
        </p>
      </div>
    </main>
  );
}
