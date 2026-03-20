# Arquitetura do Sistema — FastCook

O FastCook emprega uma arquitetura moderna, com clara separação entre cliente e servidor para garantir segurança máxima (DevSecOps) e conformidade com privacidade desde a conceção.

## Diagrama de Sequência (Fluxo Principal)

O diagrama abaixo ilustra o ciclo de vida de um pedido de receita por voz, demonstrando como a arquitetura isola a Cloud de IA do cliente final e impede abusos.

```mermaid
sequenceDiagram
    autonumber
    
    actor Utilizador as Utilizador
    actor Utilizador as Utilizador
    box Cloud Segura (VPC Dockerizada)
        participant Frontend as Nginx WebServer (React+Vite)
        participant SW as Service Worker (PWA Cache)
        participant Backend as Node.js / Fastify (Contentor Seguro)
        participant Redis as Redis (Rate Limit & In-Memory Cache)
    end
    box API Gateway/Third Party
        participant Groq as Groq AI (Llama 3)
        participant Supabase as Supabase (PostgreSQL)
    end

    %% Passo 0: Autenticação (Opcional)
    Utilizador->>Frontend: Clica "Entrar com Google"
    Frontend->>Supabase: signInWithOAuth (Google Provider)
    Supabase-->>Frontend: Redirect OAuth → JWT (access_token)
    note over Frontend: JWT armazenado pelo Supabase SDK.<br/>Enviado como Bearer Token em todas as chamadas API.

    %% Passo 1: Captura
    Utilizador->>Frontend: Dita ("Quero um bolo...") ou Digita ingredientes e seleciona Restrições Alimentares
    note over Frontend: Web Speech API transcreve áudio em caso de voz.<br/>Tanto texto digitado quanto voz usam o mesmo canal híbrido.
    
    %% Passo 2: Request Seguro (via SW)
    Frontend->>SW: POST /api/v1/recipes + Bearer Token (Texto Higienizado)
    note over SW: Service Worker interceta o pedido.<br/>Estratégia: NetworkFirst com fallback para cache offline.
    SW->>Backend: Reencaminha para o servidor (se online)
    
    %% Passo 3: Segurança no Backend
    activate Backend
    Backend->>Redis: 🛡️ Incrementa contador Rate Limit
    Backend->>Backend: 🔑 Auth Middleware (Valida JWT via supabaseAdmin.auth.getUser)
    Backend->>Backend: 🛡️ Validação Zod (Bloqueia injeções '<>' '[]' '{}')
    Backend->>Supabase: 📦 (Se Válido) Query "user_pantry", "plan_type" para buscar contexto
    Backend->>Backend: 🛡️ Prompt Shield (Sanitiza e injeta Restrições + Despensa no LLM)
    
    %% Passo 4: Verificação de Cache Distribuído
    Backend->>Redis: Verifica Cache Hit (GET recipe:{ingredientes})
    activate Redis
    
    alt Encontrado no Cache
        Redis-->>Backend: Retorna receita em JSON (Instantâneo)
        Backend-->>SW: HTTP 200 via SSE Bypass (Receita)
        SW-->>Frontend: Receita imediata
    else Abuso Detetado (Shield / Rate Limit)
        Backend-->>Frontend: HTTP 429 ou 422
        Frontend-->>Utilizador: Alerta UX amigável ("Tente novamente" / "Input Inválido")
    else Não Encontrado (Cache Miss)
        Redis-->>Backend: Null
        deactivate Redis
        
        %% Passo 5: LLM Stream & Degradação Graciosa
        alt Rate Limit Normal (<5 requests)
           Backend->>Groq: Envia prompt (modelo: llama-3.3-70b-versatile)
        else Rate Limit Excedido (>5 requests)
           Backend->>Groq: Envia prompt (modelo: llama3-8b-8192) - Degradação Graciosa
        end
        activate Groq
        
        %% Passo 6: Server-Sent Events (SSE) Streaming
        Groq-->>Backend: Stream iterável (chunks JSON)
        Backend-->>SW: Chunks via SSE (text/event-stream)
        SW-->>Frontend: Recebe chunks em tempo real
        Frontend-->>Utilizador: Efeito máquina de escrever na UI
        deactivate Groq
        
        %% Passo 7: Guardar no Histórico (No final do Stream)
        Backend-)Supabase: Insere JSON completo no banco (Histórico de Utilizador)
        Backend-)Redis: Guarda cache final do LLM (TTL 24h)
        note over Backend,Supabase: Se user_id presente,<br/>associa receita ao histórico após o evento 'done'.
    end
    deactivate Backend
    
    %% Passo 8: Renderização
    Frontend-->>Utilizador: Exibe a receita no RecipeCard (UI visual com badges e passos)
    
    %% Passo 9: Histórico (Leitura Direta via RLS)
    Utilizador->>Frontend: Clica "Histórico"
    Frontend->>Supabase: SELECT recipes_cache WHERE user_id = auth.uid() (via ANON_KEY + JWT)
    note over Frontend,Supabase: RLS garante que cada utilizador<br/>apenas vê as suas próprias receitas.
    Supabase-->>Frontend: Lista de receitas do utilizador
    Frontend-->>Utilizador: Exibe RecipeCards do histórico
    
    %% Cenário Offline
    note over SW: Se offline: devolve receitas previamente cacheadas<br/>ou a App Shell estática (HTML/CSS/JS).
```

## Porquê esta Arquitetura?

1. **Cliente 'Burro' (Zero Trust):** O frontend (React) nunca fala diretamente com o Groq (IA) nem tem permissões de escrita genéricas no Supabase. O Frontend apenas possui a `ANON_KEY` restrita por RLS.
2. **Backend Protetor (Shield):** O Fastify atua como middleware de segurança. Ele impõe limites de uso (Rate Limiting) e aplica o *Prompt Shield* para garantir que utilizadores não fazem "jailbreak" ao modelo de IA.
3. **Autenticação JWT (Zero Trust no Backend):** O Backend nunca confia no Frontend cegamente. O middleware `optionalAuth` valida o Bearer Token JWT via `supabaseAdmin.auth.getUser()` antes de associar receitas ao histórico de um utilizador. Sem token válido, o utilizador usa a app como anónimo (sem histórico). Consulte [`docs/auth_e_rbac.md`](./auth_e_rbac.md).
4. **Desempenho (Cache Inteligente):** A utilização do `recipes_cache` no Supabase economiza dramáticamente tokens da API do Groq mitigando custos, ao mesmo tempo que reduz a latência para os utilizadores finais em casos de receitas populares (ex: "Bolo de chocolate").
5. **LGPD/RGPD by Design:** O processamento da fala ocorre no browser ou não persiste o áudio, e nenhum dado sensível dos clientes interseta o contexto do LLM.
6. **PWA Offline (Service Worker):** O `vite-plugin-pwa` gera automaticamente um Service Worker (Workbox) que coloca em *precache* todos os ativos estáticos (App Shell) e aplica uma estratégia **NetworkFirst** para respostas da API. Isto permite que a aplicação seja **instalável** no telemóvel e continue funcional em modo offline, devolvendo receitas previamente consultadas a partir da cache local do browser. Consulte a documentação detalhada em [`docs/pwa_e_performance.md`](./pwa_e_performance.md).
