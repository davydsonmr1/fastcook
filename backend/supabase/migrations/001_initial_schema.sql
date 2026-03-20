-- ══════════════════════════════════════════════════════════════════
-- FastCook — Schema Inicial do Supabase
-- Migração: 001_initial_schema.sql
--
-- Segurança: RLS ativo em todas as tabelas desde o dia zero.
-- Conformidade: LGPD/RGPD — dados de utilizadores isolados por uid.
-- ══════════════════════════════════════════════════════════════════


-- ── Extensões ──────────────────────────────────────────────────────
-- pgcrypto: necessário para gen_random_uuid() em versões < PG 13
-- (Supabase já usa PG 15+, mas incluímos por boa prática)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ══════════════════════════════════════════════════════════════════
-- TABELA 1: profiles
-- Sincronizada com auth.users via trigger.
-- Armazena dados públicos do perfil (Google OAuth).
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.profiles (
  -- PK referencia auth.users — eliminar o perfil ao eliminar o user
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  display_name  TEXT,
  avatar_url    TEXT,

  -- Email único — importante para LGPD (identificação do titular)
  email         TEXT        UNIQUE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários LGPD/RGPD na tabela e colunas
COMMENT ON TABLE  public.profiles             IS 'Perfis de utilizadores — dados pessoais sujeitos à LGPD/RGPD.';
COMMENT ON COLUMN public.profiles.id          IS 'FK para auth.users(id). Nenhum dado pessoal armazenado aqui.';
COMMENT ON COLUMN public.profiles.email       IS 'Dado pessoal — identificador do titular de dados (LGPD Art. 5).';
COMMENT ON COLUMN public.profiles.display_name IS 'Nome de exibição proveniente do Google OAuth.';

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── Row Level Security — profiles ──────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: utilizador vê apenas o seu próprio perfil
CREATE POLICY "profiles: select own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Política: utilizador atualiza apenas o seu próprio perfil
CREATE POLICY "profiles: update own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Nota: INSERT é feito exclusivamente pelo trigger handle_new_user (abaixo)
-- Nota: DELETE não é permitido por policy — utilizador usa "eliminar conta" no backend


-- ── Trigger: auto-cria perfil ao registar novo utilizador ──────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY DEFINER: função corre com permissões do owner (postgres),
-- não do utilizador que disparou o trigger. Necessário pois auth.users
-- é um schema interno do Supabase.
CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ══════════════════════════════════════════════════════════════════
-- TABELA 2: recipes_cache
-- Cache de respostas da API do Groq.
-- Economiza tokens e reduz latência para queries repetidas.
-- Dados: não pessoais — não contém informação do utilizador.
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.recipes_cache (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Hash SHA-256 da query normalizada — garante deduplicação eficiente
  -- e evita injeção SQL via query direta.
  query_hash    TEXT        NOT NULL UNIQUE,

  -- Texto original da query (para debug/auditoria)
  query_text    TEXT        NOT NULL,

  -- Resposta completa do Groq em JSON estruturado
  response_data JSONB       NOT NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- TTL: o cache expira após 7 dias por padrão
  -- O backend verifica este campo antes de usar o cache.
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Índice para pesquisa rápida por hash (lookup O(1) amortizado)
CREATE INDEX IF NOT EXISTS idx_recipes_cache_query_hash
  ON public.recipes_cache(query_hash);

-- Índice para limpeza de cache expirado (job agendado futuro)
CREATE INDEX IF NOT EXISTS idx_recipes_cache_expires_at
  ON public.recipes_cache(expires_at);

COMMENT ON TABLE  public.recipes_cache             IS 'Cache de receitas geradas pelo Groq. Sem dados pessoais.';
COMMENT ON COLUMN public.recipes_cache.query_hash  IS 'Hash SHA-256 da query normalizada. Garante deduplicação.';
COMMENT ON COLUMN public.recipes_cache.expires_at  IS 'TTL do cache. Backend deve ignorar registos expirados.';


-- ── Row Level Security — recipes_cache ────────────────────────────
ALTER TABLE public.recipes_cache ENABLE ROW LEVEL SECURITY;

-- Política: qualquer utilizador AUTENTICADO pode LER o cache
-- (dados não pessoais — receitas genéricas)
CREATE POLICY "recipes_cache: select authenticated"
  ON public.recipes_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: APENAS a service_role (nosso backend Fastify) pode INSERIR
-- O frontend NUNCA comunica diretamente com o Groq — passa sempre pelo backend.
-- A service_role não está sujeita a RLS, mas criamos a policy explicitamente
-- para documentar a intenção de segurança.
CREATE POLICY "recipes_cache: insert service_role only"
  ON public.recipes_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política: service_role pode DELETAR entradas expiradas (manutenção)
CREATE POLICY "recipes_cache: delete service_role only"
  ON public.recipes_cache
  FOR DELETE
  TO service_role
  USING (true);


-- ══════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- Listar tabelas e policies criadas (executar no SQL Editor para confirmar)
-- ══════════════════════════════════════════════════════════════════
-- SELECT schemaname, tablename, rowsecurity
--   FROM pg_tables
--  WHERE schemaname = 'public';
--
-- SELECT schemaname, tablename, policyname, roles, cmd, qual
--   FROM pg_policies
--  WHERE schemaname = 'public';
