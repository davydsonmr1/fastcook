import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { env } from './config/env.js';
import { redisClient } from './config/redis.js';
import { recipeRoutes } from './routes/recipe.routes.js';
import { stripeRoutes } from './routes/stripe.routes.js';

/** Constrói a whitelist de origens CORS a partir da variável CORS_ORIGIN (aceita vírgula como separador) */
function buildAllowedOrigins(): string[] {
  return env.CORS_ORIGIN
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // ── Security Plugins ────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  const allowedOrigins = buildAllowedOrigins();

  await app.register(cors, {
    origin: (origin, cb) => {
      // Requests sem origin (curl, health-checks, mobile) são sempre permitidos
      if (!origin) {
        cb(null, true);
        return;
      }
      // Verifica se a origin está na whitelist (suporta múltiplas URLs separadas por vírgula)
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      // Permite qualquer localhost/127.0.0.1 em desenvolvimento
      if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin)) {
        cb(null, true);
        return;
      }
      // Permite todos os subdomínios Vercel (*.vercel.app) — deploy previews e produção
      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
        cb(null, true);
        return;
      }
      app.log.warn({ type: 'CORS_BLOCKED', origin }, 'Origem bloqueada por CORS');
      cb(new Error('Não permitido por CORS: ' + origin), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(rateLimit, {
    max: 100, // Limite global de DDoS
    timeWindow: '1 hour',
    ...(env.REDIS_URL ? { redis: redisClient } : {}),
    errorResponseBuilder: function () {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Múltiplas requisições detetadas. Bloqueio de segurança.',
      };
    },
  });

  await app.register(sensible);

  // ── Health Check ────────────────────────────────────────────
  app.get('/health', () => {
    return Promise.resolve({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API Routes ──────────────────────────────────────────────
  await app.register(recipeRoutes, { prefix: '/api/v1' });
  await app.register(stripeRoutes, { prefix: '/api/v1' });

  return app;
}

async function start() {
  const app = await buildServer();

  try {
    // Render injeta PORT dinamicamente. z.coerce.number() converte string vazia em 0,
    // por isso lemos process.env.PORT diretamente e só usamos env.PORT como fallback seguro.
    const port = (process.env.PORT && Number(process.env.PORT) > 0)
      ? Number(process.env.PORT)
      : (env.PORT > 0 ? env.PORT : 3000);

    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`🚀 FlashCook API running on 0.0.0.0:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
