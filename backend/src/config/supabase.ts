import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const createScopedClient = (token?: string) => {
  if (!token) return supabase;
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
