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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (): Promise<Profile | null> => {
    try {
      const response = await api.get<Profile>('/profiles/me');
      setProfile(response.data);
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
      setProfile(null);
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
          if (initialSession) {
            await fetchProfile();
          }
        }
      } catch (error) {
        console.error('[Auth] Failed to initialize session:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
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
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<AuthTokenResponsePassword> => {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (result.data.session) {
      setSession(result.data.session);
      setUser(result.data.user);
      await fetchProfile();
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
