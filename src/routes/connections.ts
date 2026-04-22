import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { User } from '../models/User';
import { Errors } from '../errors/errorCodes';
import { env } from '../config/env';

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

// GitHub connect — redirects to GitHub OAuth with userId in state
router.post('/github', authenticate, async (req: Request, res: Response) => {
  if (!env.githubClientId) {
    res.status(503).json({ error: 'GitHub OAuth is not configured.', code: 'GITHUB_NOT_CONFIGURED' });
    return;
  }

  const state = Buffer.from(JSON.stringify({
    userId: req.authUser!.userId,
    action: 'connect',
    redirect_origin: req.body.redirect_origin || env.frontendUrl,
  })).toString('base64');

  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${env.githubClientId}&scope=user:email&state=${state}`;
  res.json({ data: { authUrl: githubUrl } });
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
