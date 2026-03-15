import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CLIENTE SUPABASE — FRONTEND (anon / público)               ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║                                                              ║
 * ║  ✅  Este cliente usa a ANON_KEY (chave pública).            ║
 * ║  É seguro expô-la ao browser pois:                          ║
 * ║  1. Está sujeita ao Row Level Security (RLS).               ║
 * ║  2. Usuários só acedem aos seus próprios dados.             ║
 * ║  3. Operações de escrita sensíveis passam pelo backend.     ║
 * ║                                                              ║
 * ║  🔴 A ANON_KEY NÃO substitui a SERVICE_ROLE_KEY.            ║
 * ║  🔴 Nunca adicione GROQ_API_KEY ou SERVICE_ROLE_KEY aqui.   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. ' +
    'Copie frontend/.env.example para frontend/.env e preencha os valores.',
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persiste a sessão no localStorage para manter o login após refresh.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
