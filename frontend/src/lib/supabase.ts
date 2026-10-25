import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cdfgnvbcrwplszozfbso.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZmdudmJjcndwbHN6b3pmYnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODI0MDMsImV4cCI6MjA5OTk1ODQwM30.0AqZJqdf2DBjzBMzgLvORhpQ9FGeFXtoRHA_YOZqmiE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
