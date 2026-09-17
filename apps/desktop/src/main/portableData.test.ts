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

describe('resolvePortableDataPaths (extract-and-run Windows archive)', () => {
  const executableDir = join('D:', 'Apps', 'Doku');
  const probe = (overrides: Partial<Parameters<typeof resolvePortableDataPaths>[1]> = {}) => ({
    platform: 'win32' as NodeJS.Platform,
    isPackaged: true,
    execPath: join(executableDir, 'Doku.exe'),
    exists: () => false,
    ...overrides,
  });

  it('treats a packaged Windows executable without an uninstaller as portable', () => {
    expect(resolvePortableDataPaths({}, probe())?.rootDir).toBe(
      join(resolve(executableDir), 'AppUser'),
    );
  });

  it('treats a packaged Windows executable next to the NSIS uninstaller as installed', () => {
    const uninstaller = join(executableDir, 'Uninstall Doku.exe');
    expect(
      resolvePortableDataPaths({}, probe({ exists: (path) => path === uninstaller })),
    ).toBeNull();
  });

  it('never applies the heuristic outside packaged Windows builds', () => {
    expect(resolvePortableDataPaths({}, probe({ isPackaged: false }))).toBeNull();
    expect(resolvePortableDataPaths({}, probe({ platform: 'linux' }))).toBeNull();
    expect(resolvePortableDataPaths({}, probe({ platform: 'darwin' }))).toBeNull();
  });

  it('lets an explicit environment marker win over the executable heuristic', () => {
    const marker = join('E:', 'Stick', 'Doku');
    const uninstaller = join(executableDir, 'Uninstall Doku.exe');
    expect(
      resolvePortableDataPaths(
        { PORTABLE_EXECUTABLE_DIR: marker },
        probe({ exists: (path) => path === uninstaller }),
      )?.rootDir,
    ).toBe(join(resolve(marker), 'AppUser'));
  });
});
