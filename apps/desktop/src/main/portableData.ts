import { dirname, join, resolve } from 'node:path';

export interface PortableDataPaths {
  readonly rootDir: string;
  readonly electronUserDataDir: string;
  readonly sessionDataDir: string;
  readonly crashDumpsDir: string;
}

/**
 * Facts about the running executable used to detect the extract-and-run
 * Windows distribution (the `.zip` archive of `win-unpacked`).
 */
export interface PortableRuntimeProbe {
  readonly platform: NodeJS.Platform;
  readonly isPackaged: boolean;
  readonly execPath: string;
  readonly exists: (path: string) => boolean;
}

/**
 * Files electron-builder's NSIS installer writes next to the executable. Their
 * presence means "installed": data then lives under the user's Documents
 * folder, not next to the binary.
 */
export const WINDOWS_INSTALLED_MARKERS: readonly string[] = ['Uninstall Doku.exe'];

/** Name of the per-copy data folder created next to a portable executable. */
export const PORTABLE_DATA_DIR_NAME = 'AppUser';

/**
 * Resolves the portable data layout, or null when the app runs installed.
 *
 * Two portable flavours are recognised:
 *  1. An explicit marker in the environment (`PORTABLE_EXECUTABLE_DIR` /
 *     `PORTABLE_EXECUTABLE_FILE`, as set by NSIS portable launchers).
 *  2. A packaged Windows executable that has no NSIS uninstaller beside it:
 *     the user extracted the portable `.zip` somewhere and launched `Doku.exe`.
 */
export function resolvePortableDataPaths(
  environment: NodeJS.ProcessEnv,
  runtime?: PortableRuntimeProbe,
): PortableDataPaths | null {
  const baseDir = resolveEnvironmentBaseDir(environment) ?? resolveWindowsExecutableBaseDir(runtime);
  if (!baseDir) {
    return null;
  }

  const rootDir = join(resolve(baseDir), PORTABLE_DATA_DIR_NAME);
  const electronUserDataDir = join(rootDir, 'Electron');

  return {
    rootDir,
    electronUserDataDir,
    sessionDataDir: join(electronUserDataDir, 'Session'),
    crashDumpsDir: join(electronUserDataDir, 'Crashpad'),
  };
}

function resolveEnvironmentBaseDir(environment: NodeJS.ProcessEnv): string | null {
  const executableDir = environment.PORTABLE_EXECUTABLE_DIR?.trim();
  const executableFile = environment.PORTABLE_EXECUTABLE_FILE?.trim();
  return executableDir || (executableFile ? dirname(executableFile) : null);
}

function resolveWindowsExecutableBaseDir(runtime: PortableRuntimeProbe | undefined): string | null {
  if (!runtime || runtime.platform !== 'win32' || !runtime.isPackaged || !runtime.execPath) {
    return null;
  }

  const executableDir = dirname(runtime.execPath);
  const installed = WINDOWS_INSTALLED_MARKERS.some((marker) =>
    runtime.exists(join(executableDir, marker)),
  );
  return installed ? null : executableDir;
}
