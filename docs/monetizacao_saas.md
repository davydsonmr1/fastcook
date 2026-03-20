# Monetização e SaaS (Chef Premium)

Esta documentação explica como o FastCook lida com assinaturas, Geração de Imagens (Efeito Uau), e Limites de Uso.

## 1. Configuração do Stripe
A nossa infraestrutura permite escalar de 0 a 1 milhão através de um backend leve usando Fastify. A autenticação do webhook do stripe previne injeções financeiras mal-intencionadas.

**Passos no Painel do Stripe:**
1. Crie um Produto chamado **"Chef Premium - FastCook"**.
2. Defina o Pricing (ex: 4,99 EUR / Mês) — *recorrente*.
3. Vá à configuração de Webhooks, e insira o URL exato do seu backend em produção: `https://fastcook.onrender.com/api/v1/webhooks/stripe`.
4. Os eventos a assinar (Listening) são: `checkout.session.completed` e `customer.subscription.deleted`.
5. Extraia o "Signing secret" e coloque no seu servidor sob a variável `STRIPE_WEBHOOK_SECRET`. O `STRIPE_SECRET_KEY` também deve estar configurado no Backend.

## 2. Geração de Imagem Rápida (Fal.ai)
Para garantir uma UI "Pinterest-like" Premium, incluímos uma integração ultrarrápida usando os modelos Flux hospedados na Fal.ai. O Llama 70B constrói a receita, e logo a seguir pegamos no nome renderizado e geramos um prato num ambiente "fotográfico 4k".
Isto cria um diferencial gigantesco no mercado (Aquele "Efeito Uau").
* **Chave Necessária**: `FAL_KEY`
* Custo Médio por Imagem: Muito baixo, devido ao tier Serverless da Plataforma.

## 3. Rate Limiting e Degradação Graciosa
A arquitetura de monetização protege a robustez da PWA limitando chamadas usando Redis:
* **Membros Free:** Máximo de 5 utilizações por hora. Além da 5ª vez, será acionado um Webhook trigger para mostrar o Modal Premium. O modelo de AI default é Llama 8B.
* **Membros Premium:** Usam o modelo pesado "Llama 3 70B", têm Despensa Inteligente Infinita, e obtêm a Foto realista de bónus. Totalmente By-Pass no Rate Limit.
