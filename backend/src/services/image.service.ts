import * as fal from '@fal-ai/serverless-client';
import { env } from '../config/env.js';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  Geração de Imagens (Fal.ai + Flux)                          ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Executa um modelo ultrarrápido (Flux) para gerar a foto    ║
 * ║  usando o nome do prato obtido pelo LLM.                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
export async function generateRecipeImage(recipeName: string): Promise<string | null> {
  // Mock fallback Se a API KEY não existir para não quebrar em dev local se o env faltar
  if (!env.FAL_KEY) {
     console.warn('FAL_KEY não está configurada! Retornando imagem de mockup.');
     return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c';
  }

  try {
    const prompt = `Professional food photography of ${recipeName}, cinematic lighting, depth of field, appetizing, high resolution, soft dark elegant background, sharp focus, viewed from a slight angle.`;

    // Timeout de Resiliência: previne 502 Bad Gateway no SSE do Fastify limitando a espera da cloud (max 8s)
    const timeoutPromise = new Promise<{ images: Array<{ url: string }> }>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout na geração da imagem pelo Fal.ai (8s excedidos)')), 8000);
    });

    const falPromise = fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
        image_size: 'square_hd',
        num_inference_steps: 4,
      },
      logs: false,
      onQueueUpdate: () => {},
    }) as Promise<{ images: Array<{ url: string }> }>;

    // O Promise.race força a paragem se a API trancar indefinidamente.
    const result = await Promise.race([falPromise, timeoutPromise]);

    if (result.images && result.images.length > 0) {
      return result.images[0].url;
    }
    return null;
  } catch (error) {
    console.error('Falha ao gerar imagem da receita no Fal.ai:', error instanceof Error ? error.message : error);
    // Retorno null permite ao fluxo (fallback silencioso) finalizar sem arrebentar
    return null;
  }
}
