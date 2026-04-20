import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getBalance, getTransactionHistory } from '../services/creditService';

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

export default router;
