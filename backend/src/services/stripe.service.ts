import Stripe from 'stripe';
import { env } from '../config/env.js';

if (!env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY não configurada. A funcionalidade de pagamentos não irá funcionar em produção.');
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2026-02-25.clover' as any,
  typescript: true,
});
