import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { Errors } from '../errors/errorCodes';

/**
 * Server-to-server auth. Compares the `x-internal-secret` header to
 * `env.internalApiSecret` using a constant-time check. For endpoints
 * reachable only from our own Vercel functions or other trusted
 * backends — never from a browser.
 *
 * User JWT alone is not sufficient on these endpoints because a stolen
 * JWT must not be enough to extract plaintext API keys (the BYOK
 * lookup endpoint returns plaintext; without this gate, a stolen
 * session token would let an attacker exfiltrate the user's Anthropic
 * key directly).
 */
export function requireInternalSecret(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const provided = req.header('x-internal-secret');
  const expected = env.internalApiSecret;

  let ok = false;
  if (provided && provided.length === expected.length) {
    try {
      ok = crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
    } catch {
      ok = false;
    }
  }

  if (!ok) {
    const err = Errors.AUTH_INVALID();
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  next();
}
