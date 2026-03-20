-- ══════════════════════════════════════════════════════════════════
-- FlashCook — Migração 004: SaaS e Comunidade
--
-- 1. Monetização (Stripe): Campos de assinatura na tabela profiles.
-- 2. Conteúdo Visual: URL de imagem no histórico.
-- 3. Comunidade: Visibilidade (is_public) e 'Likes'.
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Perfis de Utilizador: Integração Stripe ──
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT;


-- ── 2. Receitas: Imagem e Visibilidade ──
ALTER TABLE public.recipes_cache
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Permitir que utilizadores atualizem o is_public nas suas receitas
CREATE POLICY "recipes_cache: update own public"
  ON public.recipes_cache
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Permitir leitura de receitas públicas por qualquer pessoa (Community Feed)
CREATE POLICY "recipes_cache: select public recipes"
  ON public.recipes_cache
  FOR SELECT
  USING (is_public = true);


-- ── 3. Tabela Comunitária: Likes ──
CREATE TABLE IF NOT EXISTS public.recipe_likes (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.recipes_cache(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Evitar dual likes do mesmo utilizador na mesma receita
  PRIMARY KEY (user_id, recipe_id)
);

-- Ativar RLS
ALTER TABLE public.recipe_likes ENABLE ROW LEVEL SECURITY;

-- Select (Todos podem ver likes)
CREATE POLICY "recipe_likes: select all"
  ON public.recipe_likes
  FOR SELECT
  USING (true);

-- Insert/Delete (Apenas o próprio utilizador)
CREATE POLICY "recipe_likes: insert own"
  ON public.recipe_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "recipe_likes: delete own"
  ON public.recipe_likes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
