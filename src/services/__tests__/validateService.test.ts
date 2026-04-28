import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { validateCode, type ValidateInputFile } from '../validateService';

/**
 * Smoke tests for the Tier 1 build validator.
 *
 * These tests spawn clang and parse Reflex framework headers, so they need:
 *   - clang on PATH (or env CLANG_PATH pointing at clang.exe)
 *   - REFLEX_INCLUDE_PATH pointing at vendor/reflex-include
 *
 * The describe.skip below activates if either fixture dir is missing — keeps
 * CI green on hosts that don't have the local Reflex examples checked out.
 */

const NOTES_DIR =
  process.env.REFLEX_NOTES_FIXTURE ||
  'C:/Users/VICTUS/Desktop/reflex/examples/Notes (Cpp App)/code';

const STOCKWATCH_DIR =
  process.env.REFLEX_STOCKWATCH_FIXTURE ||
  'C:/Users/VICTUS/Documents/DesktopApps/reflex-apps/stockwatch/code';

// Default the include path for local dev runs. CI will set REFLEX_INCLUDE_PATH
// explicitly; we only fill in a sensible local default here.
if (!process.env.REFLEX_INCLUDE_PATH) {
  process.env.REFLEX_INCLUDE_PATH = path.resolve(
    __dirname,
    '../../../vendor/reflex-include'
  );
}

// Local Windows clang path (Tracy's dev box). Override via env in CI.
if (!process.env.CLANG_PATH && process.platform === 'win32') {
  process.env.CLANG_PATH = 'C:/Program Files/LLVM/bin/clang.exe';
}

async function readSourceDir(dir: string): Promise<ValidateInputFile[]> {
  const entries = await readdir(dir);
  const sourceFiles = entries.filter((n) => /\.(cpp|h|hpp|cc)$/i.test(n));
  return Promise.all(
    sourceFiles.map(async (name) => ({
      name,
      content: await readFile(path.join(dir, name), 'utf8'),
    }))
  );
}

async function dirExists(dir: string): Promise<boolean> {
  try {
    await readdir(dir);
    return true;
  } catch {
    return false;
  }
}

describe('validateService', () => {
  describe('Notes (Cpp App) — known-good fixture', () => {
    let files: ValidateInputFile[] | null = null;

    beforeAll(async () => {
      if (!(await dirExists(NOTES_DIR))) return;
      files = await readSourceDir(NOTES_DIR);
    });

    it('returns ok:true with no errors', async () => {
      if (!files) {
        console.warn(`Skipping: fixture not found at ${NOTES_DIR}`);
        return;
      }
      const result = await validateCode({ files, bootstrapType: 'APP' });

      if (!result.ok) {
        console.error('Notes validation stderr:', result.stderr);
      }
      // Contract: `ok` is the source of truth — it's true iff zero errors.
      // Exit code can be non-zero when warnings are present (Reflex's
      // REFLEX_OFFSETOF macro emits 17 -Winvalid-offsetof warnings on stdlib
      // headers despite -Wno-invalid-offsetof on user code), so we don't
      // assert exitCode here.
      expect(result.errors).toEqual([]);
      expect(result.ok).toBe(true);
    });
  });

  describe('stockwatch view.cpp — known-bad fixture', () => {
    let files: ValidateInputFile[] | null = null;

    beforeAll(async () => {
      if (!(await dirExists(STOCKWATCH_DIR))) return;
      files = await readSourceDir(STOCKWATCH_DIR);
    });

    it('returns ok:false with the expected error patterns', async () => {
      if (!files) {
        console.warn(`Skipping: fixture not found at ${STOCKWATCH_DIR}`);
        return;
      }
      const result = await validateCode({ files, bootstrapType: 'APP' });

      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(15);

      const messages = result.errors.map((e) => e.message).join('\n');
      // Point<float>.h / .w confusion — Tracy's signature stockwatch errors.
      expect(messages).toMatch(/no member named 'h' in 'Reflex::Point<float>'/);
      // ToCString ambiguity — three call sites in the broken view.cpp.
      expect(messages).toMatch(/ToCString/);
    });
  });

  describe('input validation', () => {
    it('rejects unsafe filenames', async () => {
      await expect(
        validateCode({ files: [{ name: '../evil.cpp', content: '' }] })
      ).rejects.toThrow(/Invalid filename/);
    });

    it('rejects bad bootstrapType', async () => {
      await expect(
        validateCode({
          code: 'int main(){}',
          bootstrapType: 'NOPE' as never,
        })
      ).rejects.toThrow(/Invalid bootstrapType/);
    });

    it('requires either code or files', async () => {
      await expect(validateCode({})).rejects.toThrow(/code.*or.*files/);
    });
  });
});
