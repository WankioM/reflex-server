import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { User } from '../models/User';
import { Errors } from '../errors/errorCodes';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const user = await User.findById(req.authUser!.userId)
    .select('connections')
    .lean();

  if (!user) {
    const err = Errors.NOT_FOUND('User');
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  res.json({
    data: {
      github: {
        connected: !!user.connections.github.username,
        username: user.connections.github.username,
        connectedAt: user.connections.github.connectedAt,
      },
    },
  });
});

// TODO: Implement GitHub OAuth flow
router.post('/github', authenticate, async (_req: Request, res: Response) => {
  res.status(501).json({ error: 'GitHub connection not yet implemented.', code: 'NOT_IMPLEMENTED' });
});

router.delete('/github', authenticate, async (req: Request, res: Response) => {
  await User.updateOne(
    { _id: req.authUser!.userId },
    {
      'connections.github.accessToken': null,
      'connections.github.username': null,
      'connections.github.connectedAt': null,
    }
  );

  res.json({ message: 'GitHub disconnected.' });
});

export default router;
