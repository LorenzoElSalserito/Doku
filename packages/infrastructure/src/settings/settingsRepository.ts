import { promises as fs } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import {
  DEFAULT_SETTINGS,
  SettingsSchema,
  type Settings,
  type SettingsPatch,
} from '@doku/schemas';
import type { SessionLogger } from '../logging/sessionLogger.js';
import { serializeErrorForLog } from '../logging/sessionLogger.js';

type UnknownRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Deep-merges a partial (possibly stale-schema) value onto a defaults tree.
// For nested objects we recurse so that *new* fields introduced by the latest
// schema version are filled in from the defaults while *existing* user fields
// from an older version are preserved. Arrays and primitives are taken from
// the partial when present.
function deepMergeDefaults<T>(defaults: T, partial: unknown): T {
  if (partial === undefined) return defaults;
  if (!isPlainObject(defaults)) {
    return partial as T;
  }
  if (!isPlainObject(partial)) {
    return defaults;
  }
  const result: UnknownRecord = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (key in partial) {
      result[key] = deepMergeDefaults(
        (defaults as UnknownRecord)[key],
        partial[key],
      );
    }
  }
  return result as T;
}

export interface SettingsRepositoryOptions {
  userDataDir: string;
  fileName?: string;
  legacyFilePaths?: string[];
  logger?: SessionLogger;
}

export class SettingsRepository {
  private readonly filePath: string;
  private readonly backupFilePath: string;
  private readonly legacyFilePaths: string[];
  private readonly logger?: SessionLogger;
  private cached: Settings | null = null;
  // Serializes read+write transitions so concurrent updates don't lose fields.
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(options: SettingsRepositoryOptions) {
    this.filePath = join(options.userDataDir, options.fileName ?? 'settings.json');
    this.backupFilePath = `${this.filePath}.bak`;
    this.legacyFilePaths = options.legacyFilePaths ?? [];
    this.logger = options.logger;
  }

  async read(): Promise<Settings> {
    if (this.cached) {
      this.logger?.info('settings:read-cache-hit');
      return this.cached;
    }
    return this.enqueue(() => this.readUncached());
  }

