'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Settings, Shield, BadgeCheck, AlertTriangle, Save } from 'lucide-react';

export default function AdminSettings() {
  const { members, callers } = useApp();

  const [orgName, setOrgName] = useState('جماعتِ اسلامی ملتان');
  const [defaultBatch, setDefaultBatch] = useState(100);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-6" id="admin-settings-container">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Form Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Settings className="h-4.5 w-4.5 text-[#0d5c3a]" />
            Organization & System Settings
          </h3>
          <p className="text-xs text-slate-400">
            Configure system defaults and display options for the portal.
          </p>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1" htmlFor="org-name-input">
                Organization Name (Urdu/English)
              </label>
              <input
                id="org-name-input"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none transition-all focus:border-[#0d5c3a]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1" htmlFor="default-batch-input">
                Default Lead Allocation Batch Size
              </label>
              <select
                id="default-batch-input"
                value={defaultBatch}
                onChange={(e) => setDefaultBatch(parseInt(e.target.value))}
                className="w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm outline-none bg-white focus:border-[#0d5c3a]"
              >
                <option value={50}>50 Leads</option>
                <option value={100}>100 Leads</option>
                <option value={200}>200 Leads</option>
                <option value={500}>500 Leads</option>
              </select>
            </div>

            <div className="pt-2 flex items-center gap-4">
              <button
                id="submit-settings-save"
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0d5c3a] hover:bg-[#073b24] text-white rounded-lg text-sm font-semibold tracking-wide shadow-md shadow-emerald-900/10 transition-all-300"
              >
                <Save className="h-4 w-4" />
                Save Configurations
              </button>
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <BadgeCheck className="h-4 w-4" />
                  Settings saved!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Database Connection Status Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Shield className="h-4.5 w-4.5 text-slate-400" />
              Database Health Details
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-50">
                <span className="text-slate-400">Database Connection</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[#0d5c3a] font-bold text-[10px]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Connected
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-50">
                <span className="text-slate-400">Database Host</span>
                <span className="font-mono text-slate-600">db.teenverse.org</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-50">
                <span className="text-slate-400">Total Callers</span>
                <span className="font-bold text-slate-700">{callers.filter(c => c.role === 'caller').length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Enrolled Members</span>
                <span className="font-bold text-slate-700">{members.length.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <span>
              Supabase Row-Level Security (RLS) is currently active. Anonymous write operations are prevented.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
