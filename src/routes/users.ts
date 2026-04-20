import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { authenticate } from '../middleware/auth';
import { storeByoKey, removeByoKey, toggleByoKey } from '../services/encryptionService';
import { Errors } from '../errors/errorCodes';

const router = Router();

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await User.findById(req.authUser!.userId)
    .select('-byoKey.encryptedKey -byoKey.iv -connections.github.accessToken')
    .lean();

  if (!user || user.deletedAt) {
    const err = Errors.NOT_FOUND('User');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  res.json({ data: user });
});

router.patch('/me', authenticate, async (req: Request, res: Response) => {
  const { displayName, avatar } = req.body;
  const update: Record<string, string> = {};
  if (displayName) update.displayName = displayName;
  if (avatar) update.avatar = avatar;

  const user = await User.findByIdAndUpdate(req.authUser!.userId, update, { new: true })
    .select('-byoKey.encryptedKey -byoKey.iv -connections.github.accessToken')
    .lean();

  if (!user) {
    const err = Errors.NOT_FOUND('User');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  res.json({ data: user });
});

router.put('/me/byo-key', authenticate, async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('sk-ant-')) {
    const err = Errors.VALIDATION_ERROR('Invalid Claude API key format. Must start with sk-ant-.');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  await storeByoKey(req.authUser!.userId, apiKey);
  res.json({ message: 'API key saved and enabled.' });
});

router.delete('/me/byo-key', authenticate, async (req: Request, res: Response) => {
  await removeByoKey(req.authUser!.userId);
  res.json({ message: 'API key removed.' });
});

router.patch('/me/byo-key/toggle', authenticate, async (req: Request, res: Response) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    const err = Errors.VALIDATION_ERROR('enabled must be a boolean.');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  await toggleByoKey(req.authUser!.userId, enabled);
  res.json({ message: `BYO key ${enabled ? 'enabled' : 'disabled'}.` });
});

router.delete('/me', authenticate, async (req: Request, res: Response) => {
  await User.updateOne({ _id: req.authUser!.userId }, { deletedAt: new Date() });
  res.json({ message: 'Account scheduled for deletion.' });
});

export default router;
