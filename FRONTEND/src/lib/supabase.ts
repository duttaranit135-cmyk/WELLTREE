import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  'https://utfdzsucfgsvocoviroa.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0ZmR6c3VjZmdzdm9jb3Zpcm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMDY5MDcsImV4cCI6MjEwNjc4MjkwN30.C39V15zL8Z785ZomE1iC7xV1z7mI8GjT9bF_398eTQE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
