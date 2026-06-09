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

interface AppContextType {
  currentUser: Caller | null;
  callers: Caller[];
  members: Member[];
  login: (email: string, role: 'admin' | 'caller') => Promise<boolean>;
  logout: () => void;
  addCaller: (name: string, email: string) => Promise<boolean>;
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
  const [members, setMembers] = useState<Member[]>([]);

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

  // 2. Helper to fetch ALL members in pages (Admin only - bypasses the 1,000 rows PostgREST limit)
  const fetchAllMembers = async () => {
    let allMembers: Member[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .range(from, from + limit - 1)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching members batch:', error.message);
        break;
      }

      if (data && data.length > 0) {
        allMembers = [...allMembers, ...data];
        from += limit;
        if (data.length < limit) {
          hasMore = false; // reached the end
        }
      } else {
        hasMore = false;
      }
    }
    setMembers(allMembers);
  };

  // 3. Helper to fetch assigned leads only (Caller only)
  const fetchAssignedLeads = async (callerId: string) => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('assigned_to', callerId)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching assigned leads:', error.message);
      return;
    }
    if (data) {
      setMembers(data);
    }
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
            fetchAllMembers();
          } else {
            fetchAssignedLeads(profile.id);
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
            fetchAllMembers();
          } else {
            fetchAssignedLeads(profile.id);
          }
        }
      } else {
        setCurrentUser(null);
        setMembers([]);
        setCallers([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login Handler (Supabase Auth email/password)
  const login = async (email: string, role: 'admin' | 'caller'): Promise<boolean> => {
    try {
      const defaultPassword = email.split('@')[0]; // Auto-generate simple password using email prefix
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: defaultPassword
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
  const addCaller = async (name: string, email: string): Promise<boolean> => {
    try {
      const defaultPassword = email.split('@')[0]; // Default password is the username
      
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

      // Re-fetch members list to sync admin dashboard
      await fetchAllMembers();
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

      // Update local state arrays to reflect updates instantly
      setMembers(prev =>
        prev.map(m => (m.id === memberId ? { ...m, ...updates } : m))
      );
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
