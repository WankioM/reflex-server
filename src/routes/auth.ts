import { Router, Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { grantSignupBonus } from '../services/creditService';
import type { JwtPayload } from '../types';

const router = Router();

function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign({ userId, role } as JwtPayload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as string,
  } as jwt.SignOptions);
  const refreshToken = crypto.randomBytes(40).toString('hex');
  return { accessToken, refreshToken };
}

// Shared callback handler for both Google and GitHub
async function handleOAuthCallback(req: Request, res: Response) {
  const user = req.user as InstanceType<typeof User>;

  if (!user.freeCreditsGranted) {
    await grantSignupBonus(user._id.toString(), env.freeSignupCredits);
  }

  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role);

  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await RefreshToken.create({
    userId: user._id,
    token: hashedToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  res.redirect(
    `${env.frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
  );
}

// Google OAuth
router.get('/google', authLimiter, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${env.frontendUrl}/login?error=auth_failed` }),
  handleOAuthCallback
);

// GitHub OAuth
router.get('/github', authLimiter, passport.authenticate('github', { scope: ['user:email'] }));
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${env.frontendUrl}/login?error=auth_failed` }),
  handleOAuthCallback
);

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required.', code: 'VALIDATION_ERROR' });
    return;
  }

  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const storedToken = await RefreshToken.findOne({ token: hashedToken });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    res.status(401).json({ error: 'Your session expired. Sign in again.', code: 'AUTH_EXPIRED' });
    return;
  }

  const user = await User.findById(storedToken.userId);
  if (!user || user.deletedAt) {
    res.status(401).json({ error: 'Account not found.', code: 'AUTH_INVALID' });
    return;
  }

  await RefreshToken.deleteOne({ _id: storedToken._id });
  const tokens = generateTokens(user._id.toString(), user.role);
  const newHashedToken = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');

  await RefreshToken.create({
    userId: user._id,
    token: newHashedToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
});

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await RefreshToken.deleteOne({ token: hashedToken });
  }

  res.json({ message: 'Logged out successfully.' });
});

export default router;
