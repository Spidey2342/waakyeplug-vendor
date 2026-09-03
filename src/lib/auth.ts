import { supabase } from './supabase';

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string;
  role: 'customer' | 'vendor' | 'rider' | 'admin';
  created_at: string;
};

// There is no self-registration here — you're the only admin, and your
// one account is created once, directly in Supabase (see setup notes).
export async function loginAdmin({ email, password }: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}