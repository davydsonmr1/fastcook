import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { jest } from '@jest/globals';
import type { FastifyInstance } from 'fastify';

// ── ESM Mocks (unstable_mockModule ANTES dos imports dinâmicos) ──

const mockGenerateRecipe = jest.fn<(...args: unknown[]) => AsyncGenerator>();
const mockSaveRecipeToHistory = jest.fn<() => Promise<void>>();

// In-memory store para simular Redis no CI (sem dependência externa)
let redisCounters: Record<string, number> = {};
let redisStore: Record<string, string> = {};

jest.unstable_mockModule('../src/services/groq.service.js', () => ({
  generateRecipe: mockGenerateRecipe,
}));

jest.unstable_mockModule('../src/services/supabase.service.js', () => ({
  saveRecipeToHistory: mockSaveRecipeToHistory.mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../src/config/redis.js', () => ({
  redisClient: {
    get: jest.fn<(k: string) => Promise<string | null>>()
      .mockImplementation(async (key: string) => redisStore[key] ?? null),
    setex: jest.fn<(k: string, t: number, v: string) => Promise<void>>()
      .mockImplementation(async (key: string, _ttl: number, value: string) => { redisStore[key] = value; }),
    incr: jest.fn<(k: string) => Promise<number>>()
      .mockImplementation(async (key: string) => {
        redisCounters[key] = (redisCounters[key] || 0) + 1;
        return redisCounters[key];
      }),
    expire: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    disconnect: jest.fn(),
    quit: jest.fn<() => Promise<string>>().mockResolvedValue('OK'),
    on: jest.fn(),
    status: 'ready',
  },
}));

// ── Imports dinâmicos APÓS os mocks ──────────────────────────
const { buildServer } = await import('../src/server.js');
const groqService = await import('../src/services/groq.service.js');
const { redisClient } = await import('../src/config/redis.js');

describe('FastCook API Security and DevSecOps Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  beforeEach(() => {
    mockGenerateRecipe.mockImplementation(async function* () {
      yield { choices: [{ delta: { content: '{"name":"Receita de Teste","prepTime":"10m","difficulty":1,"steps":["Passo 1"]}' } }] };
    });
    redisCounters = {};
    redisStore = {};
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

    // Desativar cache para forçar todas as requests a passar pelo rate-limit
    (redisClient.get as ReturnType<typeof jest.fn>).mockResolvedValue(null);

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
  }, 15000);

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
