import { z } from 'zod';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  VALIDAÇÃO EXTREMA: PREVENÇÃO DE PROMPT INJECTION            ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║                                                              ║
 * ║  A validação de input é a primeira linha de defesa.         ║
 * ║  Esta regex proíbe caracteres tradicionalmente usados em    ║
 * ║  ataques de injeção de código, XSS e jailbreaks de LLMs:    ║
 * ║                                                              ║
 * ║  🚫 Não permitidos: < > { } [ ] $ " ' `                      ║
 * ║  ✅ Permitidos: letras, números, espaços, vírgulas, pontos.   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// Regex que permite apenas letras (incluindo acentos PT), números, espaços e alguns sinais de pontuação básicos
const safeStringRegex = /^[-a-zA-ZÀ-ÿ0-9\s,.]+$/;

export const recipeBodySchema = z.object({
  ingredients: z
    .string()
    .min(3, { message: 'A lista de ingredientes deve conter pelo menos 3 caracteres.' })
    .max(150, { message: 'A lista de ingredientes excede o limite máximo permitido (150 carateres).' })
    .regex(safeStringRegex, {
      message: 'Input inválido. Por favor, forneça ingredientes usando apenas letras e números. Evite símbolos especiais.',
    }),
});

export type RecipeBody = z.infer<typeof recipeBodySchema>;
