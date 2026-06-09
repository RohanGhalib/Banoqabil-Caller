'use client';

import React, { useState, useMemo } from 'react';
import { useApp, Member } from '@/context/AppContext';
import { 
  Search, 
  Phone, 
  Copy, 
  Check, 
  Home, 
  Briefcase,
  PhoneCall,
  X
} from 'lucide-react';

export default function CallerDashboard() {
  const { currentUser, members, updateMember } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

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

  // Filter assigned leads
  const assignedLeads = useMemo(() => {
    if (!currentUser) return [];
    
    // RLS: Only fetch members assigned to current user
    console.log(
      `%c[SUPABASE SYNC TODO] %cFetch Assigned Members: %cSELECT * FROM members WHERE assigned_to = '${currentUser.id}';`,
      'color: #0d5c3a; font-weight: bold; font-size: 11px;',
      'color: #334155;',
      'color: #0d5c3a; font-family: monospace;'
    );

    return members.filter(m => m.assigned_to === currentUser.id);
  }, [members, currentUser]);

  // Apply search query, tab split, and filter chips
  const filteredLeads = useMemo(() => {
    return assignedLeads.filter(lead => {
      // 1. Search Query (name or mobile)
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.mobile.includes(searchQuery);

      // 2. Tab selection
      // 'pending' = not reached or fully verified yet
      // 'completed' = reached with data filled
      const isCompleted = lead.call_status === 'reached';
      const matchesTab = activeTab === 'completed' ? isCompleted : !isCompleted;

      // 3. Status filter chips
      const matchesStatus = statusFilter === 'all' || lead.call_status === statusFilter;

      return matchesSearch && matchesTab && matchesStatus;
    });
  }, [assignedLeads, searchQuery, statusFilter, activeTab]);

  // Handle live updates to inputs locally
  const handleInputChange = (memberId: number, field: 'address' | 'occupation', value: string) => {
    setInputs(prev => {
      
      // If we don't have initial values loaded, merge with current member data
      const lead = members.find(m => m.id === memberId);
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
      setTimeout(() => {
        setSaveStatuses(prev => ({ ...prev, [memberId]: 'idle' }));
      }, 2000);
    }
  };

  // Status Dropdown Color Mapper
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

  return (
    <div className="space-y-6" id="caller-dashboard-container">
      
      {/* Upper Tab Switches: Worklist vs Completed */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm max-w-md">
        <button
          id="tab-worklist"
          onClick={() => {
            setActiveTab('pending');
            setStatusFilter('all');
          }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'pending'
              ? 'bg-[#e6f4ea] text-[#0d5c3a] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Worklist ({assignedLeads.filter(m => m.call_status !== 'reached').length})
        </button>
        <button
          id="tab-completed"
          onClick={() => {
            setActiveTab('completed');
            setStatusFilter('all');
          }}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'completed'
              ? 'bg-[#e6f4ea] text-[#0d5c3a] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Completed Verified ({assignedLeads.filter(m => m.call_status === 'reached').length})
        </button>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              id="caller-search-box"
              type="text"
              placeholder="Search by name or contact number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-[#0d5c3a] focus:ring-1 focus:ring-[#0d5c3a]"
            />
          </div>

          {/* Filter Status Chips (Only shown in Active Worklist tab) */}
          {activeTab === 'pending' && (
            <div className="flex flex-wrap gap-2 w-full md:w-auto" id="filter-chips">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Active ({assignedLeads.filter(m => m.call_status !== 'reached').length})
              </button>
              <button
                onClick={() => setStatusFilter('not_called')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  statusFilter === 'not_called'
                    ? 'bg-slate-500 text-white border-slate-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Not Called ({assignedLeads.filter(m => m.call_status === 'not_called').length})
              </button>
              <button
                onClick={() => setStatusFilter('not_picked')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  statusFilter === 'not_picked'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Not Picked ({assignedLeads.filter(m => m.call_status === 'not_picked').length})
              </button>
              <button
                onClick={() => setStatusFilter('power_off')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  statusFilter === 'power_off'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Power Off ({assignedLeads.filter(m => m.call_status === 'power_off').length})
              </button>
              <button
                onClick={() => setStatusFilter('refused')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  statusFilter === 'refused'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Refused ({assignedLeads.filter(m => m.call_status === 'refused').length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop List Layout (Table) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="desktop-leads-panel">
        <div className="overflow-x-auto">
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
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, idx) => {
                  const leadId = lead.id;
                  const currentInputs = inputs[leadId] || { address: lead.address || '', occupation: lead.occupation || '' };
                  const rowSaveStatus = saveStatuses[leadId] || 'idle';
                  
                  return (
                    <tr key={leadId} className="hover:bg-slate-50/30 transition-colors" id={`lead-row-${leadId}`}>
                      {/* Sr. No */}
                      <td className="py-4 px-6 text-center text-slate-400 font-semibold">{idx + 1}</td>
                      
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
                            // Update local context directly, but caller still needs to click Save
                            lead.call_status = e.target.value as Member['call_status'];
                            // Trigger re-render
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
        </div>
      </div>

      {/* Mobile Card Layout (App view) */}
      <div className="md:hidden space-y-4" id="mobile-leads-panel">
        {filteredLeads.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
            No leads found matching your criteria.
          </div>
        ) : (
          filteredLeads.map((lead) => {
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
