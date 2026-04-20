import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { stripe } from '../config/stripe';
import { env } from '../config/env';
import { User } from '../models/User';
import { Payment } from '../models/Payment';
import { addCredits } from '../services/creditService';
import { Errors } from '../errors/errorCodes';

const router = Router();

// POST /api/payments/create-checkout — create Stripe checkout session for credit purchase
router.post('/create-checkout', authenticate, async (req: Request, res: Response) => {
  const { credits, priceInCents } = req.body;
  if (!credits || !priceInCents) {
    const err = Errors.VALIDATION_ERROR('credits and priceInCents are required.');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  const user = await User.findById(req.authUser!.userId);
  if (!user) {
    const err = Errors.NOT_FOUND('User');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  // Create or reuse Stripe customer
  let customerId = user.subscription.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.displayName,
      metadata: { userId: user._id.toString() },
    });
    customerId = customer.id;
    await User.updateOne({ _id: user._id }, { 'subscription.stripeCustomerId': customerId });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: `${credits} Reflex Credits` },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${env.frontendUrl}/settings/credits?success=true`,
    cancel_url: `${env.frontendUrl}/settings/credits?canceled=true`,
    metadata: { userId: user._id.toString(), credits: credits.toString() },
  });

  res.json({ data: { checkoutUrl: session.url } });
});

// POST /api/payments/webhook — Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.stripeWebhookSecret);
  } catch (err) {
    console.error('[stripe] Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Invalid webhook signature.' });
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits || '0', 10);

      if (userId && credits > 0) {
        await Payment.create({
          userId,
          stripePaymentIntentId: session.payment_intent as string,
          type: 'one_time',
          amount: session.amount_total || 0,
          currency: session.currency || 'usd',
          creditsGranted: credits,
          status: 'succeeded',
        });

        await addCredits({
          userId,
          amount: credits,
          type: 'purchase',
          description: `Purchased ${credits} credits`,
          metadata: { stripePaymentId: session.payment_intent as string },
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      const user = await User.findOne({ 'subscription.stripeCustomerId': customerId });

      if (user) {
        await User.updateOne(
          { _id: user._id },
          {
            'subscription.stripeSubscriptionId': subscription.id,
            'subscription.status': subscription.status === 'active' ? 'active' : 'past_due',
            'subscription.tier': 'pro',
            'subscription.currentPeriodEnd': new Date((subscription as any).current_period_end * 1000),
          }
        );
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      await User.updateOne(
        { 'subscription.stripeCustomerId': customerId },
        {
          'subscription.status': 'canceled',
          'subscription.tier': 'free',
          role: 'free',
        }
      );
      break;
    }

    default:
      // Unhandled event type — log but don't error
      console.log(`[stripe] Unhandled event: ${event.type}`);
  }

  res.json({ received: true });
});

// GET /api/payments/history — user's payment history
router.get('/history', authenticate, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find({ userId: req.authUser!.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments({ userId: req.authUser!.userId }),
  ]);

  res.json({
    data: payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export default router;
