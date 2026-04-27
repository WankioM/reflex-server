import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { assistantLimiter } from '../middleware/rateLimiter';
import { Errors } from '../errors/errorCodes';
import {
  validateCode,
  BOOTSTRAP_TYPES,
  type BootstrapType,
  type ValidateInputFile,
} from '../services/validateService';

const router = Router();

// Admin-only initially. This is a new attack surface (we spawn clang against
// caller-supplied source) — open it up to other roles only after Stages 3–5
// of the Tier 1 rollout plan.
router.use(authenticate, requireRole('admin'), assistantLimiter);

/**
 * POST /api/validate
 *
 * Input:
 *   {
 *     code?: string,
 *     files?: [{ name: string, content: string }],
 *     bootstrapType?: "APP" | "VM_APP" | "AUDIOAPP" | "AUDIOPLUGIN" | "LIBRARY"
 *   }
 *
 * Output:
 *   {
 *     ok: boolean,
 *     errors: [{ file, line, col, severity, message }],
 *     warnings: [...same shape...],
 *     exitCode: number,
 *     stderr: string
 *   }
 *
 * Spec: Projects/Reflex/ReflexVirtual/build-validation-tier1.md
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, files, bootstrapType } = req.body ?? {};

    if (typeof code !== 'string' && !Array.isArray(files)) {
      const err = Errors.VALIDATION_ERROR(
        'Provide `code` (string) or `files` (array of {name, content}).'
      );
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }

    let normalisedFiles: ValidateInputFile[] | undefined;
    if (Array.isArray(files)) {
      if (files.length === 0) {
        const err = Errors.VALIDATION_ERROR('`files` must contain at least one entry.');
        res.status(err.statusCode).json({ error: err.message, code: err.code });
        return;
      }
      for (const f of files) {
        if (!f || typeof f.name !== 'string' || typeof f.content !== 'string') {
          const err = Errors.VALIDATION_ERROR(
            'Each `files` entry must be { name: string, content: string }.'
          );
          res.status(err.statusCode).json({ error: err.message, code: err.code });
          return;
        }
      }
      normalisedFiles = files as ValidateInputFile[];
    }

    if (
      bootstrapType !== undefined &&
      !BOOTSTRAP_TYPES.includes(bootstrapType as BootstrapType)
    ) {
      const err = Errors.VALIDATION_ERROR(
        `bootstrapType must be one of: ${BOOTSTRAP_TYPES.join(', ')}.`
      );
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }

    const result = await validateCode({
      code: typeof code === 'string' ? code : undefined,
      files: normalisedFiles,
      bootstrapType: bootstrapType as BootstrapType | undefined,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
