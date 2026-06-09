'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { LogOut, UserSquare2 } from 'lucide-react';
import Link from 'next/link';

export default function CallerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, logout } = useApp();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Auth Guard
    if (!currentUser) {
      router.push('/login');
    } else {
      setAuthorized(true);
    }
  }, [currentUser, router]);

  if (!authorized || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0d5c3a] border-t-transparent mx-auto"></div>
          <p className="mt-2 text-sm text-slate-500">Checking authorization...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sleek Top Navigation Header */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-40 shadow-sm">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5">
          {/* JI Logo SVG */}
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#0d5c3a] p-1.5 shadow-md shadow-emerald-900/10">
            <svg viewBox="0 0 100 100" className="h-full w-full fill-white" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="4" />
              <path d="M45,25 A22,22 0 1,0 75,55 A28,28 0 1,1 45,25 Z" fill="white" />
              <polygon points="68,30 73,43 85,43 76,51 79,64 68,56 57,64 60,51 51,43 63,43" fill="#facc15" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm leading-tight">جماعتِ اسلامی</h2>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Multan Caller Workspace</p>
          </div>
        </div>

        {/* User Info and Controls */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
            <p className="text-[9px] text-[#0d5c3a] font-bold uppercase tracking-wider">
              {currentUser.role === 'admin' ? 'System Administrator' : 'Caller Agent'}
            </p>
          </div>
          
          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

          {/* Quick Toggle for Admin testing if current user is admin */}
          {currentUser.role === 'admin' && (
            <Link
              href="/admin/dashboard"
              id="switch-to-admin-view"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-[#e6f4ea] text-[#0d5c3a] text-xs font-bold transition-all-300 border border-emerald-100"
            >
              <UserSquare2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Admin View</span>
            </Link>
          )}

          <button
            id="caller-logout-button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 text-xs font-bold transition-all-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Panel Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8" id="caller-main-viewport">
        {children}
      </main>

      {/* RLS Status indicator footer */}
      <footer className="py-3 bg-white border-t border-slate-200 text-center text-[10px] text-slate-400 font-medium">
        Jamat-e-Islami Multan • Row-Level Security Enabled • Database Host: Supabase Cloud (db.teenverse.org)
      </footer>
    </div>
  );
}
