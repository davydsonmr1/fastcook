import { supabase } from '../lib/supabase';

export interface RecipeResponse {
  name: string;
  prepTime: string;
  difficulty: number;
  steps: string[];
}

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/**
 * Função responsável por comunicar com o backend seguro Fastify.
 * Interceta os códigos HTTP de segurança e converte para mensagens UX-friendly.
 * Envia o Bearer Token JWT do Supabase (se autenticado) para persistir no histórico.
 */
export async function generateRecipe(ingredients: string, onChunk?: (text: string) => void): Promise<RecipeResponse> {
  // Lemos a URL através das variáveis padrão do Vite. 
  // Usa typeof para evitar fallback se a string estiver vazia (relativa no Docker Nginx)
  const apiUrl = typeof import.meta.env.VITE_API_URL === 'string' 
      ? import.meta.env.VITE_API_URL 
      : 'http://localhost:3000'; // Alterado para bater no novo porta docker local

  // Obtém o token JWT do Supabase (se o utilizador estiver autenticado)
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  try {
    const response = await fetch(`${apiUrl}/api/v1/recipes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ingredients }),
    });

    if (!response.ok) {
      // 1. Erro de Rate Limit (Proteção DDoS / Quotas AI)
      if (response.status === 429) {
        throw new ApiError(
          429,
          'Atingiu o limite de receitas. Aguarde um momento e tente novamente mais tarde.'
        );
      }

      // 2. Erro de Prompt Shield / Zod (Detetada Injeção ou Input Bizarro)
      if (response.status === 422 || response.status === 400) {
        throw new ApiError(
          response.status,
          'Hum, não percebi ingredientes válidos. Por favor, tente falar os nomes dos alimentos claramente.'
        );
      }

      // 3. Fallback genérico para 500s ou outros erros não documentados
      throw new ApiError(response.status, 'Serviço temporariamente indisponível. Tente novamente mais tarde.');
    }

    if (!response.body) {
      throw new ApiError(500, 'Não foi possível aceder ao stream de dados.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunkStr = decoder.decode(value, { stream: true });
      const lines = chunkStr.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (!dataStr || dataStr === '{}') continue;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new ApiError(422, parsed.message || parsed.error);
            }
            if (parsed.chunk) {
              fullText += parsed.chunk;
              if (onChunk) onChunk(fullText);
            }
          } catch (e) {
            if (e instanceof ApiError) throw e;
            // Ignorar erro de parse da chunk individual caso esteja corrompida na transição
          }
        }
      }
    }

    try {
      return JSON.parse(fullText) as RecipeResponse;
    } catch {
      throw new ApiError(500, 'Erro ao processar a receita gerada.');
    }
  } catch (error) {
    // Se o erro provém de indisponibilidade de rede (Backend down)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(0, 'Não foi possível contactar o servidor. Verifique a sua ligação.');
    }
    
    // Repassa Erros customizados já formatados no bloco acima
    if (error instanceof ApiError) {
      throw error;
    }

    // Último recurso catch-all
    throw new ApiError(500, 'Ocorreu um erro inesperado ao gerar a receita.');
  }
}
