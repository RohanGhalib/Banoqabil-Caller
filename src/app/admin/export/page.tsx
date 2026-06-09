/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { useApp, Member } from '@/context/AppContext';
import { Download, FileSpreadsheet, AlertCircle, RefreshCw, Layers, Users, BadgeCheck, Loader2 } from 'lucide-react';

export default function AdminExport() {
  const { callers, summaryStats, fetchSummaryStats, fetchMembersSequentially } = useApp();
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
  const triggerDownload = (xlsxModule: any, data: any[], fileName: string) => {
    const worksheet = xlsxModule.utils.json_to_sheet(data);
    const workbook = xlsxModule.utils.book_new();
    xlsxModule.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Fit columns width roughly
    const maxLengths = data.reduce((acc, row) => {
      Object.keys(row).forEach((key, colIdx) => {
        const val = String(row[key] || '');
        acc[colIdx] = Math.max(acc[colIdx] || 10, val.length + 2);
      });
      return acc;
    }, [] as number[]);
    worksheet['!cols'] = maxLengths.map((w: number) => ({ wch: w }));

    xlsxModule.writeFile(workbook, `${fileName}.xlsx`);
  };

  const handleExportFull = async () => {
    setLoading('full');
    logExportQuery('Full Dataset', 'SELECT * FROM members ORDER BY id ASC;');
    try {
      const fetched = await fetchMembersSequentially();
      const data = mapMembersToExcel(fetched);
      const xlsxModule = await import('xlsx');
      triggerDownload(xlsxModule, data, 'JI_Multan_Full_Registry');
    } catch (err) {
      console.error('Export full registry failed:', err);
    } finally {
      setLoading(null);
    }
  };

  const handleExportCompleted = async () => {
    setLoading('completed');
    logExportQuery('Completed Only', "SELECT * FROM members WHERE call_status = 'reached' ORDER BY id ASC;");
    try {
      const fetched = await fetchMembersSequentially(q => q.eq('call_status', 'reached'));
      const data = mapMembersToExcel(fetched);
      const xlsxModule = await import('xlsx');
      triggerDownload(xlsxModule, data, 'JI_Multan_Completed_Leads');
    } catch (err) {
      console.error('Export completed leads failed:', err);
    } finally {
      setLoading(null);
    }
  };

  const handleExportCallerSpecific = async () => {
    if (!selectedCallerId) return;
    setLoading('caller');
    logExportQuery('Caller Specific', `SELECT * FROM members WHERE assigned_to = '${selectedCallerId}' ORDER BY id ASC;`);
    try {
      const fetched = await fetchMembersSequentially(q => q.eq('assigned_to', selectedCallerId));
      const callerName = callers.find(c => c.id === selectedCallerId)?.name || 'Caller';
      const data = mapMembersToExcel(fetched);
      const xlsxModule = await import('xlsx');
      triggerDownload(xlsxModule, data, `JI_Multan_Leads_${callerName.replace(/\s+/g, '_')}`);
    } catch (err) {
      console.error('Export caller specific leads failed:', err);
    } finally {
      setLoading(null);
    }
  };

  const handleExportSummary = async () => {
    setLoading('summary');
    logExportQuery(
      'Outcome Summary',
      "SELECT call_status, COUNT(*) FROM members GROUP BY call_status; SELECT name, COUNT(*) FROM callers JOIN members ON callers.id = members.assigned_to GROUP BY name;"
    );

    try {
      let activeStats = summaryStats;
      if (!activeStats) {
        activeStats = await fetchSummaryStats() || null;
      }
      
      const stats = activeStats;
      if (!stats) {
        alert('Campaign stats are still loading. Please try again.');
        setLoading(null);
        return;
      }

      // Outcome Metrics Summary
      const statusSummary = [
        { 
          'Call Status': 'REACHED / VERIFIED', 
          'Count': stats.reached, 
          'Percentage': `${stats.total > 0 ? Math.round((stats.reached / stats.total) * 100) : 0}%` 
        },
        { 
          'Call Status': 'NOT PICKED', 
          'Count': stats.notPicked, 
          'Percentage': `${stats.total > 0 ? Math.round((stats.notPicked / stats.total) * 100) : 0}%` 
        },
        { 
          'Call Status': 'POWER OFF', 
          'Count': stats.powerOff, 
          'Percentage': `${stats.total > 0 ? Math.round((stats.powerOff / stats.total) * 100) : 0}%` 
        },
        { 
          'Call Status': 'REFUSED', 
          'Count': stats.refused, 
          'Percentage': `${stats.total > 0 ? Math.round((stats.refused / stats.total) * 100) : 0}%` 
        },
        { 
          'Call Status': 'PENDING / NOT CALLED', 
          'Count': stats.pending, 
          'Percentage': `${stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%` 
        },
      ];

      // Caller Performance Summary
      const callerSummary = stats.callerStats.map(c => ({
        'Caller Agent': c.name,
        'Email': c.email,
        'Total Assigned': c.assigned,
        'Total Completed': c.completed,
        'Success (Reached)': c.reached,
        'Pending Call': c.assigned - c.completed,
        'Agent Progress': `${c.performance}%`
      }));

      const xlsxModule = await import('xlsx');
      const workbook = xlsxModule.utils.book_new();
      
      const statusSheet = xlsxModule.utils.json_to_sheet(statusSummary);
      xlsxModule.utils.book_append_sheet(workbook, statusSheet, 'Outcome Metrics');

      const callerSheet = xlsxModule.utils.json_to_sheet(callerSummary);
      xlsxModule.utils.book_append_sheet(workbook, callerSheet, 'Caller Performance');

      xlsxModule.writeFile(workbook, 'JI_Multan_Campaign_Summary.xlsx');
    } catch (err) {
      console.error('Export summary failed:', err);
    } finally {
      setLoading(null);
    }
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
            Download Excel spreadsheets compile data in real time directly.
            These exports pull records from Supabase in batches sequentially to prevent client memory leaks.
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
              Export the entire registry of unique members ({summaryStats?.total?.toLocaleString() || '...'} records), including calculated ages, call outcomes, enriched addresses, and occupations.
            </p>
          </div>
          <button
            id="btn-export-full"
            onClick={handleExportFull}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#0d5c3a] hover:bg-[#073b24] text-white rounded-lg text-xs font-bold transition-all-300 disabled:opacity-50"
          >
            {loading === 'full' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Excel...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export Full Dataset
              </>
            )}
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
              Export only the records where the call status is marked as **Reached / Verified** ({summaryStats?.reached?.toLocaleString() || '...'} records). This contains your final enriched member list.
            </p>
          </div>
          <button
            id="btn-export-completed"
            onClick={handleExportCompleted}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all-300 disabled:opacity-50"
          >
            {loading === 'completed' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Excel...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export Completed Leads
              </>
            )}
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
              {loading === 'caller' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{loading === 'caller' ? 'Exporting...' : 'Export'}</span>
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
            {loading === 'summary' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating summary...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export Campaign Summary
              </>
            )}
          </button>
        </div>

      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 text-xs text-slate-500 items-start">
        <AlertCircle className="h-5 w-5 shrink-0 text-slate-400" />
        <div className="space-y-1">
          <p className="font-bold text-slate-700">Database Optimization Details:</p>
          <p>
            Excel generation uses client-side XLSX streaming in memory, which triggers lazy chunked querying in sequence to compile the download cleanly.
          </p>
        </div>
      </div>

    </div>
  );
}
