import { Router, Request, Response, NextFunction } from 'express';
import { requireInternalSecret } from '../middleware/internalSecret';
import { authenticate } from '../middleware/auth';
import { AnonymousCredits } from '../models/AnonymousCredits';
import { User } from '../models/User';
import { getByoKey } from '../services/encryptionService';
import { Errors } from '../errors/errorCodes';
import { env } from '../config/env';

// Internal (server-to-server) routes. Mounted at /api/internal.
//
// All endpoints in this file require the `x-internal-secret` header
// matching env.INTERNAL_API_SECRET. They are called by reflex-web's
// Vercel functions for chat-time concerns the active chat path cannot
// solve on its own (atomic anon-credit gating, BYO key lookup).
//
// These endpoints must NEVER be reachable from a browser. CORS does
// not block server-to-server fetches, so the secret is the only gate.

const router = Router();

/**
 * POST /api/internal/anon-gate
 *
 * Called by the Next.js chat handler before generation when the
 * inbound request has no Authorization header. Atomically increments
 * AnonymousCredits.creditsUsed for the IP if there are credits left,
 * otherwise returns 402 ANONYMOUS_CREDITS_EXHAUSTED.
 *
 * Body: { ip: string }
 * Response: 200 { data: { creditsRemaining: number } }
 *           402 ANONYMOUS_CREDITS_EXHAUSTED
 *           400 VALIDATION_ERROR (missing/empty ip)
 *           401 AUTH_INVALID    (missing/wrong x-internal-secret)
 */
router.post(
  '/anon-gate',
  requireInternalSecret,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ip } = (req.body ?? {}) as { ip?: unknown };
      if (!ip || typeof ip !== 'string' || ip.trim() === '') {
        const err = Errors.VALIDATION_ERROR(
          'ip is required and must be a non-empty string.',
        );
        res
          .status(err.statusCode)
          .json({ error: err.message, code: err.code });
        return;
      }

      const trimmed = ip.trim();
      const max = env.anonymousCreditsPerIp;

      // Atomic check-and-increment. The query filter requires
      // creditsUsed < max, so concurrent requests from the same IP
      // can never both pass when there's only one slot left. On first
      // call from an IP, $setOnInsert seeds the row with the current
      // env-configured maxCredits.
      const updated = await AnonymousCredits.findOneAndUpdate(
        { ip: trimmed, creditsUsed: { $lt: max } },
        {
          $inc: { creditsUsed: 1 },
          $set: { lastUsedAt: new Date() },
          $setOnInsert: { ip: trimmed, maxCredits: max },
        },
        { upsert: true, new: true },
      );

      if (!updated) {
        // Filter didn't match — IP exists with creditsUsed at the cap.
        // Look up the row to surface the actual cap in the error
        // message (older rows may have a different maxCredits if the
        // env was changed after they were created).
        const existing = await AnonymousCredits.findOne({ ip: trimmed });
        const usedMax = existing?.maxCredits ?? max;
        const err = Errors.ANONYMOUS_CREDITS_EXHAUSTED(
          usedMax,
          env.freeSignupCredits,
        );
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
          action: err.action,
        });
        return;
      }

      const creditsRemaining = updated.maxCredits - updated.creditsUsed;
      res.json({ data: { creditsRemaining } });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/internal/byo-key/lookup
 *
 * Called by the Next.js chat handler before generation for
 * authenticated users. Returns the user's decrypted plaintext
 * Anthropic key when byoKey.enabled === true; otherwise null.
 *
 * Both auth layers are required:
 *   - x-internal-secret  → caller is our own backend
 *   - Authorization JWT  → identifies the user
 *
 * A stolen JWT alone cannot extract the key (no internal secret).
 * A stolen secret alone cannot specify which user (no JWT).
 *
 * Headers:
 *   x-internal-secret: <env.internalApiSecret>
 *   Authorization: Bearer <user-jwt>
 * Response: 200 { data: { apiKey: string | null } }
 *           401 AUTH_INVALID  (missing/wrong secret OR JWT)
 *           404 NOT_FOUND     (user deleted)
 */
router.post(
  '/byo-key/lookup',
  requireInternalSecret,
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.userId;

      const user = await User.findById(userId).select('byoKey').lean();
      if (!user) {
        const err = Errors.NOT_FOUND('User');
        res
          .status(err.statusCode)
          .json({ error: err.message, code: err.code });
        return;
      }

      if (!user.byoKey?.enabled) {
        res.json({ data: { apiKey: null } });
        return;
      }

      const apiKey = await getByoKey(userId);
      res.json({ data: { apiKey } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
