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
      // Bloqueia tentativas primárias de injeção ou over-sizing
      const bodyValidation = recipeBodySchema.safeParse(request.body);

      if (!bodyValidation.success) {
        app.log.warn({
          msg: 'Tentativa de injeção ou validação falhada bloqueada no Zod.',
          errors: bodyValidation.error.issues,
        });

        // 400 Bad Request
        return await reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: bodyValidation.error.issues,
        });
      }

      const { ingredients } = bodyValidation.data;

      // 2. Chama a IA protegida pelo Prompt Shield
      const recipePayload = await generateRecipe(ingredients);

      // 3. Avaliação da resposta da IA (Atuação do Shield)
      // Se a IA devolver um error object, significa que o shield agiu e barrou a tentativa
      if (typeof recipePayload === 'object' && recipePayload !== null && 'error' in recipePayload) {
        app.log.warn({
          msg: 'Prompt Shield bloqueou uma tentativa maliciosa a nível de IA.',
          input: ingredients,
        });

        // 422 Unprocessable Entity
        return await reply.status(422).send({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: 'Input inválido detetado pelas salvaguardas da Inteligência Artificial.',
        });
      }

      // 4. Persistir no histórico se o utilizador estiver autenticado (fire-and-forget)
      if (request.userId) {
        void saveRecipeToHistory(request.userId, ingredients, recipePayload);
      }

      // 5. Sucesso: retorna a receita processada
      return await reply.status(200).send(recipePayload);

    } catch (error) {
      app.log.error(error);
      return await reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Ocorreu um erro interno na infraestrutura AI.',
      });
    }
  });
};
