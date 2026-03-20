import 'dotenv/config';
import { z } from 'zod';

/**
 * Schema de validação para variáveis de ambiente.
 * Garante que nenhuma variável obrigatória esteja em falta no runtime.
 */
const envSchema = z.object({
  // Servidor
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase — backend usa exclusivamente a service_role (contorna RLS)
  SUPABASE_URL: z.string().min(1, { message: 'SUPABASE_URL é obrigatória' }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, { message: 'SUPABASE_SERVICE_ROLE_KEY é obrigatória' }),

  // Groq AI
  GROQ_API_KEY: z.string().min(1, { message: 'GROQ_API_KEY é obrigatória' }),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Redis
  REDIS_URL: z.string().optional(),

  // Monetization & SaaS
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Imagens
  FAL_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Variáveis de ambiente inválidas:');
    console.error(parsed.error.issues);
    process.exit(1);
  }

  return parsed.data;
}

export const env = validateEnv();
