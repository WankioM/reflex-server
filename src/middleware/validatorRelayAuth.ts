// Bearer-token auth for the internal /api/validate relay route.
//
// This is NOT user auth. /api/validate is an internal hop:
//   reflex-web (Vercel) → reflex-server (Railway) → Mac Mini (Tailscale)
// Browsers never call it. The token (`VALIDATOR_RELAY_TOKEN`) is a
// shared secret set on both Vercel and Railway with the same value.
//
// Distinct from the Mac Mini-side `VALIDATOR_TOKEN` — different threat
// model, independent rotation. See PROJECT.md 2026-04-29 entries.

import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

export function validatorRelayAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.VALIDATOR_RELAY_TOKEN;
  if (!expected) {
    res.status(503).json({
      error: 'service_unconfigured',
      code: 'VALIDATOR_RELAY_NOT_CONFIGURED',
    });
    return;
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing bearer token', code: 'AUTH_REQUIRED' });
    return;
  }

  const provided = header.slice('Bearer '.length).trim();

  // Constant-time compare. Buffers must be the same length, so length-mismatch
  // short-circuits explicitly.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'invalid token', code: 'AUTH_INVALID' });
    return;
  }

  next();
}