  async update(patch: SettingsPatch): Promise<Settings> {
    return this.enqueue(async () => {
      const current = this.cached ?? (await this.readUncached());
      const next = SettingsSchema.parse({ ...current, ...patch });
      this.cached = next;
      await this.persist(next);
      return next;
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(task, task);
    this.writeQueue = run.catch(() => undefined);
    return run;
  }

  private async readUncached(): Promise<Settings> {
    try {
      return await this.readAndNormalize(this.filePath, true);
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') {
        for (const legacyPath of this.legacyFilePaths) {
          try {
            const migrated = await this.readAndNormalize(legacyPath, false);
            await this.persist(migrated);
            this.cached = migrated;
            this.logger?.info('settings:migrated-from-legacy', { legacyPath });
            return migrated;
          } catch (legacyErr: unknown) {
            if (!isNodeError(legacyErr) || legacyErr.code !== 'ENOENT') {
              this.logger?.warn('settings:legacy-read-failed', {
                legacyPath,
                error: serializeErrorForLog(legacyErr),
              });
            }
          }
        }
        this.cached = DEFAULT_SETTINGS;
        await this.persist(DEFAULT_SETTINGS);
        this.logger?.info('settings:created-defaults', { filePath: this.filePath });
        return DEFAULT_SETTINGS;
      }
      this.logger?.warn('settings:read-failed-using-defaults', {
        filePath: this.filePath,
        error: serializeErrorForLog(err),
      });
      this.cached = DEFAULT_SETTINGS;
      await this.persist(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
  }

  private async persist(settings: Settings): Promise<void> {
    await this.persistFile(this.filePath, settings);
    await this.persistFile(this.backupFilePath, settings);
  }

  private async persistFile(path: string, settings: Settings): Promise<void> {
    await fs.mkdir(dirname(path), { recursive: true });
    const payload = JSON.stringify(settings, null, 2);
    const tempPath = `${path}.tmp-${process.pid}-${Date.now()}`;
    try {
      const handle = await fs.open(tempPath, 'w');
      try {
        await handle.writeFile(payload, 'utf-8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await fs.rename(tempPath, path);
      await syncDirectory(dirname(path));
    } catch (err) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
      throw err;
    }
  }

  private async readAndNormalize(path: string, persistIfNeeded: boolean): Promise<Settings> {
    const raw = await fs.readFile(path, 'utf-8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      // Truncated or corrupted file (e.g. crash mid-write). Try the leftover
      // temp file from the last persist before falling back to defaults.
      this.logger?.warn('settings:invalid-json', {
        path,
        error: serializeErrorForLog(parseErr),
      });
      const recovered = await this.tryRecoverFromTempFile();
      if (recovered) {
        if (persistIfNeeded) {
          await this.persist(recovered);
        }
        this.cached = recovered;
        this.logger?.info('settings:recovered-from-secondary-copy', { path });
        return recovered;
      }
      this.cached = DEFAULT_SETTINGS;
      if (persistIfNeeded) {
        await this.persist(DEFAULT_SETTINGS);
      }
      return DEFAULT_SETTINGS;
    }
    const result = SettingsSchema.safeParse(parsed);

    if (result.success) {
      this.cached = result.data;
      this.logger?.info('settings:read-valid-file', { path });
      return this.cached;
    }

    // Corrupt or outdated schema (e.g. user reinstalled over an older version
    // that wrote a settings.json with fewer fields). Recover as much as we can
    // by deep-merging onto defaults and validating field-by-field.
    const merged = this.recoverFromStaleSchema(parsed, result.error.issues.length, path);
    this.cached = merged;
    if (persistIfNeeded) {
      await this.persist(merged);
    }
    return merged;
  }

  private recoverFromStaleSchema(
    parsed: unknown,
    issueCount: number,
    path: string,
  ): Settings {
    const parsedObject = isPlainObject(parsed) ? parsed : {};
    // The very existence of a parseable settings file means the user has
    // already finished onboarding on a previous version — never bounce them
    // back into the first-run wizard just because a field was renamed.
    const baseDefaults: Settings = {
      ...DEFAULT_SETTINGS,
      firstRunCompleted: true,
    };
    const candidate = deepMergeDefaults(baseDefaults, parsedObject);

    const fullParse = SettingsSchema.safeParse(candidate);
    if (fullParse.success) {
      this.logger?.warn('settings:normalized-invalid-schema', {
        path,
        issueCount,
        recoveryStrategy: 'deep-merge',
      });
      return fullParse.data;
    }

    // A specific field is still invalid (e.g. an enum value retired between
    // versions). Validate each top-level field individually and substitute the
    // default only for the offending fields, so the rest of the user's data
    // stays intact.
    const recovered: UnknownRecord = { ...baseDefaults };
    const shape = SettingsSchema.shape as Record<string, { safeParse: (v: unknown) => { success: boolean; data?: unknown } }>;
    let droppedFields = 0;
    for (const field of Object.keys(shape)) {
      const fieldResult = shape[field].safeParse((candidate as UnknownRecord)[field]);
      if (fieldResult.success) {
        recovered[field] = fieldResult.data;
      } else {
        droppedFields += 1;
      }
    }
    const finalParse = SettingsSchema.safeParse(recovered);
    const final = finalParse.success ? finalParse.data : baseDefaults;
    this.logger?.warn('settings:normalized-invalid-schema', {
      path,
      issueCount,
      recoveryStrategy: finalParse.success ? 'per-field' : 'defaults',
      droppedFields,
    });
    return final;
  }

  private async tryRecoverFromTempFile(): Promise<Settings | null> {
    let entries: string[];
    try {
      entries = await fs.readdir(dirname(this.filePath));
    } catch {
      return null;
    }
    const baseName = basename(this.filePath);
    const tempPrefix = `${baseName}.tmp-`;
    const candidates = await this.sortNewestFirst(
      entries.filter((name) => name.startsWith(tempPrefix)),
    );

    for (const name of candidates) {
      const candidatePath = join(dirname(this.filePath), name);
      try {
        const recovered = await this.readValidSecondaryCopy(candidatePath);
        if (recovered) {
          await fs.rm(candidatePath, { force: true }).catch(() => undefined);
          return recovered;
        }
      } catch {
        // Skip unreadable candidate.
      }
    }
    return this.readValidSecondaryCopy(this.backupFilePath);
  }

  private async readValidSecondaryCopy(path: string): Promise<Settings | null> {
    try {
      const raw = await fs.readFile(path, 'utf-8');
      const parsed = JSON.parse(raw);
      const result = SettingsSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
      return this.recoverFromStaleSchema(parsed, result.error.issues.length, path);
    } catch {
      return null;
    }
  }

  private async sortNewestFirst(names: string[]): Promise<string[]> {
    const stats = await Promise.all(
      names.map(async (name) => {
        try {
          const stat = await fs.stat(join(dirname(this.filePath), name));
          return { name, mtimeMs: stat.mtimeMs };
        } catch {
          return { name, mtimeMs: 0 };
        }
      }),
    );
    return stats.sort((a, b) => b.mtimeMs - a.mtimeMs).map((entry) => entry.name);
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

async function syncDirectory(path: string): Promise<void> {
  try {
    const handle = await fs.open(path, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (err: unknown) {
    // Directory fsync is unsupported on some platforms/filesystems. Atomic
    // rename still protects readers there; keep startup resilient.
    if (
      isNodeError(err) &&
      (err.code === 'EINVAL' ||
        err.code === 'EPERM' ||
        err.code === 'EISDIR' ||
        err.code === 'ENOTSUP')
    ) {
      return;
    }
    throw err;
  }
}
