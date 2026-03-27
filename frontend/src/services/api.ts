import { supabase } from '../lib/supabase';

export interface RecipeResponse {
  name: string;
  prepTime: string;
  difficulty: number;
  steps: string[];
  imageUrl?: string;
}

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/** Tenta acordar o backend (Render cold start) antes de enviar a request real */
async function warmUpBackend(apiUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${apiUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Função responsável por comunicar com o backend seguro Fastify.
 * Interceta os códigos HTTP de segurança e converte para mensagens UX-friendly.
 * Envia o Bearer Token JWT do Supabase (se autenticado) para persistir no histórico.
 *
 * Inclui resiliência a cold-starts do Render (retry automático com warm-up).
 */
export async function generateRecipe(
  ingredients: string,
  onChunk?: (text: string) => void,
  onStatus?: (msg: string) => void,
  dietaryRestrictions?: string
): Promise<RecipeResponse> {
  const rawApiUrl = typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL !== ''
      ? import.meta.env.VITE_API_URL
      : 'http://localhost:3000';

  // Ouroboros Prevention: Previne concatenação dupla na Vercel/Render (ex: URL/api/v1/api/v1/recipes)
  const apiUrl = rawApiUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');

  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const MAX_RETRIES = 2;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        onStatus?.('🧠 A inteligência artificial está a acordar (pode demorar até 1 minuto na primeira vez)...');
        await warmUpBackend(apiUrl);
      }

      const response = await fetch(`${apiUrl}/api/v1/recipes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ingredients, dietary_restrictions: dietaryRestrictions }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new ApiError(
            429,
            'Atingiu o limite de receitas. Aguarde um momento e tente novamente mais tarde.'
          );
        }

        if (response.status === 422 || response.status === 400) {
          throw new ApiError(
            response.status,
            'Hum, não percebi ingredientes válidos. Por favor, tente falar os nomes dos alimentos claramente.'
          );
        }
        
        if (response.status === 404) {
          throw new ApiError(
            404,
            'Serviço não encontrado (404). Por favor, contacte o suporte ou reveja a infraestrutura.'
          );
        }

        throw new ApiError(response.status, 'Serviço temporariamente indisponível. Tente novamente mais tarde.');
      }

      if (!response.body) {
        throw new ApiError(500, 'Não foi possível aceder ao stream de dados.');
      }

      onStatus?.('');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let imageUrl: string | undefined;

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
              }
              if (parsed.imageUrl) {
                imageUrl = parsed.imageUrl;
              }

              if (onChunk && (parsed.chunk || parsed.imageUrl)) {
                 // Injetar pseudo-propriedade na string JSON incompleta/completa para a SkeletonUI detetar imediatamente
                 let textToYield = fullText;
                 if (imageUrl && fullText.trim().endsWith('}')) {
                    textToYield = `${fullText.trim().slice(0, -1)},"imageUrl":"${imageUrl}"}`;
                 } else if (imageUrl) {
                    textToYield = `${fullText},"imageUrl":"${imageUrl}"}`;
                 }
                 onChunk(textToYield);
              }
            } catch (e) {
              if (e instanceof ApiError) throw e;
            }
          }
        }
      }

      try {
        const parsedResponse = JSON.parse(fullText) as RecipeResponse;
        if (imageUrl) {
          parsedResponse.imageUrl = imageUrl;
        }
        return parsedResponse;
      } catch {
        throw new ApiError(500, 'Erro ao processar a receita gerada.');
      }
    } catch (error) {
      lastError = error;

      // Erros de negócio (4xx, ApiError) não devem ser retried
      if (error instanceof ApiError) {
        throw error;
      }

      // Erro de rede (cold start / CORS) — retry se ainda houver tentativas
      if (error instanceof TypeError && attempt < MAX_RETRIES) {
        console.warn(`[Cold Start] Tentativa ${attempt + 1} falhou, retrying...`, error);
        continue;
      }

      // Esgotou os retries
      if (error instanceof TypeError) {
        console.error('[Network Issue] Falha ao contactar a API em:', apiUrl, error);
        throw new ApiError(
          0,
          'O servidor está a demorar a responder (possível arranque a frio). '
          + 'Aguarde cerca de 1 minuto e tente novamente.'
        );
      }

      throw new ApiError(500, 'Ocorreu um erro inesperado ao gerar a receita.');
    }
  }

  // Fallback (nunca deveria chegar aqui)
  throw lastError instanceof ApiError
    ? lastError
    : new ApiError(500, 'Erro inesperado após múltiplas tentativas.');
}
