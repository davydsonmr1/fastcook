import { createHash } from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  SERVIÇO SUPABASE — PERSISTÊNCIA DE RECEITAS                ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║                                                              ║
 * ║  Grava receitas na tabela recipes_cache associadas ao       ║
 * ║  user_id do utilizador autenticado.                         ║
 * ║                                                              ║
 * ║  Utiliza a SERVICE_ROLE_KEY (admin) para contornar RLS      ║
 * ║  e escrever diretamente. O user_id foi previamente          ║
 * ║  validado pelo auth.middleware via JWT.                      ║
 * ║                                                              ║
 * ║  ⚠️  Esta função é fire-and-forget (não bloqueia a          ║
 * ║     resposta ao utilizador). Erros são logados, não         ║
 * ║     propagados.                                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
export async function saveRecipeToHistory(
  userId: string,
  queryText: string,
  recipeData: unknown,
  imageUrl?: string | null
): Promise<void> {
  const normalized = queryText.toLowerCase().trim();
  const queryHash = createHash('sha256').update(normalized).digest('hex');

  const { error } = await supabaseAdmin
    .from('recipes_cache')
    .insert({
      query_hash: queryHash,
      query_text: queryText,
      response_data: recipeData,
      user_id: userId,
      image_url: imageUrl,
    });

  if (error) {
    console.error('Erro ao guardar receita no histórico:', error.message);
  }
}

export async function getUserPantry(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('user_pantry')
    .select('ingredients')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return [];
  }
  return data.ingredients;
}
