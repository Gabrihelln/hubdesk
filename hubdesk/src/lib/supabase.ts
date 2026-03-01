import { createClient } from '@supabase/supabase-js';

const sanitize = (val: any) => {
  if (!val || typeof val !== 'string') return "";
  return val.trim().replace(/^['"]|['"]$/g, "");
};

const supabaseUrl = sanitize(import.meta.env?.VITE_SUPABASE_URL);
const supabaseAnonKey = sanitize(import.meta.env?.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing from client-side environment variables.");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);
