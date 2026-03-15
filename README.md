<p align="center">
  <img src="https://raw.githubusercontent.com/davydsonmr1/fastcook/main/frontend/public/vite.svg" alt="FlashCook Logo" width="120" />
</p>

<h1 align="center">FlashCook</h1>
<p align="center"><strong>SimpleRecipe 2.0 — A PWA de receitas <i>Voice-First</i> gerida por Inteligência Artificial (Groq), focada em <i>Zero Waste</i> e construída sob perspetiva <i>DevSecOps</i>.</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Groq_AI-F55036?style=for-the-badge&logo=groq&logoColor=white" alt="Groq" />
  <img src="https://img.shields.io/badge/Security-DevSecOps-4a154b?style=for-the-badge" alt="Security" />
  <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA Ready" />
  <img src="https://img.shields.io/badge/Google_Auth-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Auth" />
</p>

---

## 🚀 Sobre o Projeto

O **FlashCook** é a evolução das aplicações de receitas. Não precisa de navegar por categorias infinitas ou blogs longos. Basta abrir a Web App e **ditar** o que tem no frigorífico. 

A Inteligência Artificial interpreta os seus ingredientes e o nosso Backend processa a receita ideal gerada quase instantaneamente, retornando a resposta em *Streaming*. Tudo isto num ambiente fortemente protegido contra injeções, abusos de API e fugas de dados, através de práticas rigorosas de **DevSecOps** e **LGPD/RGPD by design**.

### ✨ Features Principais

- 🎙️ **Voice-First Experience**: Diga o que tem. Web Speech API converte a fala sem armazenar áudio (LGPD).
- ♻️ **Zero Waste (Desperdício Zero)**: A IA do Groq prioriza receitas que utilizam *exclusivamente* o que você ditou.
- ⚡ **Streaming IA**: Interface reativa em tempo real. Sem barras de "loading" infinitas.
- � **PWA Instalável & Offline**: Instale no telemóvel como uma app nativa. Receitas já consultadas ficam disponíveis sem ligação à internet graças ao Service Worker (Workbox).- 🔐 **Login com Google**: Autenticação via Google OAuth (Supabase Auth). Quando logado, as receitas geradas ficam guardadas no seu histórico pessoal protegido por RLS.
- 📋 **Histórico de Receitas**: Consulte todas as suas receitas passadas. Os dados são isolados por utilizador — ninguém vê as suas receitas.
- 📤 **Partilha no WhatsApp**: Partilhe receitas com amigos num formato limpo (texto puro, sem IDs de base de dados expostos).- �🛡️ **Segurança by Design**:
  - *Row Level Security (RLS)* no Supabase: Cada utilizador isolado.
  - *Validação Extrema (Zod)*: Rejeição imediata via Regex de carateres perigosos (`{}`, `<>`, `[]`).
  - *Prompt Shield* no Fastify: System Prompt estrito previne Jailbreaks do LLM. Modo *Kill-Switch*.
  - *Rate Limiting*: 5 requests/hora com Degradação Graciosa informando os utilizadores em vez de Crash.
  - *Cache Inteligente*: Redução drástica de gastos de tokens e latência, protegida por *TTL (Time to Live)* e *Hashing*.

---

## 📚 Documentação Técnica (Docs as Code)

Mergulhe na engenharia por trás do FlashCook. Mantemos documentação extensiva construída em Markdown com diagramas automáticos Mermaid:

- 🏗️ **[Arquitetura do Sistema e Fluxo de IA](./docs/arquitetura.md)**
  Dita a receita -> Fastify Shield -> Groq AI -> Cache -> UI.
- 🔒 **[Segurança, Privacidade e LGPD/RGPD](./docs/seguranca_e_privacidade.md)**
  Explicação detalhada das barreiras de API, RLS e Eslint Security.
- 📲 **[PWA e Performance (Offline Cache)](./docs/pwa_e_performance.md)**
  Como o Service Worker é configurado, estratégias de cache e como testar a instalação.
- 🔑 **[Autenticação e Controlo de Acesso (RBAC)](./docs/auth_e_rbac.md)**
  Fluxo Google OAuth, validação JWT no Fastify middleware e como o RLS protege o histórico.

> **Regra Permanente do Projeto:** Todo o novo *feature-set* introduzido **obriga** a uma atualização coesiva no código, no diagrama de sequência e nesta documentação centralizada.

---

## 🛠️ Como Rodar Localmente

### Pré-requisitos
- Node.js (v20+)
- Conta no [Supabase](https://supabase.com/)
- Conta na [Groq Cloud](https://console.groq.com/) para obter a API Key.

### Instalação

**1. Clone o Repositório:**
```bash
git clone https://github.com/davydsonmr1/fastcook.git
cd fastcook
```

**2. Configure o Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Preencha o .env com SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e GROQ_API_KEY
```

**3. Configure a Base de Dados (Supabase SQL Editor):**
Execute os ficheiros de migração por ordem no painel SQL do seu projeto Supabase:
1. `backend/supabase/migrations/001_initial_schema.sql` — Cria tabelas `profiles` e `recipes_cache` com RLS ativo.
2. `backend/supabase/migrations/002_user_history.sql` — Adiciona `user_id` ao `recipes_cache` e atualiza políticas RLS para histórico.

**3.1. Configure o Google OAuth (Supabase Dashboard):**
- No dashboard Supabase, vá a **Authentication → Providers → Google**.
- Ative o provider e cole o `Client ID` e `Client Secret` obtidos na [Google Cloud Console](https://console.cloud.google.com/).
- Adicione `https://<project-ref>.supabase.co/auth/v1/callback` como URL de redirect autorizado no Google.
- Consulte o guia completo em [`docs/auth_e_rbac.md`](./docs/auth_e_rbac.md).

**4. Configure o Frontend:**
```bash
cd ../frontend
npm install
cp .env.example .env
# Preencha o .env APENAS com a VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (pública)
```

### Iniciar os Servidores (Modo Dev)

**Em terminais separados:**
```bash
# Terminal 1: Iniciar Fastify API (Backend)
cd backend && npm run dev

# Terminal 2: Iniciar React + Vite (Frontend)
cd frontend && npm run dev
```

Acesse via browser em `http://localhost:5173`. O servidor Fastify responderá em `http://localhost:3001`.

### Testar PWA (Build de Produção)

A PWA (Service Worker + Manifest) só está ativa no build de produção:

```bash
cd frontend
npm run build
npm run preview
```

Aceda a `http://localhost:4173`. No Chrome, abra **DevTools → Application → Service Workers** para verificar que o SW está ativo. Para instalar a app, clique no ícone ⊕ na barra de endereço ou use o menu do browser → "Instalar FlashCook".

Consulte o guia completo em [`docs/pwa_e_performance.md`](./docs/pwa_e_performance.md).

---

<p align="center">Construído com extrema segurança, arquitetura limpa e performance instantânea. ⚡</p>
