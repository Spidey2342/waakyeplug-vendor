import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Check .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
