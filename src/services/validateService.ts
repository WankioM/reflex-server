import { spawn } from 'child_process';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

/**
 * Tier 1 build validator for Reflex C++ code.
 *
 * Wraps `clang -fsyntax-only` to catch typos, type errors, missing args, and
 * undefined identifiers before any real build is attempted. No codegen, no
 * link — works on Linux/macOS/Windows wherever clang is on PATH.
 *
 * Spec: Projects/Reflex/ReflexVirtual/build-validation-tier1.md
 */

export type BootstrapType =
  | 'APP'
  | 'VM_APP'
  | 'AUDIOAPP'
  | 'AUDIOPLUGIN'
  | 'LIBRARY';

export const BOOTSTRAP_TYPES: readonly BootstrapType[] = [
  'APP',
  'VM_APP',
  'AUDIOAPP',
  'AUDIOPLUGIN',
  'LIBRARY',
] as const;

export interface ValidateInputFile {
  name: string;
  content: string;
}

export interface ValidateInput {
  /** Single-file shorthand. Used as `entry.cpp` if `files` is omitted. */
  code?: string;
  /** Multi-file form. Names must be safe (no separators, no traversal). */
  files?: ValidateInputFile[];
  /** Defaults to "APP". */
  bootstrapType?: BootstrapType;
}

export interface ValidateDiagnostic {
  file: string;
  line: number;
  col: number;
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidateResult {
  ok: boolean;
  errors: ValidateDiagnostic[];
  warnings: ValidateDiagnostic[];
  exitCode: number;
  stderr: string;
}

// Resolved at call time so tests and runtime config can override these via env.
const getClangPath = (): string => process.env.CLANG_PATH || 'clang';
const getReflexIncludePath = (): string =>
  process.env.REFLEX_INCLUDE_PATH || '/app/vendor/reflex-include';

// Spawn timeout — clang on a single TU should never take this long.
// Header-heavy Reflex translation units take a few seconds; allow generous slack.
const CLANG_TIMEOUT_MS = 30_000;

const SAFE_FILENAME = /^[A-Za-z0-9_.-]+$/;

const DIAGNOSTIC_LINE = /^(.+?):(\d+):(\d+): (error|warning): (.+)$/gm;

function normaliseInputs(input: ValidateInput): ValidateInputFile[] {
  if (input.files && input.files.length > 0) return input.files;
  if (typeof input.code === 'string' && input.code.length > 0) {
    return [{ name: 'entry.cpp', content: input.code }];
  }
  throw new Error('Either `code` or `files` must be provided.');
}

function assertSafeFilename(name: string): void {
  if (!SAFE_FILENAME.test(name)) {
    throw new Error(
      `Invalid filename "${name}": must match ${SAFE_FILENAME.source}`
    );
  }
}

function parseDiagnostics(
  stderr: string,
  tmpDir: string
): { errors: ValidateDiagnostic[]; warnings: ValidateDiagnostic[] } {
  const errors: ValidateDiagnostic[] = [];
  const warnings: ValidateDiagnostic[] = [];

  // Reset regex state between calls.
  DIAGNOSTIC_LINE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = DIAGNOSTIC_LINE.exec(stderr)) !== null) {
    const [, rawFile, lineStr, colStr, severity, message] = match;
    // Strip the temp dir prefix so callers see only the original filename.
    const file = path
      .relative(tmpDir, rawFile)
      .split(path.sep)
      .join('/') || rawFile;

    const diag: ValidateDiagnostic = {
      file,
      line: parseInt(lineStr, 10),
      col: parseInt(colStr, 10),
      severity: severity as 'error' | 'warning',
      message,
    };
    if (severity === 'error') errors.push(diag);
    else warnings.push(diag);
  }

  return { errors, warnings };
}

interface SpawnResult {
  stderr: string;
  exitCode: number;
}

function runClang(args: string[], cwd: string): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(getClangPath(), args, { cwd });
    let stderr = '';
    const stderrChunks: Buffer[] = [];
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, CLANG_TIMEOUT_MS);

    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
    child.stdout.on('data', () => {
      // -fsyntax-only emits no stdout; drain anyway.
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      stderr = Buffer.concat(stderrChunks).toString('utf8');
      if (timedOut) {
        reject(new Error(`clang timed out after ${CLANG_TIMEOUT_MS}ms`));
        return;
      }
      resolve({ stderr, exitCode: code ?? -1 });
    });
  });
}

/**
 * Validate Reflex C++ code by running `clang -fsyntax-only`.
 *
 * Writes inputs to a temp dir, invokes clang, parses stderr, cleans up.
 * Returns a structured result regardless of clang exit code — only throws on
 * input validation errors or a clang spawn failure.
 */
export async function validateCode(
  input: ValidateInput
): Promise<ValidateResult> {
  const files = normaliseInputs(input);
  for (const f of files) assertSafeFilename(f.name);

  const bootstrapType: BootstrapType = input.bootstrapType ?? 'APP';
  if (!BOOTSTRAP_TYPES.includes(bootstrapType)) {
    throw new Error(
      `Invalid bootstrapType "${bootstrapType}": expected one of ${BOOTSTRAP_TYPES.join(', ')}`
    );
  }

  const tmpDir = await mkdtemp(path.join(tmpdir(), 'reflex-validate-'));
  try {
    await Promise.all(
      files.map((f) =>
        writeFile(path.join(tmpDir, f.name), f.content, 'utf8')
      )
    );

    const args = [
      '-fsyntax-only',
      '-std=c++20',
      `-DREFLEX_BOOTSTRAP_TYPE_${bootstrapType}`,
      '-Wno-invalid-offsetof',
      '-I',
      getReflexIncludePath(),
      ...files.map((f) => f.name),
    ];

    const { stderr, exitCode } = await runClang(args, tmpDir);
    const { errors, warnings } = parseDiagnostics(stderr, tmpDir);

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      exitCode,
      stderr,
    };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {
      // Cleanup is best-effort; do not mask the primary error.
    });
  }
}
