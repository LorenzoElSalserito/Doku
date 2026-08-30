import { dirname, join, resolve } from 'node:path';

export interface PortableDataPaths {
  readonly rootDir: string;
  readonly electronUserDataDir: string;
  readonly sessionDataDir: string;
  readonly crashDumpsDir: string;
}

export function resolvePortableDataPaths(
  environment: NodeJS.ProcessEnv,
): PortableDataPaths | null {
  const executableDir = environment.PORTABLE_EXECUTABLE_DIR?.trim();
  const executableFile = environment.PORTABLE_EXECUTABLE_FILE?.trim();
  const baseDir = executableDir || (executableFile ? dirname(executableFile) : null);

  if (!baseDir) {
    return null;
  }

  const rootDir = join(resolve(baseDir), 'AppUser');
  const electronUserDataDir = join(rootDir, 'Electron');

  return {
    rootDir,
    electronUserDataDir,
    sessionDataDir: join(electronUserDataDir, 'Session'),
    crashDumpsDir: join(electronUserDataDir, 'Crashpad'),
  };
}
