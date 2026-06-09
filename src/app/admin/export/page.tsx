'use client';

import React, { useState } from 'react';
import { useApp, Member } from '@/context/AppContext';
import { Download, FileSpreadsheet, AlertCircle, RefreshCw, Layers, Users, BadgeCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminExport() {
  const { members, callers } = useApp();
  const [selectedCallerId, setSelectedCallerId] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const callerList = callers.filter(c => c.role === 'caller');

  // Log Supabase query that would be run for the export
  const logExportQuery = (type: string, query: string) => {
    console.log(
      `%c[SUPABASE SYNC TODO] %cExport Query (%c${type}%c):\n%cQuery: %c${query}`,
      'color: #0d5c3a; font-weight: bold; font-size: 11px;',
      'color: #334155; font-weight: bold;',
      'color: #ec4899; font-weight: bold;',
      'color: #334155; font-weight: bold;',
      'color: #64748b;',
      'color: #0f172a; font-family: monospace;'
    );
  };

  // Convert raw members to readable excel columns
  const mapMembersToExcel = (list: Member[]) => {
    return list.map((m, idx) => ({
      'Sr. No': idx + 1,
      'Name': m.name,
      'Mobile Number': m.mobile,
      'Year of Birth': m.year_of_birth,
      'Age (2026)': m.age,
      'Joining Date': m.joining_date,
      'Call Status': m.call_status.toUpperCase().replace('_', ' '),
      'Verified Address': m.address || '',
      'Occupation': m.occupation || '',
      'Assigned To': callers.find(c => c.id === m.assigned_to)?.name || 'Unassigned',
      'Last Updated At': m.updated_at ? new Date(m.updated_at).toLocaleString() : ''
    }));
  };

  // Trigger Excel File Download
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const triggerDownload = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Fit columns width roughly
    const maxLengths = data.reduce((acc, row) => {
      Object.keys(row).forEach((key, colIdx) => {
        const val = String(row[key] || '');
        acc[colIdx] = Math.max(acc[colIdx] || 10, val.length + 2);
      });
      return acc;
    }, [] as number[]);
    worksheet['!cols'] = maxLengths.map((w: number) => ({ wch: w }));

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const handleExportFull = () => {
    setLoading('full');
    logExportQuery('Full Dataset', 'SELECT * FROM members ORDER BY id ASC;');
    
    setTimeout(() => {
      const data = mapMembersToExcel(members);
      triggerDownload(data, 'JI_Multan_Full_Registry');
      setLoading(null);
    }, 500);
  };

  const handleExportCompleted = () => {
    setLoading('completed');
    logExportQuery('Completed Only', "SELECT * FROM members WHERE call_status = 'reached' ORDER BY id ASC;");

    setTimeout(() => {
      const completedList = members.filter(m => m.call_status === 'reached');
      const data = mapMembersToExcel(completedList);
      triggerDownload(data, 'JI_Multan_Completed_Leads');
      setLoading(null);
    }, 500);
  };

  const handleExportCallerSpecific = () => {
    if (!selectedCallerId) return;
    setLoading('caller');
    logExportQuery('Caller Specific', `SELECT * FROM members WHERE assigned_to = '${selectedCallerId}' ORDER BY id ASC;`);

    setTimeout(() => {
      const callerLeads = members.filter(m => m.assigned_to === selectedCallerId);
      const callerName = callers.find(c => c.id === selectedCallerId)?.name || 'Caller';
      const data = mapMembersToExcel(callerLeads);
      triggerDownload(data, `JI_Multan_Leads_${callerName.replace(/\s+/g, '_')}`);
      setLoading(null);
    }, 500);
  };

  const handleExportSummary = () => {
    setLoading('summary');
    logExportQuery(
      'Outcome Summary',
      "SELECT call_status, COUNT(*) FROM members GROUP BY call_status; SELECT name, COUNT(*) FROM callers JOIN members ON callers.id = members.assigned_to GROUP BY name;"
    );

    setTimeout(() => {
      // Create status sheet
      const statusCounts = members.reduce((acc, m) => {
        acc[m.call_status] = (acc[m.call_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const statusSummary = Object.keys(statusCounts).map(status => ({
        'Call Status': status.toUpperCase().replace('_', ' '),
        'Count': statusCounts[status],
        'Percentage': `${Math.round((statusCounts[status] / members.length) * 100)}%`
      }));

      // Create caller summary sheet
      const callerSummary = callerList.map(c => {
        const callerLeads = members.filter(m => m.assigned_to === c.id);
        const completed = callerLeads.filter(m => m.call_status !== 'not_called').length;
        const reached = callerLeads.filter(m => m.call_status === 'reached').length;
        
        return {
          'Caller Agent': c.name,
          'Email': c.email,
          'Total Assigned': callerLeads.length,
          'Total Completed': completed,
          'Success (Reached)': reached,
          'Pending Call': callerLeads.length - completed,
          'Agent Progress': `${callerLeads.length > 0 ? Math.round((completed / callerLeads.length) * 100) : 0}%`
        };
      });

      const workbook = XLSX.utils.book_new();
      
      const statusSheet = XLSX.utils.json_to_sheet(statusSummary);
      XLSX.utils.book_append_sheet(workbook, statusSheet, 'Outcome Metrics');

      const callerSheet = XLSX.utils.json_to_sheet(callerSummary);
      XLSX.utils.book_append_sheet(workbook, callerSheet, 'Caller Performance');

      XLSX.writeFile(workbook, 'JI_Multan_Campaign_Summary.xlsx');
      setLoading(null);
    }, 500);
  };

  return (
    <div className="space-y-6" id="admin-export-container">
      {/* Page Description */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-start gap-4">
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-[#0d5c3a] shrink-0 mt-0.5">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800">Export Registry & Reports</h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Download Excel spreadsheets compile data in real time directly from the local cache. 
            Once connected to Supabase, these exports will run server-side queries to fetch the live database records.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export Card 1: Full Registry */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <RefreshCw className="h-4.5 w-4.5 text-slate-400" />
              Full Registry Excel
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export the entire registry of unique members ({members.length} records), including calculated ages, call outcomes, enriched addresses, and occupations.
            </p>
          </div>
          <button
            id="btn-export-full"
            onClick={handleExportFull}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#0d5c3a] hover:bg-[#073b24] text-white rounded-lg text-xs font-bold transition-all-300 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {loading === 'full' ? 'Generating Excel...' : 'Export Full Dataset'}
          </button>
        </div>

        {/* Export Card 2: Completed Only */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <BadgeCheck className="h-4.5 w-4.5 text-emerald-500" />
              Completed verified records
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export only the records where the call status is marked as **Reached / Verified** ({members.filter(m => m.call_status === 'reached').length} records). This contains your final enriched member list.
            </p>
          </div>
          <button
            id="btn-export-completed"
            onClick={handleExportCompleted}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all-300 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {loading === 'completed' ? 'Generating Excel...' : 'Export Completed Leads'}
          </button>
        </div>

        {/* Export Card 3: Caller Specific */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-slate-400" />
              Caller Specific Sheet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Select an agent and export only the members assigned to them. Useful to review an agent&apos;s individual progress.
            </p>
          </div>

          <div className="flex gap-2">
            <select
              id="export-caller-select"
              value={selectedCallerId}
              onChange={(e) => setSelectedCallerId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none bg-white focus:border-[#0d5c3a]"
            >
              <option value="">-- Select Agent --</option>
              {callerList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              id="btn-export-caller"
              onClick={handleExportCallerSpecific}
              disabled={loading !== null || !selectedCallerId}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0d5c3a] hover:bg-[#073b24] text-white rounded-lg text-xs font-bold transition-all-300 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {loading === 'caller' ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        {/* Export Card 4: Summary Metrics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Layers className="h-4.5 w-4.5 text-slate-400" />
              Campaign Outcomes Summary
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Download a 2-sheet summary workbook containing overall outcome percentages (Reached, Not Picked, Refused) and complete statistics of caller agents.
            </p>
          </div>
          <button
            id="btn-export-summary"
            onClick={handleExportSummary}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all-300 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {loading === 'summary' ? 'Generating summary...' : 'Export Campaign Summary'}
          </button>
        </div>

      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 text-xs text-slate-500 items-start">
        <AlertCircle className="h-5 w-5 shrink-0 text-slate-400" />
        <div className="space-y-1">
          <p className="font-bold text-slate-700">Developer Information:</p>
          <p>
            When migrating to Supabase, these download actions should trigger an API route in Next.js (e.g., `/api/export`) or utilize server side components to compile and stream the binary stream directly to save client memory.
          </p>
        </div>
      </div>

    </div>
  );
}
