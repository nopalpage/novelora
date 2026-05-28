import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: "user" | "admin" | "owner";
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  session: Session | null;
  login: () => void;
  logout: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id, session.user.email || '');
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id, session.user.email || '');
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      
      setUser({
        id: userId,
        name: data?.username || email.split('@')[0],
        email: email,
        avatar: data?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        role: data?.role || "user"
      });
    } catch (err) {
      console.error('Failed to fetch user profile', err);
    } finally {
      setLoading(false);
    }
  };

  // We keep login as a void to just trigger any UI updates if needed, though actual login happens via supabase.auth
  const login = () => {
    // Managed by onAuthStateChange automatically
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // clear rememberMe
    localStorage.removeItem('rememberMe');
  };

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn: !!session, 
      user, 
      session, 
      login, 
      logout,
      token: session?.access_token || null
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

