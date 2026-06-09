/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp, Member } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  Phone, 
  Copy, 
  Check, 
  Home, 
  Briefcase, 
  PhoneCall, 
  X,
  Download,
  Loader2
} from 'lucide-react';

export default function CallerDashboard() {
  const { currentUser, fetchMembersPaginated, fetchMembersSequentially, updateMember } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  // Pagination states
  const [displayedLeads, setDisplayedLeads] = useState<Member[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Tab & chip counts
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    notCalled: 0,
    notPicked: 0,
    powerOff: 0,
    refused: 0
  });

  // Input states per member to avoid sluggish re-renders
  const [inputs, setInputs] = useState<Record<number, { address: string; occupation: string }>>({});
  
  // Row-level save status badges
  const [saveStatuses, setSaveStatuses] = useState<Record<number, 'idle' | 'saving' | 'saved'>>({});

  // Dialer modal state
  const [dialerModal, setDialerModal] = useState<{ open: boolean; member: Member | null }>({
    open: false,
    member: null
  });
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Helper to detect Urdu/Arabic characters for RTL alignment
  const isUrdu = (text: string) => {
    const urduPattern = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return urduPattern.test(text);
  };

  // 1. Fetch counts for tab headers and status chips
  const fetchCounts = useCallback(async () => {
    if (!currentUser) return;
    try {
      const isCaller = currentUser.role === 'caller';
      
      const queries = [];
      
      // Total assigned / registry
      let qTotal = supabase.from('members').select('*', { count: 'exact', head: true });
      if (isCaller) qTotal = qTotal.eq('assigned_to', currentUser.id);
      queries.push(qTotal);
      
      // Completed (reached)
      let qReached = supabase.from('members').select('*', { count: 'exact', head: true }).eq('call_status', 'reached');
      if (isCaller) qReached = qReached.eq('assigned_to', currentUser.id);
      queries.push(qReached);

      // Not Called
      let qNotCalled = supabase.from('members').select('*', { count: 'exact', head: true }).eq('call_status', 'not_called');
      if (isCaller) qNotCalled = qNotCalled.eq('assigned_to', currentUser.id);
      queries.push(qNotCalled);

      // Not Picked
      let qNotPicked = supabase.from('members').select('*', { count: 'exact', head: true }).eq('call_status', 'not_picked');
      if (isCaller) qNotPicked = qNotPicked.eq('assigned_to', currentUser.id);
      queries.push(qNotPicked);

      // Power Off
      let qPowerOff = supabase.from('members').select('*', { count: 'exact', head: true }).eq('call_status', 'power_off');
      if (isCaller) qPowerOff = qPowerOff.eq('assigned_to', currentUser.id);
      queries.push(qPowerOff);

      // Refused
      let qRefused = supabase.from('members').select('*', { count: 'exact', head: true }).eq('call_status', 'refused');
      if (isCaller) qRefused = qRefused.eq('assigned_to', currentUser.id);
      queries.push(qRefused);

      const [rTotal, rReached, rNotCalled, rNotPicked, rPowerOff, rRefused] = await Promise.all(queries);
      
      const total = rTotal.count || 0;
      const reached = rReached.count || 0;
      const notCalled = rNotCalled.count || 0;
      const notPicked = rNotPicked.count || 0;
      const powerOff = rPowerOff.count || 0;
      const refused = rRefused.count || 0;

      setCounts({
        total,
        completed: reached,
        pending: total - reached,
        notCalled,
        notPicked,
        powerOff,
        refused
      });
    } catch (err) {
      console.error('Failed to fetch count metrics:', err);
    }
  }, [currentUser]);

  // 2. Fetch paginated list of leads based on active page and filters
  const fetchPageData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const { data, count } = await fetchMembersPaginated(currentPage, pageSize, {
        searchQuery,
        activeTab,
        statusFilter,
        role: currentUser.role,
        userId: currentUser.id
      });
      
      setDisplayedLeads(data);
      setTotalCount(count);
    } catch (err) {
      console.error('Error fetching paginated leads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, currentPage, pageSize, searchQuery, activeTab, statusFilter, fetchMembersPaginated]);

  // Re-fetch data on active filter or page changes
  useEffect(() => {
    if (currentUser) {
      fetchPageData();
      fetchCounts();
    }
  }, [currentUser, fetchPageData, fetchCounts]);

  // Handle live updates to inputs locally
  const handleInputChange = (memberId: number, field: 'address' | 'occupation', value: string) => {
    setInputs(prev => {
      const lead = displayedLeads.find(m => m.id === memberId);
      const addressVal = prev[memberId]?.address !== undefined ? prev[memberId].address : (lead?.address || '');
      const occupationVal = prev[memberId]?.occupation !== undefined ? prev[memberId].occupation : (lead?.occupation || '');

      return {
        ...prev,
        [memberId]: {
          address: field === 'address' ? value : addressVal,
          occupation: field === 'occupation' ? value : occupationVal
        }
      };
    });
  };

  // Handle Save row
  const handleSaveRow = async (member: Member) => {
    const memberId = member.id;
    setSaveStatuses(prev => ({ ...prev, [memberId]: 'saving' }));

    const localInput = inputs[memberId] || {};
    const address = localInput.address !== undefined ? localInput.address : (member.address || '');
    const occupation = localInput.occupation !== undefined ? localInput.occupation : (member.occupation || '');

    // Make API Call / Context Update
    const success = await updateMember(memberId, {
      call_status: member.call_status,
      address: address.trim() || null,
      occupation: occupation.trim() || null
    });

    if (success) {
      setSaveStatuses(prev => ({ ...prev, [memberId]: 'saved' }));
      
      // Refresh count totals
      fetchCounts();
      
      // If status changed and no longer matches current view criteria, remove from table
      const isCompleted = member.call_status === 'reached';
      const matchesTab = activeTab === 'completed' ? isCompleted : !isCompleted;
      const matchesStatus = statusFilter === 'all' || member.call_status === statusFilter;
      
      if (!matchesTab || !matchesStatus) {
        setDisplayedLeads(prev => prev.filter(m => m.id !== memberId));
        // If removing last item on page, trigger page step back
        if (displayedLeads.length <= 1 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        }
      }

      setTimeout(() => {
        setSaveStatuses(prev => ({ ...prev, [memberId]: 'idle' }));
      }, 2000);
    }
  };

  // Click to Call popup options
  const handlePhoneClick = (lead: Member) => {
    setDialerModal({ open: true, member: lead });
  };

  const handleCopyNumber = (mobile: string, id: number) => {
    navigator.clipboard.writeText(mobile);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCallNumber = (mobile: string) => {
    setDialerModal({ open: false, member: null });
    window.location.href = `tel:${mobile}`;
  };

  // Lazy export to Excel (sequential fetch of all matching leads)
  const handleExportCurrentView = async () => {
    if (!currentUser) return;
    setExporting(true);
    try {
      const filterCallback = (q: any) => {
        let res = q;
        if (currentUser.role === 'caller') {
          res = res.eq('assigned_to', currentUser.id);
        }
        if (activeTab === 'completed') {
          res = res.eq('call_status', 'reached');
        } else {
          res = res.neq('call_status', 'reached');
        }
        if (statusFilter !== 'all') {
          res = res.eq('call_status', statusFilter);
        }
        if (searchQuery && searchQuery.trim()) {
          const search = searchQuery.trim();
          if (/^\+?\d+$/.test(search)) {
            res = res.ilike('mobile', `%${search}%`);
          } else {
            res = res.ilike('name', `%${search}%`);
          }
        }
        return res;
      };

      const fetched = await fetchMembersSequentially(filterCallback);

      const excelData = fetched.map((m, idx) => ({
        'Sr. No': idx + 1,
        'Name': m.name,
        'Mobile Number': m.mobile,
        'Year of Birth': m.year_of_birth,
        'Age (2026)': m.age,
        'Joining Date': m.joining_date,
        'Call Status': m.call_status.toUpperCase().replace('_', ' '),
        'Verified Address': m.address || '',
        'Occupation': m.occupation || '',
        'Last Updated At': m.updated_at ? new Date(m.updated_at).toLocaleString() : ''
      }));

      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
      
      const maxLengths = excelData.reduce((acc, row) => {
        Object.keys(row).forEach((key, colIdx) => {
          const val = String((row as any)[key] || '');
          acc[colIdx] = Math.max(acc[colIdx] || 10, val.length + 2);
        });
        return acc;
      }, [] as number[]);
      worksheet['!cols'] = maxLengths.map((w: number) => ({ wch: w }));

      const fileName = `JI_Multan_Leads_${activeTab}_${statusFilter}`;
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const getStatusStyle = (status: Member['call_status']) => {
    switch (status) {
      case 'reached':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500';
      case 'not_picked':
        return 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500';
      case 'power_off':
        return 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500';
      case 'refused':
        return 'bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-500';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 focus:ring-slate-400';
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm mt-4">
        <p className="text-xs font-semibold text-slate-500">
          Showing <span className="font-bold text-slate-800">{Math.min(totalCount, (currentPage - 1) * pageSize + 1)}-{Math.min(totalCount, currentPage * pageSize)}</span> of <span className="font-bold text-slate-800">{totalCount.toLocaleString()}</span> leads
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5) {
              if (currentPage > 3) {
                pageNum = currentPage - 3 + i;
              }
              if (pageNum + (4 - i) > totalPages) {
                pageNum = totalPages - 4 + i;
              }
            }
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                  currentPage === pageNum
                    ? 'bg-[#0d5c3a] text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="caller-dashboard-container">
      
      {/* Upper Tab Switches: Worklist vs Completed */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm max-w-md">
        <button
          id="tab-worklist"
          onClick={() => {
            setActiveTab('pending');
            setStatusFilter('all');
            setCurrentPage(1);
          }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'pending'
              ? 'bg-[#e6f4ea] text-[#0d5c3a] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Worklist ({counts.pending})
        </button>
        <button
          id="tab-completed"
          onClick={() => {
            setActiveTab('completed');
            setStatusFilter('all');
            setCurrentPage(1);
          }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'completed'
              ? 'bg-[#e6f4ea] text-[#0d5c3a] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Completed Verified ({counts.completed})
        </button>
      </div>

      {/* Filter, Search Box and Export */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:max-w-xl">
            {/* Search Box */}
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                id="caller-search-box"
                type="text"
                placeholder="Search by name or contact number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a]"
              />
            </div>

            {/* Export List Button */}
            <button
              id="export-current-view-btn"
              onClick={handleExportCurrentView}
              disabled={exporting || displayedLeads.length === 0}
              className="flex items-center justify-center gap-1.5 px-4 py-2 border border-[#0d5c3a] hover:bg-[#e6f4ea] text-[#0d5c3a] rounded-lg text-sm font-semibold transition-all disabled:opacity-50 w-full sm:w-auto shrink-0"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{exporting ? 'Exporting...' : 'Export List'}</span>
            </button>
          </div>

          {/* Filter Status Chips (Only shown in Active Worklist tab) */}
          {activeTab === 'pending' && (
            <div className="flex flex-wrap gap-2 w-full lg:w-auto" id="filter-chips">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Active ({counts.pending})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('not_called');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  statusFilter === 'not_called'
                    ? 'bg-slate-500 text-white border-slate-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Not Called ({counts.notCalled})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('not_picked');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  statusFilter === 'not_picked'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Not Picked ({counts.notPicked})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('power_off');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  statusFilter === 'power_off'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Power Off ({counts.powerOff})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('refused');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  statusFilter === 'refused'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Refused ({counts.refused})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop List Layout (Table) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="desktop-leads-panel">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[#0d5c3a]" />
              <p className="text-sm font-semibold">Loading membership records...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6 w-16 text-center">Sr.</th>
                  <th className="py-3.5 px-6 w-52">Member details</th>
                  <th className="py-3.5 px-6 w-44">Contact details</th>
                  <th className="py-3.5 px-6 w-40 text-center">Call status</th>
                  <th className="py-3.5 px-6">Address</th>
                  <th className="py-3.5 px-6 w-60">Occupation</th>
                  <th className="py-3.5 px-6 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {displayedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                      No leads found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  displayedLeads.map((lead, idx) => {
                    const leadId = lead.id;
                    const currentInputs = inputs[leadId] || { address: lead.address || '', occupation: lead.occupation || '' };
                    const rowSaveStatus = saveStatuses[leadId] || 'idle';
                    
                    return (
                      <tr key={leadId} className="hover:bg-slate-50/30 transition-colors" id={`lead-row-${leadId}`}>
                        {/* Sr. No */}
                        <td className="py-4 px-6 text-center text-slate-400 font-semibold">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        
                        {/* Member Details */}
                        <td className="py-4 px-6">
                          <p className={`font-bold text-slate-800 ${isUrdu(lead.name) ? 'font-urdu text-sm' : ''}`}>
                            {lead.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Age: <span className="font-semibold text-slate-600">{lead.age} yrs</span> (DOB {lead.year_of_birth})
                          </p>
                        </td>

                        {/* Contact Details */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              id={`call-btn-${leadId}`}
                              onClick={() => handlePhoneClick(lead)}
                              className="p-2 bg-[#e6f4ea] text-[#0d5c3a] rounded-lg hover:bg-[#0d5c3a] hover:text-white transition-all-300 shadow-sm"
                              title="Call / Copy"
                            >
                              <Phone className="h-4 w-4" />
                            </button>
                            <span className="font-mono text-xs font-semibold text-slate-600 tracking-wider">
                              {lead.mobile}
                            </span>
                          </div>
                        </td>

                        {/* Call Status Dropdown */}
                        <td className="py-4 px-6 text-center">
                          <select
                            id={`status-dropdown-${leadId}`}
                            value={lead.call_status}
                            onChange={(e) => {
                              lead.call_status = e.target.value as Member['call_status'];
                              setInputs(prev => ({ ...prev }));
                            }}
                            className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold outline-none transition-all ${getStatusStyle(lead.call_status)}`}
                          >
                            <option value="not_called">Not Called</option>
                            <option value="reached">Reached / Verified</option>
                            <option value="not_picked">Not Picked</option>
                            <option value="power_off">Power Off</option>
                            <option value="refused">Refused Data</option>
                          </select>
                        </td>

                        {/* Address Textarea (Bilingual) */}
                        <td className="py-4 px-6">
                          <textarea
                            id={`address-input-${leadId}`}
                            rows={1}
                            placeholder="درج کریں / Enter Address"
                            value={currentInputs.address}
                            onChange={(e) => handleInputChange(leadId, 'address', e.target.value)}
                            dir={isUrdu(currentInputs.address) ? 'rtl' : 'ltr'}
                            className={`w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a] min-h-[36px] resize-none ${
                              isUrdu(currentInputs.address) ? 'font-urdu' : ''
                            }`}
                          />
                        </td>

                        {/* Occupation Input (Bilingual) */}
                        <td className="py-4 px-6">
                          <input
                            id={`occupation-input-${leadId}`}
                            type="text"
                            placeholder="پیشہ / Occupation"
                            value={currentInputs.occupation}
                            onChange={(e) => handleInputChange(leadId, 'occupation', e.target.value)}
                            dir={isUrdu(currentInputs.occupation) ? 'rtl' : 'ltr'}
                            className={`w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a] ${
                              isUrdu(currentInputs.occupation) ? 'font-urdu' : ''
                            }`}
                          />
                        </td>

                        {/* Row Action Save Button */}
                        <td className="py-4 px-6 text-center">
                          <button
                            id={`save-btn-${leadId}`}
                            onClick={() => handleSaveRow(lead)}
                            disabled={rowSaveStatus === 'saving'}
                            className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-all-300 shadow-sm ${
                              rowSaveStatus === 'saved'
                                ? 'bg-emerald-600 text-white'
                                : rowSaveStatus === 'saving'
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-[#0d5c3a] hover:bg-[#073b24] text-white'
                            }`}
                          >
                            {rowSaveStatus === 'saved' ? (
                              <span className="flex items-center justify-center gap-1">
                                <Check className="h-3.5 w-3.5" />
                                Saved!
                              </span>
                            ) : rowSaveStatus === 'saving' ? (
                              'Saving...'
                            ) : (
                              'Save Data'
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
        {!isLoading && renderPagination()}
      </div>

      {/* Mobile Card Layout (App view) */}
      <div className="md:hidden space-y-4" id="mobile-leads-panel">
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#0d5c3a]" />
            <p className="text-xs font-semibold">Loading membership records...</p>
          </div>
        ) : displayedLeads.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 font-semibold">
            No leads found matching your criteria.
          </div>
        ) : (
          displayedLeads.map((lead) => {
            const leadId = lead.id;
            const currentInputs = inputs[leadId] || { address: lead.address || '', occupation: lead.occupation || '' };
            const rowSaveStatus = saveStatuses[leadId] || 'idle';
            
            return (
              <div 
                key={leadId} 
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-300"
                id={`mobile-card-${leadId}`}
              >
                {/* Header Card: Name, Age, Call Status */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className={`font-bold text-slate-800 text-base ${isUrdu(lead.name) ? 'font-urdu' : ''}`}>
                      {lead.name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Age: <span className="font-semibold text-slate-600">{lead.age} yrs</span> (DOB {lead.year_of_birth})
                    </p>
                  </div>
                  
                  {/* Status Dropdown Mobile */}
                  <select
                    id={`status-dropdown-mob-${leadId}`}
                    value={lead.call_status}
                    onChange={(e) => {
                      lead.call_status = e.target.value as Member['call_status'];
                      setInputs(prev => ({ ...prev }));
                    }}
                    className={`rounded-lg border px-2 py-1 text-xs font-semibold outline-none transition-all ${getStatusStyle(lead.call_status)}`}
                  >
                    <option value="not_called">Not Called</option>
                    <option value="reached">Reached</option>
                    <option value="not_picked">Not Picked</option>
                    <option value="power_off">Power Off</option>
                    <option value="refused">Refused</option>
                  </select>
                </div>

                {/* Dialer click and Phone number */}
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 justify-between">
                  <span className="font-mono text-xs font-bold text-slate-600 tracking-wider">
                    {lead.mobile}
                  </span>
                  <button
                    id={`call-btn-mob-${leadId}`}
                    onClick={() => handlePhoneClick(lead)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e6f4ea] text-[#0d5c3a] rounded-lg text-xs font-bold shadow-sm"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call / Copy
                  </button>
                </div>

                {/* Text Enrichment Inputs */}
                <div className="space-y-3">
                  {/* Address input */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Member Address
                    </label>
                    <div className="relative">
                      <span className="absolute top-2.5 left-3 text-slate-400">
                        <Home className="h-3.5 w-3.5" />
                      </span>
                      <textarea
                        id={`address-input-mob-${leadId}`}
                        rows={1}
                        placeholder="ممبر کا پتہ درج کریں..."
                        value={currentInputs.address}
                        onChange={(e) => handleInputChange(leadId, 'address', e.target.value)}
                        dir={isUrdu(currentInputs.address) ? 'rtl' : 'ltr'}
                        className={`w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a] min-h-[38px] resize-none ${
                          isUrdu(currentInputs.address) ? 'font-urdu' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Occupation input */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Member Occupation
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <Briefcase className="h-3.5 w-3.5" />
                      </span>
                      <input
                        id={`occupation-input-mob-${leadId}`}
                        type="text"
                        placeholder="پیشہ لکھیں..."
                        value={currentInputs.occupation}
                        onChange={(e) => handleInputChange(leadId, 'occupation', e.target.value)}
                        dir={isUrdu(currentInputs.occupation) ? 'rtl' : 'ltr'}
                        className={`w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a] ${
                          isUrdu(currentInputs.occupation) ? 'font-urdu' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Save action button */}
                <button
                  id={`save-btn-mob-${leadId}`}
                  onClick={() => handleSaveRow(lead)}
                  disabled={rowSaveStatus === 'saving'}
                  className={`w-full py-2.5 text-xs font-bold rounded-lg transition-all-300 shadow-sm ${
                    rowSaveStatus === 'saved'
                      ? 'bg-emerald-600 text-white'
                      : rowSaveStatus === 'saving'
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-[#0d5c3a] text-white'
                  }`}
                >
                  {rowSaveStatus === 'saved' ? (
                    <span className="flex items-center justify-center gap-1">
                      <Check className="h-4 w-4" />
                      Updated Successfully!
                    </span>
                  ) : rowSaveStatus === 'saving' ? (
                    'Saving data...'
                  ) : (
                    'Save Lead Details'
                  )}
                </button>
              </div>
            );
          })
        )}
        {!isLoading && renderPagination()}
      </div>

      {/* Dialer Modal Popup (App prompt) */}
      {dialerModal.open && dialerModal.member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" id="dialer-modal">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              id="close-dialer-modal"
              onClick={() => setDialerModal({ open: false, member: null })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              <div className="h-14 w-14 rounded-full bg-emerald-50 text-[#0d5c3a] flex items-center justify-center shadow-inner">
                <PhoneCall className="h-6 w-6" />
              </div>
              <div>
                <h3 className={`font-bold text-slate-800 text-base ${isUrdu(dialerModal.member.name) ? 'font-urdu' : ''}`}>
                  {dialerModal.member.name}
                </h3>
                <p className="font-mono text-sm font-bold text-slate-500 mt-1 tracking-wider">
                  {dialerModal.member.mobile}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              {/* Option 1: Copy number */}
              <button
                id="dialer-copy-number"
                onClick={() => handleCopyNumber(dialerModal.member!.mobile, dialerModal.member!.id)}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors gap-2"
              >
                <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                  {copiedId === dialerModal.member.id ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {copiedId === dialerModal.member.id ? 'Copied!' : 'Copy Number'}
                </span>
              </button>

              {/* Option 2: Redirect dialer */}
              <button
                id="dialer-call-number"
                onClick={() => handleCallNumber(dialerModal.member!.mobile)}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-emerald-50 hover:bg-emerald-50/50 transition-colors gap-2"
              >
                <div className="h-10 w-10 bg-[#e6f4ea] rounded-full flex items-center justify-center text-[#0d5c3a]">
                  <Phone className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-[#0d5c3a]">
                  Redirect Call
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
