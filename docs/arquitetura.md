# Arquitetura do Sistema — FlashCook

O FlashCook (SimpleRecipe 2.0) emprega uma arquitetura moderna, com clara separação entre cliente e servidor para garantir segurança máxima (DevSecOps) e conformidade com privacidade desde a conceção.

## Diagrama de Sequência (Fluxo Principal)

O diagrama abaixo ilustra o ciclo de vida de um pedido de receita por voz, demonstrando como a arquitetura isola a Cloud de IA do cliente final e impede abusos.

```mermaid
sequenceDiagram
    autonumber
    
    actor Utilizador as Utilizador
    participant Frontend as React + Vite (Web)
    participant Backend as Fastify (Node.js)
    box Cloud Segura (VPC)
        participant Groq as Groq AI (Llama 3)
        participant Supabase as Supabase (PostgreSQL)
    end

    %% Passo 1: Captura
    Utilizador->>Frontend: Dita a receita ("Quero um bolo com 2 ovos e farinha")
    note over Frontend: Web Speech API (useSpeech) transcreve áudio para texto em tempo real.<br/>Áudio NÃO sai do browser (LGPD).
    
    %% Passo 2: Request Seguro
    Frontend->>Backend: POST /api/v1/recipes (Texto Higienizado)
    
    %% Passo 3: Segurança no Backend
    activate Backend
    Backend->>Backend: 🛡️ Rate Limiting (Previne DDoS/Abuso)
    Backend->>Backend: 🛡️ Validação Zod (Bloqueia injeções '<>' '[]' '{}')
    Backend->>Backend: 🛡️ Prompt Shield (Sanitiza instruções ao LLM)
    
    %% Passo 4: Verificação de Cache
    Backend->>Supabase: Verifica recipes_cache (hash da query)
    activate Supabase
    
    alt Encontrado no Cache (TTL Válido)
        Supabase-->>Backend: Retorna receita em JSON
        Backend-->>Frontend: HTTP 200 (Receita)
    else Abuso Detetado (Shield / Rate Limit)
        Backend-->>Frontend: HTTP 429 ou 422
        Frontend-->>Utilizador: Alerta UX amigável ("Tente novamente" / "Input Inválido")
    else Não Encontrado (Cache Miss)
        Supabase-->>Backend: Null
        deactivate Supabase
        
        %% Passo 5: LLM (com chave secreta do Backend)
        Backend->>Groq: Envia prompt (apenas Backend tem GROQ_API_KEY)
        activate Groq
        Groq-->>Backend: Resposta JSON gerada
        deactivate Groq
        
        %% Passo 6: Guardar em Cache (Assíncrono)
        Backend-)Supabase: Insere no recipes_cache (usando SERVICE_ROLE_KEY)
        
        %% Passo 7: Resposta
        Backend-->>Frontend: HTTP 200 (Receita gerada)
    end
    deactivate Backend
    
    %% Passo 8: Renderização
    Frontend-->>Utilizador: Exibe a receita na UI ou JSON (MVP)
```

## Porquê esta Arquitetura?

1. **Cliente 'Burro' (Zero Trust):** O frontend (React) nunca fala diretamente com o Groq (IA) nem tem permissões de escrita genéricas no Supabase. O Frontend apenas possui a `ANON_KEY` restrita por RLS.
2. **Backend Protetor (Shield):** O Fastify atua como middleware de segurança. Ele impõe limites de uso (Rate Limiting) e aplica o *Prompt Shield* para garantir que utilizadores não fazem "jailbreak" ao modelo de IA.
3. **Desempenho (Cache Inteligente):** A utilização do `recipes_cache` no Supabase economiza dramáticamente tokens da API do Groq mitigando custos, ao mesmo tempo que reduz a latência para os utilizadores finais em casos de receitas populares (ex: "Bolo de chocolate").
4. **LGPD/RGPD by Design:** O processamento da fala ocorre no browser ou não persiste o áudio, e nenhum dado sensível dos clientes interseta o contexto do LLM.
