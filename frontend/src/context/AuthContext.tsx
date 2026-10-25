import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/api';
import { StudentProfile, TPGroup } from '../types';

interface AuthContextType {
  user: any | null;
  profile: StudentProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, fullName: string, tpGroup?: TPGroup) => Promise<void>;
  logout: () => Promise<void>;
  loginAsDemo: () => Promise<void>;
  updateProfile: (updated: Partial<StudentProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const res = await apiClient.getProfile();
      if (res.profile) setProfile(res.profile);
    } catch (err) {
      console.warn('Could not fetch profile:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        refreshProfile();
      } else {
        // Load demo user profile by default for immediate functionality
        refreshProfile();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) refreshProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    setUser(data.user);
    await refreshProfile();
  };

  const signup = async (email: string, pass: string, fullName: string, tpGroup: TPGroup = 'G1') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: fullName, tp_group: tpGroup },
      },
    });
    if (error) throw error;
    setUser(data.user);
    await refreshProfile();
  };

  const loginAsDemo = async () => {
    await login('mgsi.student@gmail.com', 'Password123!');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updated: Partial<StudentProfile>) => {
    const res = await apiClient.updateProfile(updated);
    if (res.profile) setProfile(res.profile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        signup,
        logout,
        loginAsDemo,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
