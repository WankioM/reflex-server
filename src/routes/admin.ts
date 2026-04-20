import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { Payment } from '../models/Payment';
import { FeatureFlag } from '../models/FeatureFlag';
import { addCredits } from '../services/creditService';
import { Errors } from '../errors/errorCodes';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/users', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;

  const filter: Record<string, unknown> = { deletedAt: null };
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { displayName: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-byoKey.encryptedKey -byoKey.iv -connections.github.accessToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    data: users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

router.get('/users/:id', async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id as string)
    .select('-byoKey.encryptedKey -byoKey.iv -connections.github.accessToken')
    .lean();

  if (!user) {
    const err = Errors.NOT_FOUND('User');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  res.json({ data: user });
});

router.patch('/users/:id', async (req: Request, res: Response) => {
  const { role, displayName } = req.body;
  const update: Record<string, string> = {};
  if (role && ['free', 'pro', 'team', 'admin'].includes(role)) update.role = role;
  if (displayName) update.displayName = displayName;

  const user = await User.findByIdAndUpdate(req.params.id as string, update, { new: true })
    .select('-byoKey.encryptedKey -byoKey.iv -connections.github.accessToken')
    .lean();

  if (!user) {
    const err = Errors.NOT_FOUND('User');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  res.json({ data: user });
});

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
    description: description || 'Admin credit grant',
    metadata: { giftedBy: req.authUser!.userId as string },
  });

  res.json({ data: { credits: newBalance } });
});

router.get('/stats', async (_req: Request, res: Response) => {
  const [totalUsers, activeUsers, totalRevenue] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    Conversation.distinct('userId', {
      lastMessageAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }).then((ids) => ids.length),
    Payment.aggregate([
      { $match: { status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then((result) => (result[0]?.total || 0) / 100),
  ]);

  res.json({
    data: { totalUsers, activeUsersLast30Days: activeUsers, totalRevenueDollars: totalRevenue },
  });
});

router.get('/feature-flags', async (_req: Request, res: Response) => {
  const flags = await FeatureFlag.find().lean();
  res.json({ data: flags });
});

router.put('/feature-flags/:key', async (req: Request, res: Response) => {
  const { enabled, description } = req.body;

  const flag = await FeatureFlag.findOneAndUpdate(
    { key: req.params.key },
    {
      key: req.params.key,
      enabled: !!enabled,
      description: description || '',
      updatedBy: req.authUser!.userId,
    },
    { new: true, upsert: true }
  ).lean();

  res.json({ data: flag });
});

export default router;
