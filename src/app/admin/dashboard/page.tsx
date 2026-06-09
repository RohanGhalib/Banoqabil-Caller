'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { 
  Users, 
  PhoneCall, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  RefreshCw,
  UserCheck
} from 'lucide-react';

export default function AdminDashboard() {
  const { members, callers } = useApp();

  // Console query logs
  const getStatsQueries = () => {
    console.log(
      `%c[SUPABASE SYNC TODO] %cDashboard Metrics Compilation Queries:
1. Total Members: %cSELECT COUNT(*) FROM members;
%c2. Calls Completed: %cSELECT COUNT(*) FROM members WHERE call_status != 'not_called';
%c3. Call Status Counts: %cSELECT call_status, COUNT(*) FROM members GROUP BY call_status;
%c4. Caller Metrics: %cSELECT assigned_to, call_status, COUNT(*) FROM members WHERE assigned_to IS NOT NULL GROUP BY assigned_to, call_status;`,
      'color: #0d5c3a; font-weight: bold; font-size: 11px;',
      'color: #334155; font-weight: bold;',
      'color: #0d5c3a; font-family: monospace;',
      'color: #334155;',
      'color: #0d5c3a; font-family: monospace;',
      'color: #334155;',
      'color: #0d5c3a; font-family: monospace;',
      'color: #334155;',
      'color: #0d5c3a; font-family: monospace;'
    );
  };

  // Compile calculations
  const stats = useMemo(() => {
    getStatsQueries();

    const total = members.length;
    const reached = members.filter(m => m.call_status === 'reached').length;
    const notPicked = members.filter(m => m.call_status === 'not_picked').length;
    const powerOff = members.filter(m => m.call_status === 'power_off').length;
    const refused = members.filter(m => m.call_status === 'refused').length;
    const completed = reached + notPicked + powerOff + refused;
    const pending = total - completed;
    const successRate = completed > 0 ? Math.round((reached / completed) * 100) : 0;
    const progressRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      reached,
      notPicked,
      powerOff,
      refused,
      successRate,
      progressRate
    };
  }, [members]);

  // Compile stats per caller
  const callerStats = useMemo(() => {
    return callers
      .filter(c => c.role === 'caller')
      .map(c => {
        const callerLeads = members.filter(m => m.assigned_to === c.id);
        const assigned = callerLeads.length;
        const reachedCount = callerLeads.filter(m => m.call_status === 'reached').length;
        const completedCount = callerLeads.filter(m => m.call_status !== 'not_called').length;
        const pendingCount = assigned - completedCount;
        const performance = assigned > 0 ? Math.round((completedCount / assigned) * 100) : 0;

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          assigned,
          completed: completedCount,
          pending: pendingCount,
          reached: reachedCount,
          performance
        };
      });
  }, [callers, members]);

  // SVG calculations for circular progress bar
  const strokeDashoffset = 251.2 - (251.2 * stats.progressRate) / 100;

  return (
    <div className="space-y-6" id="admin-dashboard-container">
      
      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Total Members */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Members</p>
            <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.total.toLocaleString()}</h3>
            <p className="text-xs text-slate-400">Unique registered accounts</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-[#0d5c3a]">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: Calls Completed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Calls Done</p>
            <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.completed.toLocaleString()}</h3>
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {stats.progressRate}% overall completion
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <PhoneCall className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Pending Calls */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Calls</p>
            <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.pending.toLocaleString()}</h3>
            <p className="text-xs text-slate-400">Awaiting allocations / agent call</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Card 4: Success Reached Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Success Rate</p>
            <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{stats.successRate}%</h3>
            <p className="text-xs text-slate-400">Data gathered / calls made</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Graphs and Progress Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Call Status Chart Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <PhoneCall className="h-4.5 w-4.5 text-[#0d5c3a]" />
            Call Outcome Statistics
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-6 pt-2">
            {/* Visual SVG Donut Chart */}
            <div className="flex justify-center relative">
              <svg className="h-44 w-44 transform -rotate-90">
                {/* Track circle */}
                <circle cx="88" cy="88" r="70" stroke="#f1f5f9" strokeWidth="20" fill="transparent" />
                {/* Reached (Green) */}
                <circle
                  cx="88"
                  cy="88"
                  r="70"
                  stroke="#10b981"
                  strokeWidth="20"
                  fill="transparent"
                  strokeDasharray="439.8"
                  strokeDashoffset={439.8 - (439.8 * (stats.reached / (stats.completed || 1))) * (stats.completed > 0 ? 1 : 0)}
                />
              </svg>
              {/* Center percentage badge */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">{stats.progressRate}%</span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">Calls Done</span>
              </div>
            </div>

            {/* List breakdown of outcome counts */}
            <div className="space-y-3">
              {/* Item 1: Reached */}
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                  <span className="text-sm text-slate-600 font-medium">Reached & Verified</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{stats.reached}</p>
                  <p className="text-[10px] text-slate-400">
                    {stats.completed > 0 ? Math.round((stats.reached / stats.completed) * 100) : 0}% of calls
                  </p>
                </div>
              </div>

              {/* Item 2: Not Picked */}
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                  <span className="text-sm text-slate-600 font-medium">Not Picked</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{stats.notPicked}</p>
                  <p className="text-[10px] text-slate-400">
                    {stats.completed > 0 ? Math.round((stats.notPicked / stats.completed) * 100) : 0}% of calls
                  </p>
                </div>
              </div>

              {/* Item 3: Power Off */}
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                  <span className="text-sm text-slate-600 font-medium">Power Off</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{stats.powerOff}</p>
                  <p className="text-[10px] text-slate-400">
                    {stats.completed > 0 ? Math.round((stats.powerOff / stats.completed) * 100) : 0}% of calls
                  </p>
                </div>
              </div>

              {/* Item 4: Refused */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500"></span>
                  <span className="text-sm text-slate-600 font-medium">Refused Data</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{stats.refused}</p>
                  <p className="text-[10px] text-slate-400">
                    {stats.completed > 0 ? Math.round((stats.refused / stats.completed) * 100) : 0}% of calls
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign progress tracker card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <RefreshCw className="h-4.5 w-4.5 text-[#0d5c3a] animate-spin-slow" />
            Campaign Overall Status
          </h3>

          <div className="flex flex-col items-center justify-center py-4 relative">
            <svg className="h-36 w-36" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#0d5c3a"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-slate-800">{stats.progressRate}%</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center space-y-1">
            <p className="text-xs text-slate-500 font-medium">Total Database Size</p>
            <p className="text-xl font-extrabold text-[#0d5c3a]">{stats.total.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-semibold">
              {stats.completed} Calls Logged | {stats.pending} Calls Remaining
            </p>
          </div>
        </div>
      </div>

      {/* Caller Performance Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="h-4.5 w-4.5 text-[#0d5c3a]" />
              Caller Agents Performance
            </h3>
            <p className="text-xs text-slate-400">Live progress tracking of allocated entries</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="caller-performance-grid">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-6">Name</th>
                <th className="py-3 px-6">Email Address</th>
                <th className="py-3 px-6 text-center">Allocated</th>
                <th className="py-3 px-6 text-center">Completed</th>
                <th className="py-3 px-6 text-center">Awaiting</th>
                <th className="py-3 px-6 text-center">Reached</th>
                <th className="py-3 px-6 text-center w-40">Progress Bar</th>
                <th className="py-3 px-6 text-right">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {callerStats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No callers found. Add callers in the &quot;Callers&quot; tab.
                  </td>
                </tr>
              ) : (
                callerStats.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors" id={`caller-row-${c.id}`}>
                    <td className="py-3.5 px-6 font-semibold text-slate-800">{c.name}</td>
                    <td className="py-3.5 px-6 text-slate-500">{c.email}</td>
                    <td className="py-3.5 px-6 text-center font-medium text-slate-700">{c.assigned}</td>
                    <td className="py-3.5 px-6 text-center text-[#0d5c3a] font-bold">{c.completed}</td>
                    <td className="py-3.5 px-6 text-center text-amber-600 font-bold">{c.pending}</td>
                    <td className="py-3.5 px-6 text-center text-emerald-600 font-bold">{c.reached}</td>
                    <td className="py-3.5 px-6 text-center">
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className="bg-[#0d5c3a] h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${c.performance}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-right font-extrabold text-slate-800">{c.performance}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
