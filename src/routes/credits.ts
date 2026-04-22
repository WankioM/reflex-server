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

// Deduct credits for a chat message (called by Next.js /api/chat)
router.post('/deduct', authenticate, async (req: Request, res: Response) => {
  const { description } = req.body;
  try {
    const newBalance = await deductCredits(
      req.authUser!.userId,
      env.creditsPerAssistantCall,
      description || 'AI chat message',
    );
    res.json({ data: { credits: newBalance } });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message, code: error.code });
  }
});

export default router;
