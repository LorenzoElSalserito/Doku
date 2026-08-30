import { describe, expect, it } from 'vitest';
import { dirname, join, resolve } from 'node:path';
import { resolvePortableDataPaths } from './portableData.js';

describe('resolvePortableDataPaths', () => {
  it('keeps portable state in AppUser beside the executable', () => {
    const executableDir = join('C:', 'Tools', 'Doku');

    expect(resolvePortableDataPaths({ PORTABLE_EXECUTABLE_DIR: executableDir })).toEqual({
      rootDir: join(resolve(executableDir), 'AppUser'),
      electronUserDataDir: join(resolve(executableDir), 'AppUser', 'Electron'),
      sessionDataDir: join(resolve(executableDir), 'AppUser', 'Electron', 'Session'),
      crashDumpsDir: join(resolve(executableDir), 'AppUser', 'Electron', 'Crashpad'),
    });
  });

  it('falls back to the portable executable file location', () => {
    const executableFile = join('C:', 'Tools', 'Doku', 'Doku.exe');

    expect(resolvePortableDataPaths({ PORTABLE_EXECUTABLE_FILE: executableFile })?.rootDir).toBe(
      join(resolve(dirname(executableFile)), 'AppUser'),
    );
  });

  it('does not alter installed or development builds', () => {
    expect(resolvePortableDataPaths({})).toBeNull();
  });
});
