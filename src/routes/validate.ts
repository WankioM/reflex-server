// POST /api/validate — internal relay to the Mac Mini clang validator.
//
// Browsers don't call this. reflex-web's `code-checkerv2/validator-client.ts`
// posts here with a shared bearer token; we forward to the Stage 1b
// wrapper which talks to Mac Mini over Tailscale.
//
// Contract is locked to the wrapper at `services/validator.ts` — the
// response body passes through verbatim so the web side stays
// contract-compatible without translation.

import { Router, Request, Response } from 'express';
import { validatorRelayAuth } from '../middleware/validatorRelayAuth';
import {
  validate,
  type BootstrapType,
  type InputFile,
} from '../services/validator';

const router = Router();

const ALLOWED_BOOTSTRAP_TYPES: BootstrapType[] = ['APP', 'VM_APP', 'AUDIOAPP', 'LIBRARY'];

router.post('/', validatorRelayAuth, async (req: Request, res: Response) => {
  const { code, files, bootstrapType } = req.body ?? {};

  if (typeof code !== 'string' || code.length === 0) {
    res.status(400).json({ error: 'code (string) is required', code: 'BAD_REQUEST' });
    return;
  }
  if (files !== undefined && !Array.isArray(files)) {
    res.status(400).json({ error: 'files must be an array', code: 'BAD_REQUEST' });
    return;
  }
  if (
    bootstrapType !== undefined &&
    !ALLOWED_BOOTSTRAP_TYPES.includes(bootstrapType)
  ) {
    res.status(400).json({
      error: `bootstrapType must be one of ${ALLOWED_BOOTSTRAP_TYPES.join(', ')}`,
      code: 'BAD_REQUEST',
    });
    return;
  }

  const result = await validate(code, {
    files: files as InputFile[] | undefined,
    bootstrapType: bootstrapType as BootstrapType | undefined,
  });

  // Pass through wrapper output verbatim. 200 even for ok:false or
  // skipped:true — the relay completed successfully; the validator's
  // verdict is the payload.
  res.json(result);
});

export default router;
