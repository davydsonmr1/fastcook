import { FastifyRequest } from 'fastify';
import { supabaseAdmin } from '../config/supabase.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MIDDLEWARE DE AUTENTICAÇÃO OPCIONAL (JWT Supabase)          ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║                                                              ║
 * ║  Extrai e valida o Bearer Token JWT do cabeçalho            ║
 * ║  Authorization enviado pelo Frontend.                        ║
 * ║                                                              ║
 * ║  ✅ Token válido: injeta request.userId (UUID do Supabase). ║
 * ║  ⚠️  Sem token / inválido: continua como anónimo.           ║
 * ║     A geração de receitas funciona, mas sem histórico.      ║
 * ║                                                              ║
 * ║  O Backend NUNCA confia cegamente no Frontend.              ║
 * ║  O JWT é verificado via supabaseAdmin.auth.getUser().       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
export async function optionalAuth(request: FastifyRequest): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return;
  }

  const token = authHeader.slice(7);

  if (!token) {
    return;
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      request.log.warn('Token JWT inválido ou expirado recebido.');
      return;
    }

    request.userId = user.id;
  } catch (err) {
    request.log.error({ err }, 'Erro ao validar JWT do Supabase.');
  }
}
