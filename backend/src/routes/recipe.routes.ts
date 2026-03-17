import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { recipeBodySchema } from '../schemas/recipe.schema.js';
import { generateRecipe } from '../services/groq.service.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';
import { saveRecipeToHistory } from '../services/supabase.service.js';
import { redisClient } from '../config/redis.js';

interface RateLimitInfo {
  current: number;
  limit: number;
  remaining: number;
}

// Função para normalizar ingredientes para Hash Cache (Lowercase e Ordem Alfabética)
const normalizeIngredientsKey = (input: string) => {
  return input
    .toLowerCase()
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .sort()
    .join('_');
};

// eslint-disable-next-line @typescript-eslint/require-await
export const recipeRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.decorateRequest('userId', undefined);

  app.post('/recipes', { preHandler: [optionalAuth] }, async (request, reply) => {
    try {
      // 1. Validação Extrema (Zod)
      const bodyValidation = recipeBodySchema.safeParse(request.body);

      if (!bodyValidation.success) {
        app.log.warn({
          type: 'SECURITY_BLOCK',
          reason: 'Zod Validation Failure',
          msg: 'Tentativa de payload malicioso bloqueada pelo frontend schema.',
          payloadSizeBytes: JSON.stringify(request.body || {}).length,
        });

        return await reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: bodyValidation.error.issues,
        });
      }

      const { ingredients } = bodyValidation.data;

      // 2. Cache Distribuído (Bypass completo do Rate Limit via Redis)
      const cacheKey = `recipe:${normalizeIngredientsKey(ingredients)}`;
      try {
        const cachedRecipe = await redisClient.get(cacheKey);
        
        if (cachedRecipe) {
           app.log.info({ type: 'CACHE_HIT', ingredients, msg: 'Receita servida instantaneamente do Redis Cache.' });
           
           void reply.header('Content-Type', 'text/event-stream');
           void reply.header('Cache-Control', 'no-cache');
           void reply.header('Connection', 'keep-alive');
           
           // Emular stream para compatibilidade com a UI atual
           reply.raw.write(`data: ${JSON.stringify({ chunk: cachedRecipe })}\n\n`);
           reply.raw.write('event: done\ndata: {}\n\n');
           reply.raw.end();
           return;
        }
      } catch (redisError) {
         app.log.warn(redisError, 'Falha ao conectar com o Redis, servindo a request via Groq.');
      }

      // Rate limit check for graceful degradation
      // O rateLimit foi configurado com continueExceeding: true
      const reqWithRateLimit = request as FastifyRequest & { rateLimit?: RateLimitInfo };
      const rateLimitInfo = reqWithRateLimit.rateLimit;
      const isRateLimited = rateLimitInfo ? rateLimitInfo.current > rateLimitInfo.limit : false;

      if (isRateLimited) {
         app.log.warn({ 
           type: 'GRACEFUL_DEGRADATION',
           msg: 'Rate limit excedido. Aplicando degradação graciosa para o fallback model.',
           limit: rateLimitInfo?.limit
         });
      }

      // 2. Chama a IA protegida pelo Prompt Shield (agora retorna Stream)
      const startTime = performance.now();
      const stream = await generateRecipe(ingredients, isRateLimited);

      // 3. Configurar os Headers para Server-Sent Events (SSE)
      void reply.header('Content-Type', 'text/event-stream');
      void reply.header('Cache-Control', 'no-cache');
      void reply.header('Connection', 'keep-alive');

      let fullResponseMarkup = '';

      // 4. Iterar sobre os pedaços (Chunks) do stream
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        
        if (content) {
          fullResponseMarkup += content;
          // Escreve diretamente na stream de resposta bruta (Fastify raw reply)
          reply.raw.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
        }
      }

      // 5. Avaliação anti-injection post-processamento (Se Shield reagiu devolvendo error obj)
      try {
        const parsedFinalObj = JSON.parse(fullResponseMarkup || '{}') as Record<string, unknown>;
        if ('error' in parsedFinalObj) {
           app.log.warn({
             type: 'SECURITY_BLOCK_LLM',
             msg: 'Prompt Shield bloqueou uma tentativa maliciosa (jailbreak bypass).',
             payloadSizeBytes: ingredients.length,
           });
           
           reply.raw.write(`data: ${JSON.stringify({ error: 'Unprocessable Entity', message: 'Input inválido detetado.' })}\n\n`);
           reply.raw.end();
           return;
        }
        
        // 6. Persistir no histórico se o utilizador estiver autenticado
        if (request.userId) {
          void saveRecipeToHistory(request.userId, ingredients, parsedFinalObj);
        }
        
        // 7. Guardar Cache no Redis com TTL de 24 horas (86400 segundos)
        try {
          // A UI consome aos lotes (Pedaços JSON ou raw texto). Gravar string bruta que a UI juntaria
          await redisClient.setex(cacheKey, 86400, fullResponseMarkup);
        } catch (setCacheError) {
          app.log.warn(setCacheError, 'Erro ao criar chave no Redis Cache');
        }

      } catch (parseError) {
         app.log.error(parseError, 'Erro ao fazer parse da resposta completa para o histórico');
      }

      const endTime = performance.now();
      app.log.info({
        type: 'TELEMETRY_AI_GENERATION',
        durationMs: Math.round(endTime - startTime),
        isFallbackModel: isRateLimited,
        msg: 'Geração de receita concluída via stream.',
      });

      // 7. Encerra o Stream de forma amigável
      reply.raw.write('event: done\ndata: {}\n\n');
      reply.raw.end();

      // O reply.raw.end() finaliza, não retornamos um body comum via Fastify reply standard send()
      return;

    } catch (error) {
      app.log.error(error);
      
      if (!reply.raw.headersSent) {
          return await reply.status(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Ocorreu um erro interno na infraestrutura AI.',
          });
      } else {
          reply.raw.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
          reply.raw.end();
          return;
      }
    }
  });
};
