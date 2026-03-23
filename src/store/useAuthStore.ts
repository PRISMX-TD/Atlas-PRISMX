import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  session: any | null;
  profile: UserProfile | null;
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  setUser: (user) => {
    set({ user });
    if (user) {
      get().fetchProfile(user.id);
    } else {
      set({ profile: null });
    }
  },
  setSession: (session) => set({ session }),
  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      set({ profile: data });
    }
  },
  updateProfile: async (updates) => {
    const { user, profile } = get();
    if (!user) return;
    
    // Check if user exists in the custom users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
      
    if (!existingUser) {
      // Create user record if it doesn't exist
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: updates.name || profile?.name || user.email?.split('@')[0] || '旅行者',
          ...updates
        })
        .select()
        .single();
        
      if (insertError) throw insertError;
      if (newProfile) set({ profile: newProfile });
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
      
    if (!error && data) {
      set({ profile: data });
    } else {
      throw error || new Error('Failed to update profile');
    }
  },
  isLoading: true,
  setLoading: (isLoading) => set({ isLoading }),
}));
