import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types/admin';
import type { Database } from '../types/database.types';
import type { Session } from '@supabase/supabase-js';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  user: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, role?: 'professor' | 'student') => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  const row = data as ProfileRow;
  return {
    id: row.id,
    role: row.role as 'professor' | 'student',
    displayName: row.display_name,
    email: row.email,
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
  };
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      set({ user: profile, session, isAuthenticated: true, isLoading: false });
    } else {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      // IMPORTANT: this callback runs while supabase-js holds the GoTrue auth
      // lock. Awaiting any Supabase call here (incl. the JWT-attach on every
      // .from() query) deadlocks the whole client. Mark auth state synchronously
      // and defer the profile fetch to a macrotask so the lock is released first.
      if (session?.user) {
        set({ session, isAuthenticated: true });
        const userId = session.user.id;
        setTimeout(async () => {
          const profile = await fetchProfile(userId);
          set({ user: profile });
        }, 0);
      } else {
        set({ user: null, session: null, isAuthenticated: false });
      }
    });
  },

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  },

  signup: async (email, password, role: 'professor' | 'student' = 'professor') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role } },
    });
    if (error) return { error: error.message };
    // If email confirmation is enabled, the user won't have a session yet
    if (data.user && !data.session) {
      return { error: 'Check your email to confirm your account, then sign in.' };
    }
    return {};
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAuthenticated: false });
  },
}));
