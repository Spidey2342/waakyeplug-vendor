import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentProfile, loginAdmin, logout as doLogout, type Profile } from '../lib/auth';

type AuthContextType = {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Every place a session gets loaded funnels through here, so the admin
  // check can never be skipped — not on fresh login, not on a restored
  // session from a previous visit.
  const applySessionIfAdmin = async () => {
    const profile = await getCurrentProfile();
    if (profile?.role === 'admin') {
      setUser(profile);
    } else {
      if (profile) await doLogout(); // a real, non-admin account was restored — kick it out
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    await applySessionIfAdmin();
  };

  useEffect(() => {
    let active = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && active) {
        await applySessionIfAdmin();
      }
      if (active) setLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await applySessionIfAdmin();
      } else {
        setUser(null);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await loginAdmin({ email, password });
      const profile = await getCurrentProfile();
      if (profile?.role !== 'admin') {
        await doLogout();
        return { success: false, message: 'This account is not an admin account.' };
      }
      setUser(profile);
      return { success: true };
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('email not confirmed')) {
        return { success: false, message: 'Please confirm your email before logging in.' };
      }
      if (msg.includes('invalid login credentials')) {
        return { success: false, message: 'Incorrect email or password.' };
      }
      return { success: false, message: err.message || 'Something went wrong signing in.' };
    }
  };

  const logout = async () => {
    await doLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}