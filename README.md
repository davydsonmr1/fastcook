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
</p>

---

## 🚀 Sobre o Projeto

O **FlashCook** é a evolução das aplicações de receitas. Não precisa de navegar por categorias infinitas ou blogs longos. Basta abrir a Web App e **ditar** o que tem no frigorífico. 

A Inteligência Artificial interpreta os seus ingredientes e o nosso Backend processa a receita ideal gerada quase instantaneamente, retornando a resposta em *Streaming*. Tudo isto num ambiente fortemente protegido contra injeções, abusos de API e fugas de dados, através de práticas rigorosas de **DevSecOps** e **LGPD/RGPD by design**.

### ✨ Features Principais

- 🎙️ **Voice-First Experience**: Diga o que tem. Web Speech API converte a fala sem armazenar áudio (LGPD).
- ♻️ **Zero Waste (Desperdício Zero)**: A IA do Groq prioriza receitas que utilizam *exclusivamente* o que você ditou.
- ⚡ **Streaming IA**: Interface reativa em tempo real. Sem barras de "loading" infinitas.
- 🛡️ **Segurança by Design**:
  - *Row Level Security (RLS)* no Supabase: Cada utilizador isolado.
  - *Prompt Shield* no Fastify: Prevenção contra Jailbreaks de LLM.
  - *Cache Inteligente*: Redução drástica de gastos de tokens e latência, protegida por *TTL (Time to Live)* e *Hashing*.

---

## 📚 Documentação Técnica (Docs as Code)

Mergulhe na engenharia por trás do FlashCook. Mantemos documentação extensiva construída em Markdown com diagramas automáticos Mermaid:

- 🏗️ **[Arquitetura do Sistema e Fluxo de IA](./docs/arquitetura.md)**
  Dita a receita -> Fastify Shield -> Groq AI -> Cache -> UI.
- 🔒 **[Segurança, Privacidade e LGPD/RGPD](./docs/seguranca_e_privacidade.md)**
  Explicação detalhada das barreiras de API, RLS e Eslint Security.

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
Execute o conteúdo do nosso ficheiro de migração inicial `backend/supabase/migrations/001_initial_schema.sql` diretamente no painel SQL do seu projeto Supabase para criar as tabelas `profiles` e `recipes_cache` com RLS ativo.

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

---

<p align="center">Construído com extrema segurança, arquitetura limpa e performance instantânea. ⚡</p>
