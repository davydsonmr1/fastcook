import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { recipeBodySchema } from '../schemas/recipe.schema.js';
import { generateRecipe } from '../services/groq.service.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';
import { saveRecipeToHistory } from '../services/supabase.service.js';

// eslint-disable-next-line @typescript-eslint/require-await
export const recipeRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.decorateRequest('userId', undefined);

  app.post('/recipes', { preHandler: [optionalAuth] }, async (request, reply) => {
    try {
      // 1. Validação Extrema (Zod)
      const bodyValidation = recipeBodySchema.safeParse(request.body);

      if (!bodyValidation.success) {
        app.log.warn({
          msg: 'Tentativa de injeção ou validação falhada bloqueada no Zod.',
          errors: bodyValidation.error.issues,
        });

        return await reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: bodyValidation.error.issues,
        });
      }

      const { ingredients } = bodyValidation.data;

      // Rate limit check for graceful degradation
      // O rateLimit foi configurado com continueExceeding: true
      const rateLimitInfo = (request as any).rateLimit;
      const isRateLimited = rateLimitInfo ? rateLimitInfo.current > rateLimitInfo.limit : false;

      if (isRateLimited) {
         app.log.warn({ msg: 'Rate limit excedido. Aplicando degradação graciosa de modelo para o utilizador.' });
      }

      // 2. Chama a IA protegida pelo Prompt Shield (agora retorna Stream)
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
        if (parsedFinalObj && 'error' in parsedFinalObj) {
           app.log.warn({
             msg: 'Prompt Shield bloqueou uma tentativa maliciosa a nível de IA.',
             input: ingredients,
           });
           
           reply.raw.write(`data: ${JSON.stringify({ error: 'Unprocessable Entity', message: 'Input inválido detetado.' })}\n\n`);
           reply.raw.end();
           return reply;
        }
        
        // 6. Persistir no histórico se o utilizador estiver autenticado
        if (request.userId) {
          void saveRecipeToHistory(request.userId, ingredients, parsedFinalObj);
        }

      } catch (parseError) {
         app.log.error(parseError, 'Erro ao fazer parse da resposta completa para o histórico');
      }

      // 7. Encerra o Stream de forma amigável
      reply.raw.write('event: done\ndata: {}\n\n');
      reply.raw.end();

      // O reply.raw.end() finaliza, não retornamos um body comum via Fastify reply standard send()
      return reply;

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
          return reply;
      }
    }
  });
};
