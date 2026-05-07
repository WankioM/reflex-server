import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { authenticate } from '../middleware/auth';
import { storeByoKey, removeByoKey, toggleByoKey } from '../services/encryptionService';
import { Errors } from '../errors/errorCodes';

const router = Router();

/**
 * Hit Anthropic's lightweight /v1/models endpoint with the given key.
 * Used as a pre-store smoke test on PUT /me/byo-key so users with
 * typos / revoked keys learn at save time rather than at first chat.
 *
 * Only blocks on a *definitive* bad-key response (401/403). Network
 * errors, timeouts, and Anthropic 5xx are treated as inconclusive
 * and let the save proceed — a transient outage shouldn't prevent
 * users from updating their settings.
 */
async function smokeTestAnthropicKey(apiKey: string): Promise<{ definitelyBad: boolean }> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(5000),
    });
    return { definitelyBad: res.status === 401 || res.status === 403 };
  } catch {
    // Network error / timeout — can't tell, let it through
    return { definitelyBad: false };
  }
}

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

  // Live smoke test: catch typos / revoked keys before storage.
  // Only rejects on a definitive 401/403 from Anthropic; other
  // failure modes (network, 5xx) fall through and store anyway.
  const { definitelyBad } = await smokeTestAnthropicKey(apiKey);
  if (definitelyBad) {
    const err = Errors.BYO_KEY_INVALID();
    res.status(err.statusCode).json({ error: err.message, code: err.code, action: err.action });
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
