import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getBalance, getTransactionHistory, deductCredits } from '../services/creditService';
import { env } from '../config/env';

const router = Router();

router.get('/balance', authenticate, async (req: Request, res: Response) => {
  const balance = await getBalance(req.authUser!.userId);
  res.json({ data: { credits: balance } });
});

router.get('/history', authenticate, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const result = await getTransactionHistory(req.authUser!.userId, page, limit);
  res.json(result);
});

// Check if user has credits > 0 (gate before generating)
router.get('/check', authenticate, async (req: Request, res: Response) => {
  const balance = await getBalance(req.authUser!.userId);
  if (balance <= 0) {
    res.status(402).json({
      error: 'No credits remaining. Purchase more to continue.',
      code: 'CREDITS_EXHAUSTED',
      data: { credits: balance },
    });
    return;
  }
  res.json({ data: { credits: balance } });
});

// Deduct credits based on token usage (called by Next.js /api/chat after response)
// Allows negative balance — user already received the response
router.post('/deduct', authenticate, async (req: Request, res: Response) => {
  const { amount, description } = req.body;
  const deductAmount = typeof amount === 'number' && amount > 0 ? amount : 1;

  try {
    const newBalance = await deductCredits(
      req.authUser!.userId,
      deductAmount,
      description || 'AI chat message',
      undefined,
      true, // allowNegative — user already received the response
    );
    res.json({ data: { credits: newBalance } });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message, code: error.code });
  }
});

export default router;
