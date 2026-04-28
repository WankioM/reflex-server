// Client wrapper for the reflex-validator sidecar (runs on Mac Mini, reached
// over Tailscale). Stage 1b of the Tier 1 validation pipeline.
//
// NOT yet wired into /api/chat — that's Stage 3 (shadow mode). This module
// just exposes an importable function.
//
// Graceful degradation: when the validator is unreachable, this returns
// { ok: null, skipped: true, reason } so callers can decide whether to ship
// unvalidated rather than blowing up.

export type BootstrapType = 'APP' | 'VM_APP' | 'AUDIOAPP' | 'LIBRARY';

export interface InputFile {
  name: string;
  content: string;
}

export interface ClangDiagnostic {
  file: string;
  line: number;
  col: number;
  message: string;
}

export interface ValidationOk {
  ok: boolean;
  skipped: false;
  errors: ClangDiagnostic[];
  warnings: ClangDiagnostic[];
  exitCode: number;
  stderr: string;
  elapsedMs: number;
  pchUsed: boolean;
  target: string;
  bootstrapType: BootstrapType;
}

export interface ValidationSkipped {
  ok: null;
  skipped: true;
  reason: string;
}

export type ValidationResult = ValidationOk | ValidationSkipped;

export interface ValidateOptions {
  files?: InputFile[];
  bootstrapType?: BootstrapType;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function skipped(reason: string): ValidationSkipped {
  return { ok: null, skipped: true, reason };
}

async function postOnce(
  url: string,
  token: string,
  body: object,
  timeoutMs: number
): Promise<{ status: number; json: any } | { networkError: Error }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Validator-Token': token,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  } catch (e: any) {
    return { networkError: e };
  } finally {
    clearTimeout(timer);
  }
}

export async function validate(
  code: string,
  options: ValidateOptions = {}
): Promise<ValidationResult> {
  const url = process.env.VALIDATOR_URL;
  const token = process.env.VALIDATOR_TOKEN;
  if (!url || !token) {
    return skipped('VALIDATOR_URL or VALIDATOR_TOKEN not set');
  }

  const body = {
    code,
    files: options.files ?? [],
    bootstrapType: options.bootstrapType ?? 'APP',
  };
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let result = await postOnce(url, token, body, timeoutMs);

  // Retry once on network error (timeout, DNS, ECONNREFUSED, etc).
  // Do NOT retry on 4xx/5xx — those are determinate, not flaky.
  if ('networkError' in result) {
    result = await postOnce(url, token, body, timeoutMs);
  }

  if ('networkError' in result) {
    return skipped(`validator unreachable: ${result.networkError.message}`);
  }

  if (result.status !== 200) {
    return skipped(`validator HTTP ${result.status}: ${JSON.stringify(result.json).slice(0, 200)}`);
  }

  const j = result.json;
  return {
    ok: j.ok,
    skipped: false,
    errors: j.errors ?? [],
    warnings: j.warnings ?? [],
    exitCode: j.exitCode,
    stderr: j.stderr ?? '',
    elapsedMs: j.elapsedMs ?? 0,
    pchUsed: !!j.pchUsed,
    target: j.target ?? '',
    bootstrapType: j.bootstrapType ?? 'APP',
  };
}
