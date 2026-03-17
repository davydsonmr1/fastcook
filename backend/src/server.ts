import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { env } from './config/env.js';
import { redisClient } from './config/redis.js';
import { recipeRoutes } from './routes/recipe.routes.js';

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

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100, // Limite global de DDoS
    timeWindow: '1 hour',
    redis: redisClient,
    errorResponseBuilder: function () {
      return {
        statusCode: 429,
        error: "Too Many Requests",
        message: "Múltiplas requisições detetadas. Bloqueio de segurança.",
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
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`🚀 FlashCook API running on http://${env.HOST}:${env.PORT.toString()}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
