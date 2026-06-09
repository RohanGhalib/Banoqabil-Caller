'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  LogOut, 
  Menu, 
  X, 
  UserSquare2,
  ChevronRight,
  Download,
  Settings
} from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Auth Guard check
    if (!currentUser) {
      router.push('/login');
    } else if (currentUser.role !== 'admin') {
      router.push('/caller/dashboard');
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

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Callers', path: '/admin/callers', icon: Users },
    { name: 'Allocate Data', path: '/admin/allocate', icon: Layers },
    { name: 'Export Data', path: '/admin/export', icon: Download },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Hamburger */}
      <button
        id="mobile-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0d5c3a] text-white shadow-lg shadow-emerald-900/30 hover:bg-[#073b24] transition-all-300"
      >
        {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar Navigation */}
      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transform transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen lg:shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Sidebar Logo Header */}
          <div className="h-20 border-b border-slate-100 flex items-center px-6 gap-3 bg-gradient-to-r from-emerald-50/30 to-transparent">
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
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Multan Admin</p>
            </div>
          </div>

          {/* User Profile Summary */}
          <div className="p-4 mx-3 my-4 bg-slate-50 rounded-xl flex items-center gap-3 border border-slate-100">
            <div className="h-10 w-10 rounded-full bg-emerald-100 text-[#0d5c3a] flex items-center justify-center font-bold">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-slate-800 text-xs truncate">{currentUser.name}</p>
              <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-[#e6f4ea] text-[#0d5c3a]">
                Admin Mode
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  id={`nav-link-${item.name.toLowerCase().replace(' ', '-')}`}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all-300 ${
                    isActive
                      ? 'bg-[#e6f4ea] text-[#0d5c3a]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#0d5c3a]' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                  {isActive && <ChevronRight className="ml-auto h-4 w-4 text-[#0d5c3a]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          {/* Quick link to Switch views for testing */}
          <Link
            href="/caller/dashboard"
            id="switch-to-caller-view"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-semibold text-[#0d5c3a] bg-emerald-50 hover:bg-[#e6f4ea] border border-emerald-100 rounded-lg transition-all-300"
          >
            <UserSquare2 className="h-4 w-4" />
            Switch to Caller View
          </Link>

          <button
            id="admin-logout-button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-all-300"
          >
            <LogOut className="h-4 w-4" />
            Log Out Session
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-bold text-slate-800" id="admin-page-title">
              {pathname.includes('dashboard') && 'Dashboard Overview'}
              {pathname.includes('callers') && 'Caller Management'}
              {pathname.includes('allocate') && 'Data Allocation Control'}
              {pathname.includes('export') && 'Data Export Center'}
              {pathname.includes('settings') && 'Portal Configurations'}
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Jamat-e-Islami Multan Membership Database Registry
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-xs text-slate-400">Current Local Time</p>
              <p className="text-sm font-semibold text-slate-700">June 9, 2026</p>
            </div>
            <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-[#0d5c3a] text-xs font-bold shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              API Connected
            </span>
          </div>
        </header>

        {/* Inner Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8" id="admin-main-viewport">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm"
        ></div>
      )}
    </div>
  );
}
