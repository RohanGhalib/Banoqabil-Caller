'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Shield, PhoneCall, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const { login, currentUser } = useApp();
  
  const [role, setRole] = useState<'admin' | 'caller'>('caller');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/caller/dashboard');
      }
    }
  }, [currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email) {
      setError('Please enter your email or username');
      setLoading(false);
      return;
    }

    try {
      // Auto-append domain if simple username is entered
      const normalizedEmail = email.includes('@') ? email : `${email}@ji.org`;
      
      const successLogin = await login(normalizedEmail, role);
      
      if (successLogin) {
        setSuccess(true);
        setTimeout(() => {
          if (role === 'admin') {
            router.push('/admin/dashboard');
          } else {
            router.push('/caller/dashboard');
          }
        }, 800);
      } else {
        setError('Invalid credentials for selected role. Try admin@ji.org or caller1@ji.org.');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred during authentication';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12" id="login-container">
      <div className="w-full max-w-md space-y-6">
        
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center text-center">
          {/* Jamat-e-Islami Symbolic Flag/Logo SVG */}
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0d5c3a] to-[#15803d] p-3 shadow-lg shadow-emerald-900/20">
            <svg viewBox="0 0 100 100" className="h-full w-full fill-white" xmlns="http://www.w3.org/2000/svg">
              {/* Crescent and Star design representing JI logo */}
              <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="4" />
              <path d="M45,25 A22,22 0 1,0 75,55 A28,28 0 1,1 45,25 Z" fill="white" />
              <polygon points="68,30 73,43 85,43 76,51 79,64 68,56 57,64 60,51 51,43 63,43" fill="#facc15" />
              <rect x="25" y="48" width="50" height="4" fill="white" rx="2" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
            جماعتِ اسلامی پاکستان
          </h1>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-[#0d5c3a]">
            Multan Call Center Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          
          {/* Role selector Tabs */}
          <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
            <button
              id="role-caller-tab"
              type="button"
              onClick={() => {
                setRole('caller');
                setError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all ${
                role === 'caller'
                  ? 'bg-white text-[#0d5c3a] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PhoneCall className="h-4 w-4" />
              Caller Panel
            </button>
            <button
              id="role-admin-tab"
              type="button"
              onClick={() => {
                setRole('admin');
                setError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-all ${
                role === 'admin'
                  ? 'bg-white text-[#0d5c3a] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin Panel
            </button>
          </div>

          <h2 className="mb-4 text-lg font-bold text-slate-800">
            Sign in as {role === 'admin' ? 'Administrator' : 'Caller Agent'}
          </h2>

          {/* Feedback states */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-rose-50 p-3.5 text-sm text-rose-600 border border-rose-100" id="login-error">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-emerald-50 p-3.5 text-sm text-emerald-700 border border-emerald-100" id="login-success">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span>Authentication successful! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1" htmlFor="email-input">
                Email Address / Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email-input"
                  type="text"
                  required
                  placeholder={role === 'admin' ? 'admin@ji.org' : 'caller1@ji.org or username'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1" htmlFor="password-input">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a]"
                />
              </div>
            </div>

            <button
              id="submit-login"
              type="submit"
              disabled={loading || success}
              className="w-full rounded-lg bg-[#0d5c3a] hover:bg-[#073b24] text-white py-3 text-sm font-semibold tracking-wide shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* User Guide for testing */}
          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-xs text-slate-400">
              Testing accounts:<br />
              <strong className="text-slate-600">Admin</strong>: <code className="bg-slate-50 px-1 py-0.5 rounded">admin@ji.org</code> | Password: any<br />
              <strong className="text-slate-600">Caller</strong>: <code className="bg-slate-50 px-1 py-0.5 rounded">caller1@ji.org</code> or any username | Password: any
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
