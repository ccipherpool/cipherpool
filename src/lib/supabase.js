import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Erreur silencieuse en production — visible seulement en dev
  if (import.meta.env.DEV) {
    console.error('❌ Missing Supabase credentials — check your .env file');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: true,
  },
});

// Helper pour vérifier les permissions via RPC
export const checkPermission = async (userId, requiredRole) => {
  const { data, error } = await supabase.rpc('check_user_permission', {
    user_id:       userId,
    required_role: requiredRole,
  });
  if (error) return false;
  return data;
};