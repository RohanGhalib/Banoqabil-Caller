'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Users, UserPlus, Mail, ShieldAlert, BadgeCheck, X, Loader2 } from 'lucide-react';

export default function AdminCallers() {
  const { callers, summaryStats, addCaller, fetchSummaryStats } = useApp();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Trigger loading of summary stats on mount if not loaded
  useEffect(() => {
    if (!summaryStats) {
      fetchSummaryStats();
    }
  }, [summaryStats, fetchSummaryStats]);

  const callerList = callers.filter(c => c.role === 'caller');

  const handleAddCallerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!name || !email) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const normalizedEmail = email.includes('@') ? email : `${email}@ji.org`;
      const added = await addCaller(name, normalizedEmail, password);
      
      if (added) {
        const displayPassword = password || normalizedEmail.split('@')[0];
        setSuccessMsg(`Caller '${name}' created successfully! Credentials: Email = ${normalizedEmail}, Password = ${displayPassword}.`);
        setName('');
        setEmail('');
        setPassword('');
        
        // Re-sync summary stats to add new caller (with 0 leads)
        await fetchSummaryStats();

        setTimeout(() => {
          setModalOpen(false);
          setSuccessMsg(null);
        }, 3000);
      } else {
        setError('This email address is already registered as a caller.');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!summaryStats) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#0d5c3a] mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">Loading Caller Directory</h3>
          <p className="text-xs text-slate-400">Loading caller agent listings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="admin-callers-container">
      {/* Header and Add Button */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-[#0d5c3a]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Caller Registry</h2>
            <p className="text-xs text-slate-400">Total active callers: {callerList.length}</p>
          </div>
        </div>
        <button
          id="open-add-caller-modal"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0d5c3a] hover:bg-[#073b24] text-white rounded-lg text-sm font-semibold tracking-wide shadow-md shadow-emerald-900/10 transition-all-300"
        >
          <UserPlus className="h-4 w-4" />
          Add Caller Agent
        </button>
      </div>

      {/* Grid listing of Caller Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" id="callers-grid">
        {callerList.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            No caller accounts registered yet. Click the button above to add your first caller.
          </div>
        ) : (
          callerList.map(c => {
            const stat = summaryStats.callerStats.find(s => s.id === c.id) || {
              assigned: 0,
              completed: 0,
              reached: 0,
              performance: 0
            };
            const assigned = stat.assigned;
            const completed = stat.completed;
            const reached = stat.reached;
            const progress = stat.performance;
            
            return (
              <div 
                key={c.id} 
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300"
                id={`caller-card-${c.id}`}
              >
                {/* Header Profile */}
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-emerald-50 text-[#0d5c3a] border border-emerald-100 flex items-center justify-center font-bold text-base">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{c.name}</h4>
                        <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[#0d5c3a] text-[10px] font-bold">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Active
                    </span>
                  </div>

                  {/* Progress Stats */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Call Progress</span>
                      <span className="text-slate-800">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div 
                        className="bg-[#0d5c3a] h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Quantitative breakdown */}
                <div className="grid grid-cols-3 gap-2 mt-5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Allocated</p>
                    <p className="text-base font-extrabold text-slate-700 mt-0.5">{assigned.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Reached</p>
                    <p className="text-base font-extrabold text-emerald-600 mt-0.5">{reached.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Done</p>
                    <p className="text-base font-extrabold text-[#0d5c3a] mt-0.5">{completed.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Caller Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" id="add-caller-modal">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              id="close-add-caller-modal"
              onClick={() => {
                setModalOpen(false);
                setError(null);
                setSuccessMsg(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-5 w-5 text-[#0d5c3a]" />
              <h3 className="text-base font-bold text-slate-800">Add Caller Credentials</h3>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-600 border border-rose-100">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-100">
                <BadgeCheck className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddCallerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1" htmlFor="caller-name">
                  Caller&apos;s Full Name
                </label>
                <input
                  id="caller-name"
                  type="text"
                  required
                  placeholder="e.g. Syed Muhammad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1" htmlFor="caller-email">
                  Email / Username
                </label>
                <input
                  id="caller-email"
                  type="text"
                  required
                  placeholder="e.g. caller4@ji.org or syed.m"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Note: If domain is omitted, `@ji.org` will be automatically appended.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1" htmlFor="caller-password">
                  Password (Optional)
                </label>
                <input
                  id="caller-password"
                  type="password"
                  placeholder="Defaults to username prefix if empty"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm outline-none transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a]"
                />
              </div>

              <div className="pt-2">
                <button
                  id="submit-add-caller"
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#0d5c3a] hover:bg-[#073b24] text-white py-2.5 text-sm font-semibold tracking-wide shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Register Caller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
