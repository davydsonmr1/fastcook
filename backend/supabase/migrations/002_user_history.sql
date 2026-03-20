-- ══════════════════════════════════════════════════════════════════
-- FastCook — Migração 002: Histórico de Receitas por Utilizador
--
-- Adiciona a coluna user_id à tabela recipes_cache para associar
-- receitas geradas a utilizadores autenticados (Google OAuth).
-- Atualiza políticas RLS para isolamento do histórico pessoal.
-- ══════════════════════════════════════════════════════════════════


-- ── 1. Adicionar coluna user_id (nullable — anónimos não têm) ──
ALTER TABLE public.recipes_cache
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Índice para consultas de histórico por utilizador (O(log N))
CREATE INDEX IF NOT EXISTS idx_recipes_cache_user_id
  ON public.recipes_cache(user_id);


-- ── 2. Remover UNIQUE em query_hash ────────────────────────────
-- A mesma receita pode ser gerada por múltiplos utilizadores.
-- O cache continua funcional por hash lookup (index não-único).
ALTER TABLE public.recipes_cache
  DROP CONSTRAINT IF EXISTS recipes_cache_query_hash_key;


-- ── 3. Atualizar políticas RLS ─────────────────────────────────

-- Remover política anterior (demasiado permissiva para histórico)
DROP POLICY IF EXISTS "recipes_cache: select authenticated" ON public.recipes_cache;

-- Nova política: cada utilizador vê APENAS o seu próprio histórico
CREATE POLICY "recipes_cache: select own history"
  ON public.recipes_cache
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO (executar no SQL Editor para confirmar):
--
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_name = 'recipes_cache';
--
-- SELECT policyname, cmd, qual
--   FROM pg_policies
--  WHERE tablename = 'recipes_cache';
-- ══════════════════════════════════════════════════════════════════
