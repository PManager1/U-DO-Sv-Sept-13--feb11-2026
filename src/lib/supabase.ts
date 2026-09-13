import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vpunfymjuwypwbrrkroa.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.error('⚠️ Missing VITE_SUPABASE_ANON_KEY! Check your local .env file.');
}

// Pass a non-empty fallback string if anon key is missing so the app mounts without crashing
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey || 'placeholder-anon-key'
);