# Infraestrutura de Produção (Docker) e Telemetria (Privacy-First)

Este documento dita como a iniciativa DevSecOps foi consolidada no nível de Infraestrutura e como a Observabilidade responde adequadamente sem minar dados do utilizador (RGPD Compliance).

## Setup Dockerizado

O **FlashCook** dispõe de orquestração via *Docker Compose* para unificar dependências. Ao correr no ambiente Enterprise, usamos um mecanismo de Containerização *multi-stage builds*.

### Backend (Node.js)
O backend usa a imagem `node:22-alpine`, instalando as dependências `npm ci` num estágio, e reciclando apenas a pasta compilada `dist/` noutro estágio sem privilégios *Root* (user: `nodeapp`).
Isto evita que scripts arbitrários escalem para acesso Shell à máquina "Host".

### Frontend (React + Nginx)
O Frontend compila via Vite num Stage primário e repousa numa imagem `nginx:alpine` no segundo.
Para além de servir o `index.html` estritamente com suporte *Single Page Application* (SPA), a imagem Docker injeta Headers cruciais para Defesa em Profundidade:
- **X-Frame-Options (SAMEORIGIN):** Previne Click-Jacking e iFrames fraudulentos;
- **Strict-Transport-Security:** Força comunicação HTTPS;
- **Cache agressiva:** Otimiza o Service Worker do PWA.

### Como Correr

Assegure que as chaves em `.env` estão partilhadas.

Para construir os *Containers* e rodar em *Background* (*detached*):
```bash
docker-compose up -d --build
```
Após o *healthcheck* do Backend ser dado como `healthy`, o Nginx (Frontend) ficará acessível em `http://localhost:5173`.

## Telemetria Anonimizada

Uma PWA moderna precisa de métricas, contudo os IP's ou payloads ditados (`"Tenho medicamentos no frigorífico que posso cozinhar?"`) revelam muito sobre os clientes diários.

O nosso formato optou pelo **Pino Logger Logger** — otimizado pela sua performance I/O — sem interceção PII (*Personal Identifiable Information*).
Logamos incidentes sob o standard de Objectos JSON:

1. **Geração (TELEMETRY_AI_GENERATION):** Reporta em milissegundos o tempo do Streaming `durationMs` sem revelar qual foi a receita exata ou email.
2. **Segurança (SECURITY_BLOCK):** Regista violações de payload `payloadSizeBytes` (Zod ou Jailbreaks). O IP da requisição não é mantido persistente no log do contentor.
3. **Billing Health (GRACEFUL_DEGRADATION):** Se forçado a alterar o modelo LLM por causa de exaustão de plafond, aciona um alerta explícito com o limite ultrapassado, notificando as métricas do Servidor sem prejudicar o estado visual (Erro HTTP 200 via SSE em vez de 429).
