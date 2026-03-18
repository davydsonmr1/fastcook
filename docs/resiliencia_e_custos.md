# Resiliência Financeira e Controlo de Custos

O projeto FastCook adota uma arquitetura orientada ao isolamento e maximização da experiência de utilizador (UX) mesmo perante cenários de pico de acesso ou esgotamento de *tiers* de serviço.

A **Resiliência Financeira** do FastCook provém de um forte mecanismo de salvaguarda de faturação através da técnica de "Degradação Graciosa" ligada aos *Server-Sent Events* (SSE).

## 1. Problema de Faturação em LLM

Qualquer aplicação pública suscetível a interações ilimitadas de IA generativa corre o risco de abuso. Um utilizador ou *bot* malicioso poderia, submetendo receitas infinitas, causar a exaustão da cota da Groq API, estourando rapidamente limites seguros e gerando custos em Cloud ou erros 429 globais (Too Many Requests), afetando e isolando outros utilizadores.

A solução clássica de *Rate Limits* "rígidos" prejudica o utilizador comum: este recebe simplesmente um ecrã de erro frustrante informando-o de que não poderá cozinhar mais durante horas.

## 2. A Solução FastCook: Degradação Graciosa

O FastCook monitora a atividade por IP/Token em tempo real utilizando o `@fastify/rate-limit`. Quando um limite arbitrariamente seguro (ex: 5 receitas por hora) é excedido:

1. **Acesso Permitido, Nível Modificado:** Em vez de rejeitar o acesso e retornar `429 Too Many Requests`, o Fastify interceta a notificação que de quota alcançada mas continua o pedido (`continueExceeding: true`).
2. **Switch de Modelo (Fallback):** O serviço dinâmico de IA percebe que este utilizador entrou no "Modo de Poupança". O serviço degrada graciosamente as chamadas de API, alternando de um modelo maciço, "premium" e dispendioso (`llama-3.3-70b-versatile`) para um modelo muito menor e ligeiro, como o `llama3-8b-8192`.
3. **Equilíbrio UX e Custos:** O resultado ainda é satisfatório (as receitas continuam a ser entregues), mas de forma economicamente viável para quem administra o backend. O utilizador comum sequer se aperceberá da troca.

## 3. Streaming (Server-Sent Events)

Aliado ao Fallback de modelos, a conversação com a Groq API foi migrada de "Request/Response Síncrona" (fechada) para o estilo de fluxo (`stream: true`).

A IA envia os *tokens* textuais assim que são decodificados.
O Backend Fastify redireciona rapidamente (através de iteradores assíncronos) esse fluxo direto para o cliente com a tecnologia SSE, utilizando os headers HTTP:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

### Vantagens do SSE no FastCook:
- **Redução drástica de sensação de Latência (Perceived Latency):** Mesmo em modelos pequenos, o Frontend atualiza-se em frações de segundo à medida que o texto "surge". 
- **Efeito Visual "Máquina de Escrever"**: O Frontend foi configurado para fazer um *JSON parse* resiliente (tentando decifrar ou resgatar chaves como "name" e "steps") para desenhar visualmente a UI sem que o JSON ou o processo tenha acabado totalmente.
- Persistência contínua: Após encerramento seguro (evento `done`), o Backend persiste unicamente a versão definitiva e higienizada na base de dados histórica do Supabase (para utilizadores logados).
