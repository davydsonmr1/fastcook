import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { PassThrough } from 'node:stream';
import { recipeBodySchema } from '../schemas/recipe.schema.js';
import { generateRecipe } from '../services/groq.service.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';
import { saveRecipeToHistory, getUserPantry } from '../services/supabase.service.js';
import { redisClient } from '../config/redis.js';
import { supabaseAdmin } from '../config/supabase.js';
import { generateRecipeImage } from '../services/image.service.js';

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
    let sseStream: PassThrough | null = null;
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

      const { ingredients, dietary_restrictions } = bodyValidation.data;

      // 2. Cache Distribuído (Bypass completo do Rate Limit via Redis)
      const cacheKey = `recipe:${normalizeIngredientsKey(ingredients)}`;
      try {
        const cachedRecipe = await redisClient.get(cacheKey);
        
        if (cachedRecipe) {
           app.log.info({ type: 'CACHE_HIT', ingredients, msg: 'Receita servida instantaneamente do Redis Cache.' });
           
           const cacheStream = new PassThrough();
           void reply
             .type('text/event-stream')
             .header('Cache-Control', 'no-cache')
             .header('Connection', 'keep-alive')
             .send(cacheStream);
           
           cacheStream.write(`data: ${JSON.stringify({ chunk: cachedRecipe })}\n\n`);
           cacheStream.write('event: done\ndata: {}\n\n');
           cacheStream.end();
           return;
        }
      } catch (redisError) {
         app.log.warn(redisError, 'Falha ao conectar com o Redis, servindo a request via Groq.');
      }

      // Extrair tipo de plano
      let planType = 'free';
      if (request.userId) {
        const { data } = await supabaseAdmin.from('profiles').select('plan_type').eq('id', request.userId).single();
        if (data?.plan_type) planType = data.plan_type;
      }

      // Rate limit manual no Redis para degradação graciosa (5 requests/hora)
      let isRateLimited = false;
      if (planType !== 'premium') {
        const ip = request.ip || 'unknown_ip';
        const userRtKey = `graceful_limit:${ip}`;
        try {
           const currentReqs = await redisClient.incr(userRtKey);
           if (currentReqs === 1) {
              await redisClient.expire(userRtKey, 3600); // 1 hora TTL
           }
           isRateLimited = currentReqs > 5;
        } catch (e) {
           app.log.warn(e, 'Falha no contador manual do Redis, avançando sem limitador.');
        }

        if (isRateLimited) {
           app.log.warn({ 
             type: 'GRACEFUL_DEGRADATION',
             msg: 'Rate limit excedido. Aplicando degradação graciosa para o fallback model.',
             limit: 5
           });
        }
      }

      // Adicionar despensa inteligente
      const userPantry = request.userId ? await getUserPantry(request.userId) : [];

      // 2. Chama a IA protegida pelo Prompt Shield (agora retorna Stream)
      const startTime = performance.now();
      const stream = await generateRecipe(ingredients, planType, userPantry, dietary_restrictions);

      // 3. Configurar SSE via PassThrough (garante que headers CORS são enviados pelo Fastify)
      sseStream = new PassThrough();
      void reply
        .type('text/event-stream')
        .header('Cache-Control', 'no-cache')
        .header('Connection', 'keep-alive')
        .send(sseStream);

      // Tratar desconexão do cliente
      let clientDisconnected = false;
      request.raw.on('close', () => {
        clientDisconnected = true;
      });

      let fullResponseMarkup = '';

      // 4. Iterar sobre os pedaços (Chunks) do stream
      for await (const chunk of stream) {
        if (clientDisconnected) break;

        const content = chunk.choices[0]?.delta?.content || '';
        
        if (content) {
          fullResponseMarkup += content;
          sseStream.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
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
           
           sseStream.write(`data: ${JSON.stringify({ error: 'Unprocessable Entity', message: 'Input inválido detetado.' })}\n\n`);
           sseStream.end();
           return;
        }
        
        let imageUrl = null;
        if (planType === 'premium' && parsedFinalObj.name) {
           app.log.info({ msg: 'Gerando imagem Premium...' });
           imageUrl = await generateRecipeImage(parsedFinalObj.name as string);
           
           if (imageUrl) {
             sseStream.write(`data: ${JSON.stringify({ imageUrl })}\n\n`);
             parsedFinalObj.imageUrl = imageUrl; 
             fullResponseMarkup = JSON.stringify(parsedFinalObj);
           }
        }
        
        // 6. Persistir no histórico se o utilizador estiver autenticado
        if (request.userId) {
          void saveRecipeToHistory(request.userId, ingredients, parsedFinalObj, imageUrl);
        }
        
        // 7. Guardar Cache no Redis com TTL de 24 horas (86400 segundos)
        try {
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

      // 8. Encerra o Stream de forma amigável
      sseStream.write('event: done\ndata: {}\n\n');
      sseStream.end();

      return;

    } catch (error) {
      app.log.error(error);
      
      if (sseStream && !sseStream.destroyed) {
          sseStream.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
          sseStream.end();
          return;
      }

      if (!reply.sent) {
          return await reply.status(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Ocorreu um erro interno na infraestrutura AI.',
          });
      }
      return;
    }
  });
};
