import React, { createContext, useCallback, useEffect, useState } from 'react';
import type {
  AuthResponse,
  AuthTokenResponsePassword,
  Session,
  User,
} from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import type { Profile } from '../types';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthTokenResponsePassword>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<Profile | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const cached = localStorage.getItem('wt_user_profile');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (): Promise<Profile | null> => {
    // 1. Direct Supabase Query (ultra-fast, ~50ms)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: sbProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (sbProfile) {
          setProfile(sbProfile as Profile);
          try {
            localStorage.setItem('wt_user_profile', JSON.stringify(sbProfile));
          } catch {}
          return sbProfile as Profile;
        }
      }
    } catch {}

    // 2. Backend API fallback
    try {
      const response = await api.get<Profile>('/profiles/me');
      setProfile(response.data);
      try {
        localStorage.setItem('wt_user_profile', JSON.stringify(response.data));
      } catch {}
      return response.data;
    } catch (error: unknown) {
      const status =
        (error as { status?: number })?.status ||
        (error as { response?: { status?: number } })?.response?.status;

      if (status === 404) {
        console.info('[Auth] User profile not found (404). Profile setup may be required.');
      } else {
        console.warn('[Auth] Failed to fetch profile:', error);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Check initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setIsLoading(false); // Render page instantly without blocking on profile fetch
          if (initialSession) {
            fetchProfile(); // Load profile non-blockingly
          }
        }
      } catch (error) {
        console.error('[Auth] Failed to initialize session:', error);
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen to Supabase Auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN') {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
        await fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
      } else {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<AuthResponse> => {
    const cleanEmail = email.trim().toLowerCase();
    return await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<AuthTokenResponsePassword> => {
    const cleanEmail = email.trim().toLowerCase();
    const result = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (result.data.session) {
      setSession(result.data.session);
      setUser(result.data.user);
      fetchProfile().catch((err) => console.warn('[Auth] Non-blocking profile fetch error:', err));
    }

    return result;
  };

  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: !!session,
    signUp,
    signIn,
    signOut,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
