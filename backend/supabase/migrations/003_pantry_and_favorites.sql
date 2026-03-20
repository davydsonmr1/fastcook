-- ══════════════════════════════════════════════════════════════════
-- FlashCook — Migração 003: Despensa Inteligente e Favoritos
--
-- 1. Adiciona "is_favorite" na tabela recipes_cache.
-- 2. Cria tabela "user_pantry" para guardar os ingredientes base.
-- 3. Políticas RLS rigorosas.
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Adicionar favorite no Histórico ──
ALTER TABLE public.recipes_cache
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- ── 2. Criar a tabela da Despensa Inteligente (Pantry) ──
CREATE TABLE IF NOT EXISTS public.user_pantry (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS
ALTER TABLE public.user_pantry ENABLE ROW LEVEL SECURITY;

-- ── 3. Políticas RLS para user_pantry ──
-- Select
CREATE POLICY "user_pantry: select own"
  ON public.user_pantry
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insert
CREATE POLICY "user_pantry: insert own"
  ON public.user_pantry
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update
CREATE POLICY "user_pantry: update own"
  ON public.user_pantry
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 4. Permitir Update no Histórico para toggles de is_favorite ──
-- Como auth.uid() só pode alterar is_favorite
CREATE POLICY "recipes_cache: update own favorite"
  ON public.recipes_cache
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
