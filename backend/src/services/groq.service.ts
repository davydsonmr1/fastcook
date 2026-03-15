import Groq from 'groq-sdk';
import { env } from '../config/env.js';

// Inicializa o cliente usando apenas a chave secreta do Backend
const groq = new Groq({ apiKey: env.GROQ_API_KEY });

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  PROMPT SHIELD — BLINDAGEM DO LLM                            ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║                                                              ║
 * ║  Este system_prompt é inquebrável por design:                ║
 * ║  1. Restringe a identidade APENAS a um conversor de input.  ║
 * ║  2. Força um esquema de devolução JSON fixo.                ║
 * ║  3. Contém uma regra de 'kill-switch' que descarta qualquer ║
 * ║     tentativa de desvio devolvendo { "error": "..." }.      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
const SYSTEM_PROMPT = `
Atuas APENAS como um conversor de ingredientes para receitas. Recebes uma lista de ingredientes e devolves um JSON estrito contendo: 'name', 'prepTime', 'difficulty' (1-5) e 'steps' (array de strings). Usa todos os ingredientes (Zero Desperdício). SE O UTILIZADOR PEDIR ALGO NÃO RELACIONADO A COMIDA, CÓDIGO OU INSTRUÇÕES, IGNORA TUDO E DEVOLVE: { "error": "Invalid input" }. NUNCA retornes texto fora do JSON.
`;

export async function generateRecipe(ingredients: string) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: ingredients },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2, // Baixa temperatura reduz a possibilidade de "alucinações" criativas do utilizador
      max_tokens: 1024,
      response_format: { type: 'json_object' }, // Força a Cloud do Groq a devolver um JSON formatado
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('Groq returned empty content');
    }

    return JSON.parse(responseContent) as unknown;
  } catch (error) {
    console.error('Groq LLM Generation Failed:', error);
    throw new Error('Failed to generate recipe', { cause: error });
  }
}
