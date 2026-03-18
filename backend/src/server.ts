import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { env } from './config/env.js';
import { redisClient } from './config/redis.js';
import { recipeRoutes } from './routes/recipe.routes.js';

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

  return app;
}

async function start() {
  const app = await buildServer();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`🚀 FlashCook API running on 0.0.0.0:${env.PORT.toString()} (env.HOST=${env.HOST})`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
