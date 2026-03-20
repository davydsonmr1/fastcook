import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { stripe } from '../services/stripe.service.js';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';

export const stripeRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // ── Checkout Session ───────────────────────────────────────────
  app.post('/checkout', async (request, reply) => {
    try {
      // @ts-ignore - Simplificado para o exemplo, idealmente usar Zod schema
      const { userId, userEmail } = request.body as { userId: string; userEmail: string };

      if (!userId || !userEmail) {
        return reply.status(400).send({ error: 'Missing userId or userEmail' });
      }

      // Procura ou cria Stripe Customer com base no supabase ID
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();

      let customerId = profile?.stripe_customer_id;

      if (!customerId) {
         const customer = await stripe.customers.create({
           email: userEmail,
           metadata: { supabase_user_id: userId }
         });
         customerId = customer.id;
         await supabaseAdmin
           .from('profiles')
           .update({ stripe_customer_id: customerId })
           .eq('id', userId);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Chef Premium - FastCook',
                description: 'Acesso Pessoal ao Llama 70B, Geração de Imagem Rápida e Despensa Limitless.',
              },
              unit_amount: 499, // 4.99 EUR / Mês
              recurring: { interval: 'month' },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${env.CORS_ORIGIN.split(',')[0]}/profile?success=true`,
        cancel_url: `${env.CORS_ORIGIN.split(',')[0]}/profile?canceled=true`,
        metadata: { userId },
      });

      return reply.send({ url: session.url });
    } catch (error) {
       app.log.error(error);
       return reply.status(500).send({ error: 'Erro ao processar checkout.' });
    }
  });

  // ── Webhooks (DevSecOps) ───────────────────────────────────────
  // Desativar o parser JSON do Fastify estritamente para esta rota (Stripe precisa do RAW body)
  app.post('/webhooks/stripe', { config: { rawBody: true } }, async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    
    if (!sig) return reply.status(400).send({ error: 'No signature' });

    let event;
    try {
      // Usar a extensão raw body configurada globalmente ou aceder a .raw
      // Se não houver rawBody decorator, request.body pode ser transformado.
      // Supondo que o Fastify tem plugin para guardar o buffer em `request.rawBody`:
      const payload = (request as any).rawBody || request.body; 
      
      event = stripe.webhooks.constructEvent(
        payload,
        sig,
        env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock'
      );
    } catch (err: any) {
      app.log.warn(`⚠️  Webhook Error: ${err.message}`);
      return reply.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Processamento do evento Stripe asncrono para evitar Timeout
    void processStripeEvent(event, app);

    return reply.status(200).send({ received: true });
  });
};

async function processStripeEvent(event: any, app: any) {
    if (event.type === 'checkout.session.completed') {
       const session = event.data.object;
       const userId = session.metadata?.userId;
       
       if (userId) {
          await supabaseAdmin
            .from('profiles')
            .update({ plan_type: 'premium', subscription_status: 'active' })
            .eq('id', userId);
          app.log.info({ msg: 'Upsell Concluído: Novo Chef Premium', userId });
       }
    } else if (event.type === 'customer.subscription.deleted') {
       const subscription = event.data.object;
       const customerId = subscription.customer;
       
       await supabaseAdmin
            .from('profiles')
            .update({ plan_type: 'free', subscription_status: 'canceled' })
            .eq('stripe_customer_id', customerId);
       app.log.info({ msg: 'Assinatura Cancelada. Downgrade concluído.', customerId });
    }
}
