'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Layers, HelpCircle, BadgeCheck, AlertTriangle, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';

export default function AdminAllocate() {
  const { summaryStats, callers, allocateLeads, fetchSummaryStats } = useApp();
  
  const [selectedCallerId, setSelectedCallerId] = useState('');
  const [allocationCount, setAllocationCount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const callerList = callers.filter(c => c.role === 'caller');

  // Trigger loading of summary stats on mount if not loaded
  useEffect(() => {
    if (!summaryStats) {
      fetchSummaryStats();
    }
  }, [summaryStats, fetchSummaryStats]);

  // Compute unassigned and assigned lead counts from summaryStats
  const counts = useMemo(() => {
    if (!summaryStats) return { total: 0, unassigned: 0, assigned: 0 };
    
    const assigned = summaryStats.callerStats.reduce((sum, c) => sum + c.assigned, 0);
    const total = summaryStats.total;
    const unassigned = Math.max(0, total - assigned);
    
    return {
      total,
      unassigned,
      assigned
    };
  }, [summaryStats]);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessCount(null);
    setLoading(true);

    if (!selectedCallerId) {
      setError('Please select a caller agent first.');
      setLoading(false);
      return;
    }

    if (allocationCount <= 0) {
      setError('Please enter a valid number of leads to allocate.');
      setLoading(false);
      return;
    }

    if (counts.unassigned === 0) {
      setError('No unassigned leads available in the database.');
      setLoading(false);
      return;
    }

    try {
      const allocated = await allocateLeads(selectedCallerId, allocationCount);
      
      if (allocated > 0) {
        setSuccessCount(allocated);
        setTimeout(() => {
          setSuccessCount(null);
          setSelectedCallerId('');
        }, 4000);
      } else {
        setError('Failed to allocate leads. Ensure there are unassigned records.');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred during allocation.';
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
          <h3 className="font-bold text-slate-800 text-sm">Loading Allocation Metrics</h3>
          <p className="text-xs text-slate-400">Querying lead assignment totals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="admin-allocate-container">
      {/* Visual DB Lead Pools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Pool 1: Total Leads */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Registry Leads</p>
          <h3 className="text-2xl font-extrabold text-slate-800 mt-2">{counts.total.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <RefreshCw className="h-3.5 w-3.5" />
            Synchronized from Excel migration
          </div>
        </div>

        {/* Pool 2: Unassigned Leads */}
        <div className="rounded-2xl border border-emerald-100 bg-[#e6f4ea] p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0d5c3a]">Available to Allocate</p>
          <h3 className="text-2xl font-extrabold text-[#0d5c3a] mt-2">{counts.unassigned.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-[#0d5c3a] font-medium">
            <Layers className="h-3.5 w-3.5" />
            Awaiting caller assignment
          </div>
        </div>

        {/* Pool 3: Assigned Leads */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Leads</p>
          <h3 className="text-2xl font-extrabold text-slate-800 mt-2">{counts.assigned.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
            Currently active on caller sheets
          </div>
        </div>

      </div>

      {/* Allocation Tool Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-[#0d5c3a]" />
            Leads Allocation Control
          </h3>
          <p className="text-xs text-slate-400">
            Select a caller agent and input the amount of entries to assign. The system pulls the oldest unallocated records.
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-600 border border-rose-100" id="allocation-error">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3.5 text-xs text-emerald-700 border border-emerald-100" id="allocation-success">
              <BadgeCheck className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Allocation Successful!</span> Assigned <span className="font-extrabold">{successCount}</span> entries to the selected caller agent.
              </div>
            </div>
          )}

          <form onSubmit={handleAllocate} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1" htmlFor="allocation-caller">
                  Select Caller Agent
                </label>
                <select
                  id="allocation-caller"
                  required
                  value={selectedCallerId}
                  onChange={(e) => setSelectedCallerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none bg-white transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a]"
                >
                  <option value="">-- Choose a Caller --</option>
                  {callerList.map(c => {
                    const stat = summaryStats?.callerStats.find(s => s.id === c.id);
                    const callerAssigned = stat ? stat.assigned : 0;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({callerAssigned} leads assigned)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1" htmlFor="allocation-size">
                  Batch Allocation Size
                </label>
                <select
                  id="allocation-size"
                  value={allocationCount}
                  onChange={(e) => setAllocationCount(parseInt(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none bg-white transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a]"
                >
                  <option value={10}>10 Leads (Quick Test)</option>
                  <option value={50}>50 Leads</option>
                  <option value={100}>100 Leads</option>
                  <option value={200}>200 Leads</option>
                  <option value={500}>500 Leads</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                id="submit-allocation"
                type="submit"
                disabled={loading || counts.unassigned === 0}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0d5c3a] hover:bg-[#073b24] text-white rounded-lg text-sm font-semibold tracking-wide shadow-md shadow-emerald-900/10 transition-all-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Allocating...
                  </>
                ) : (
                  <>
                    Assign Leads Batch
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="h-4.5 w-4.5 text-slate-400" />
              Allocation Guideline
            </h3>
            
            <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
              <p>
                <strong>1. First-in, First-out (FIFO):</strong> The system allocates leads based on the order they were imported (S/No sequence).
              </p>
              <p>
                <strong>2. Unique Contact Enforcement:</strong> Since mobile numbers are unique in the cleaned database, each contact will only ever be called by a single agent.
              </p>
              <p>
                <strong>3. Real-time updates:</strong> As soon as you allocate data, it will instantly appear in the caller&apos;s interface without needing a logout or reload.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mt-4 flex gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <span>
              If you need to revoke or reallocate leads, please execute a direct update query in your Supabase SQL editor.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
