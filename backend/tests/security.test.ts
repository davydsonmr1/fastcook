import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import * as groqService from '../src/services/groq.service.js';
import { jest } from '@jest/globals';

// Mock do Groq Service para não consumir tokens reais durante os testes
jest.mock('../src/services/groq.service.js', () => ({
  generateRecipe: jest.fn().mockImplementation(async function* () {
    yield { choices: [{ delta: { content: '{"name":"Receita de Teste","prepTime":"10m","difficulty":1,"steps":["Passo 1"]}' } }] };
  }),
}));

// Mock do Supabase Service para evitar conexões com a DB real
jest.mock('../src/services/supabase.service.js', () => ({
  saveRecipeToHistory: jest.fn().mockResolvedValue(undefined as never),
}));

describe('FlashCook API Security and DevSecOps Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Zod Shield: Deve bloquear tentativa de injeção XSS/HTML e retornar HTTP 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/recipes',
      payload: {
        ingredients: "<script>alert('hack')</script>, cebola"
      }
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('Bad Request');
    // Valida que o schema Zod (que rejeita <, >, etc) intercebou
    expect(body.message[0].message).toMatch(/Inválido/i);
  });

  it('2. Rate Limiting: Deve acionar Fallback de Modelo Gracioso após 5 requests na mesma janela', async () => {
    const mockIng = { ingredients: "cebola, tomate" };

    // Fazer 5 requisições rápidas para esgotar o limite do Rate Limit
    for (let i = 0; i < 5; i++) {
       await app.inject({
        method: 'POST',
        url: '/api/v1/recipes',
        payload: mockIng
      });
    }

    // A 6ª requisição deve ter a flag isRateLimited (Degradação Graciosa)
    // Spy on generateRecipe function to check arguments
    const generateRecipeSpy = jest.spyOn(groqService, 'generateRecipe');
    
    const responseLimitExceeded = await app.inject({
      method: 'POST',
      url: '/api/v1/recipes',
      payload: mockIng
    });

    // 1. Não deve quebrar com 429
    expect(responseLimitExceeded.statusCode).toBe(200);
    // 2. O Content-Type DEVE refletir Server-Sent Events
    expect(responseLimitExceeded.headers['content-type']).toContain('text/event-stream');
    // 3. A Função da IA deve ter sido chamada com `isRateLimited` sendo TRUE
    expect(generateRecipeSpy).toHaveBeenLastCalledWith(mockIng.ingredients, true);
  });

  it('3. Anonimato: Rota deve funcionar sem Bearer Token, não gravando histórico em banco de dados', async () => {
    const suspensePayload = { ingredients: "feijão, arroz" };
    // Este teste valida o middleware `optionalAuth`, que não rejeita 401 para semAuth
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/recipes',
      headers: {
        // Authorization propositadamente ausente
      },
      payload: suspensePayload
    });

    expect(response.statusCode).toBe(200);
    // Como mock do Groq.service gera stream mockado SSE:
    expect(response.payload).toContain('data: {"chunk"');
  });
});
