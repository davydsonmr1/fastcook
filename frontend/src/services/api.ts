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
 */
export async function generateRecipe(ingredients: string): Promise<RecipeResponse> {
  // Lemos a URL através das variáveis padrão do Vite
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  try {
    const response = await fetch(`${apiUrl}/api/v1/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

    const data = await response.json();
    return data as RecipeResponse;
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
