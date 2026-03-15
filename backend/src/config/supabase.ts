import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  CLIENTE SUPABASE — BACKEND (service_role)                  ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║                                                              ║
 * ║  ⚠️  ATENÇÃO: Este cliente usa a SERVICE_ROLE_KEY.           ║
 * ║                                                              ║
 * ║  A SERVICE_ROLE_KEY contorna COMPLETAMENTE o Row Level       ║
 * ║  Security (RLS) do Supabase. Isso é intencional para que    ║
 * ║  o backend possa escrever na tabela `recipes_cache` e        ║
 * ║  realizar operações administrativas.                         ║
 * ║                                                              ║
 * ║  🔴 NUNCA exponha esta chave ao frontend ou a logs públicos. ║
 * ║  🔴 NUNCA envie este cliente para o browser.                 ║
 * ║  🔴 NUNCA coloque SERVICE_ROLE_KEY em variáveis VITE_*.      ║
 * ║                                                              ║
 * ║  Uma fuga desta chave dá acesso de leitura e escrita         ║
 * ║  irrestrito a TODA a base de dados.                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      // Desativa a persistência de sessão — o backend é stateless.
      // O backend valida JWTs via cabeçalho Authorization, não cookies.
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);
