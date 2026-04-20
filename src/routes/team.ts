import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireMinRole } from '../middleware/requireRole';
import { ApiKey } from '../models/ApiKey';
import { UsageLog } from '../models/UsageLog';
import { addCredits } from '../services/creditService';
import { Errors } from '../errors/errorCodes';
import crypto from 'crypto';

const router = Router();

router.use(authenticate, requireMinRole('team'));

router.post('/users/:id/credits', async (req: Request, res: Response) => {
  const { amount, description } = req.body;
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    const err = Errors.VALIDATION_ERROR('amount must be a positive number.');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  const newBalance = await addCredits({
    userId: req.params.id as string,
    amount,
    type: 'gift',
    description: description || 'Team credit grant',
    metadata: { giftedBy: req.authUser!.userId as string },
  });

  res.json({ data: { credits: newBalance } });
});

router.post('/api-keys', async (req: Request, res: Response) => {
  const { name, permissions } = req.body;
  if (!name) {
    const err = Errors.VALIDATION_ERROR('name is required.');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  const rawKey = `rfx_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  await ApiKey.create({
    userId: req.authUser!.userId,
    keyHash,
    name,
    permissions: permissions || [],
  });

  res.status(201).json({
    data: {
      key: rawKey,
      name,
      message: 'Save this key — it cannot be retrieved again.',
    },
  });
});

router.get('/api-keys', async (req: Request, res: Response) => {
  const keys = await ApiKey.find({ userId: req.authUser!.userId })
    .select('-keyHash')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ data: keys });
});

router.delete('/api-keys/:id', async (req: Request, res: Response) => {
  const key = await ApiKey.findOneAndDelete({
    _id: req.params.id as string,
    userId: req.authUser!.userId,
  });

  if (!key) {
    const err = Errors.NOT_FOUND('API key');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  res.json({ message: 'API key revoked.' });
});

router.get('/usage', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    UsageLog.find({ userId: req.authUser!.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UsageLog.countDocuments({ userId: req.authUser!.userId }),
  ]);

  res.json({
    data: logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export default router;
