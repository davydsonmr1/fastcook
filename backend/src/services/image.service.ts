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

    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
        image_size: 'square_hd',
        num_inference_steps: 4,
      },
      logs: false,
      onQueueUpdate: () => {},
    }) as { images: Array<{ url: string }> };

    if (result.images && result.images.length > 0) {
      return result.images[0].url;
    }
    return null;
  } catch (error) {
    console.error('Falha ao gerar imagem da receita no Fal.ai:', error);
    return null;
  }
}
