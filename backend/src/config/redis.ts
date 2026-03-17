import Redis from 'ioredis';
import { env } from './env.js';

// Inicializa a conexão com o Redis usando a URI fornecida no ambiente .env
// Fallback para localhost, ideal para desenvolvimento local sem Docker
export const redisClient = new Redis(env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: 3, // Evita crashes infinitos se o Redis falhar
  enableReadyCheck: true,
});

redisClient.on('connect', () => {
  // Silent or use pino if connected to app context
});

redisClient.on('error', () => {
  // Silent wrapper to prevent unexpected console statments
});
