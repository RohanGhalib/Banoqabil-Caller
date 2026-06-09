/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Types aligned with Supabase schema
export interface Caller {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'caller';
  created_at: string;
}

export interface Member {
  id: number;
  name: string;
  mobile: string;
  year_of_birth: number;
  joining_date: string;
  age: number;
  call_status: 'not_called' | 'reached' | 'not_picked' | 'power_off' | 'refused';
  address: string | null;
  occupation: string | null;
  assigned_to: string | null; // Caller ID
  assigned_at: string | null;
  updated_at: string | null;
  updated_by: string | null; // Caller ID
}

export interface CallerStat {
  id: string;
  name: string;
  email: string;
  assigned: number;
  completed: number;
  reached: number;
  performance: number;
}

export interface SummaryStats {
  total: number;
  completed: number;
  pending: number;
  reached: number;
  notPicked: number;
  powerOff: number;
  refused: number;
  successRate: number;
  progressRate: number;
  callerStats: CallerStat[];
}

interface AppContextType {
  currentUser: Caller | null;
  callers: Caller[];
  members: Member[];
  summaryStats: SummaryStats | null;
  fetchCallers: () => Promise<void>;
  fetchSummaryStats: () => Promise<SummaryStats | undefined>;
  fetchMembersPaginated: (
    page: number,
    pageSize: number,
    filters: {
      searchQuery?: string;
      activeTab: 'pending' | 'completed';
      statusFilter: string;
      role: 'admin' | 'caller';
      userId: string;
    }
  ) => Promise<{ data: Member[]; count: number }>;
  fetchMembersSequentially: (filterCallback?: (query: any) => any) => Promise<Member[]>;
  login: (email: string, password: string, role: 'admin' | 'caller') => Promise<boolean>;
  logout: () => void;
  addCaller: (name: string, email: string, password?: string) => Promise<boolean>;
  allocateLeads: (callerId: string, count: number) => Promise<number>;
  updateMember: (
    memberId: number,
    updates: Partial<Pick<Member, 'call_status' | 'address' | 'occupation'>>
  ) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Caller | null>(null);
  const [callers, setCallers] = useState<Caller[]>([]);
  const [members, setMembers] = useState<Member[]>([]); // Preserved for compatibility, left empty
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);

  // 1. Helper to fetch all callers (Admin only)
  const fetchCallers = async () => {
    const { data, error } = await supabase
      .from('callers')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching callers:', error.message);
      return;
    }
    if (data) {
      setCallers(data);
    }
  };

  // 2. Helper to fetch summary stats by retrieving light indexed columns paginated
  const fetchSummaryStats = async (): Promise<SummaryStats | undefined> => {
    try {
      let allStats: { assigned_to: string | null; call_status: string }[] = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('members')
          .select('assigned_to, call_status')
          .range(from, from + limit - 1);

        if (error) {
          console.error('Error fetching stats page:', error.message);
          return;
        }

        if (data && data.length > 0) {
          allStats = [...allStats, ...data as any];
          from += limit;
          if (data.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      // Compile stats locally
      const total = allStats.length;
      const reached = allStats.filter(m => m.call_status === 'reached').length;
      const notPicked = allStats.filter(m => m.call_status === 'not_picked').length;
      const powerOff = allStats.filter(m => m.call_status === 'power_off').length;
      const refused = allStats.filter(m => m.call_status === 'refused').length;
      const completed = reached + notPicked + powerOff + refused;
      const pending = total - completed;
      const successRate = completed > 0 ? Math.round((reached / completed) * 100) : 0;
      const progressRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Fetch all callers to match names
      const { data: callersList, error: callersError } = await supabase
        .from('callers')
        .select('*')
        .order('name', { ascending: true });

      if (callersError) {
        console.error('Error fetching callers list for stats:', callersError.message);
        return;
      }

      const activeCallers = (callersList || []).filter(c => c.role === 'caller');
      const callerStats: CallerStat[] = activeCallers.map(c => {
        const callerLeads = allStats.filter(m => m.assigned_to === c.id);
        const assigned = callerLeads.length;
        const callerCompleted = callerLeads.filter(m => m.call_status !== 'not_called').length;
        const callerReached = callerLeads.filter(m => m.call_status === 'reached').length;
        const performance = assigned > 0 ? Math.round((callerCompleted / assigned) * 100) : 0;

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          assigned,
          completed: callerCompleted,
          reached: callerReached,
          performance
        };
      });

      const statsObj = {
        total,
        completed,
        pending,
        reached,
        notPicked,
        powerOff,
        refused,
        successRate,
        progressRate,
        callerStats
      };

      setSummaryStats(statsObj);
      return statsObj;
    } catch (err) {
      console.error('Failed to compile summary statistics:', err);
    }
  };

  // 3. Helper to fetch members with server-side pagination and filters
  const fetchMembersPaginated = async (
    page: number,
    pageSize: number,
    filters: {
      searchQuery?: string;
      activeTab: 'pending' | 'completed';
      statusFilter: string;
      role: 'admin' | 'caller';
      userId: string;
    }
  ) => {
    let query = supabase
      .from('members')
      .select('*', { count: 'exact' });

    // Filter by role / ownership
    if (filters.role === 'caller') {
      query = query.eq('assigned_to', filters.userId);
    }

    // Filter by Tab (reached = completed, anything else = pending)
    if (filters.activeTab === 'completed') {
      query = query.eq('call_status', 'reached');
    } else {
      query = query.neq('call_status', 'reached');
    }

    // Filter by Status Chip
    if (filters.statusFilter !== 'all') {
      query = query.eq('call_status', filters.statusFilter);
    }

    // Search Query (intelligent search name/mobile)
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const search = filters.searchQuery.trim();
      if (/^\+?\d+$/.test(search)) {
        query = query.ilike('mobile', `%${search}%`);
      } else {
        query = query.ilike('name', `%${search}%`);
      }
    }

    // Paginate
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('Error fetching paginated members:', error.message);
      throw new Error(error.message);
    }

    return {
      data: (data || []) as Member[],
      count: count || 0
    };
  };

  // 4. Helper to fetch members sequentially (lazy load for exports)
  const fetchMembersSequentially = async (filterCallback?: (query: any) => any): Promise<Member[]> => {
    let allMembers: Member[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from('members').select('*');
      if (filterCallback) {
        query = filterCallback(query);
      }

      const { data, error } = await query
        .order('id', { ascending: true })
        .range(from, from + limit - 1);

      if (error) {
        console.error('Error in sequential member fetch:', error.message);
        throw new Error(error.message);
      }

      if (data && data.length > 0) {
        allMembers = [...allMembers, ...data as Member[]];
        from += limit;
        if (data.length < limit) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    return allMembers;
  };

  // Check user session on mount
  useEffect(() => {
    const getSessionAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Retrieve profile details
        const { data: profile, error } = await supabase
          .from('callers')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!error && profile) {
          setCurrentUser(profile);
          // Load data based on role
          if (profile.role === 'admin') {
            fetchCallers();
            fetchSummaryStats();
          }
        }
      }
    };

    getSessionAndLoad();

    // Set up auth state change subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('callers')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentUser(profile);
          if (profile.role === 'admin') {
            fetchCallers();
            fetchSummaryStats();
          }
        }
      } else {
        setCurrentUser(null);
        setCallers([]);
        setSummaryStats(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  // Login Handler (Supabase Auth email/password)
  const login = async (email: string, password: string, role: 'admin' | 'caller'): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        // Double check profile role
        const { data: profile, error: profileError } = await supabase
          .from('callers')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          throw new Error('User profile does not exist in the database.');
        }

        // Validate that user is allowed to access the specific role panel
        if (profile.role !== role) {
          throw new Error(`Unauthorized. This account is registered as a ${profile.role}.`);
        }

        setCurrentUser(profile);
        return true;
      }
      return false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      throw new Error(message);
    }
  };

  // Logout Handler
  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setMembers([]);
    setCallers([]);
  };

  // Add Caller (Admin action calling server API to use Admin SDK)
  const addCaller = async (name: string, email: string, password?: string): Promise<boolean> => {
    try {
      const defaultPassword = password || email.split('@')[0]; // Default password is the username
      
      const response = await fetch('/api/callers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: defaultPassword })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Re-fetch callers list to update Admin grid
      await fetchCallers();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add caller';
      throw new Error(message);
    }
  };

  // Allocate Leads (Admin action calling server API to safely batch update)
  const allocateLeads = async (callerId: string, count: number): Promise<number> => {
    try {
      const response = await fetch('/api/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerId, count })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Re-fetch summary stats to sync admin dashboard
      await fetchSummaryStats();
      return data.allocatedCount || 0;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to allocate leads';
      throw new Error(message);
    }
  };

  // Update Member details (Caller action editing direct RLS-protected columns)
  const updateMember = async (
    memberId: number,
    updates: Partial<Pick<Member, 'call_status' | 'address' | 'occupation'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('members')
        .update({
          call_status: updates.call_status,
          address: updates.address,
          occupation: updates.occupation,
          updated_at: new Date().toISOString(),
          updated_by: currentUser?.id || null
        })
        .eq('id', memberId);

      if (error) {
        throw new Error(error.message);
      }

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save member details';
      throw new Error(message);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        callers,
        members,
        summaryStats,
        fetchCallers,
        fetchSummaryStats,
        fetchMembersPaginated,
        fetchMembersSequentially,
        login,
        logout,
        addCaller,
        allocateLeads,
        updateMember
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
