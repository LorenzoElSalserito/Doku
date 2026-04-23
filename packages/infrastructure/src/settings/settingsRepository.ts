import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  DEFAULT_SETTINGS,
  SettingsSchema,
  type Settings,
  type SettingsPatch,
} from '@doku/schemas';
import type { SessionLogger } from '../logging/sessionLogger.js';
import { serializeErrorForLog } from '../logging/sessionLogger.js';

export interface SettingsRepositoryOptions {
  userDataDir: string;
  fileName?: string;
  legacyFilePaths?: string[];
  logger?: SessionLogger;
}

export class SettingsRepository {
  private readonly filePath: string;
  private readonly legacyFilePaths: string[];
  private readonly logger?: SessionLogger;
  private cached: Settings | null = null;

  constructor(options: SettingsRepositoryOptions) {
    this.filePath = join(options.userDataDir, options.fileName ?? 'settings.json');
    this.legacyFilePaths = options.legacyFilePaths ?? [];
    this.logger = options.logger;
  }

  async read(): Promise<Settings> {
    if (this.cached) return this.cached;
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

  async update(patch: SettingsPatch): Promise<Settings> {
    const current = await this.read();
    const next = SettingsSchema.parse({ ...current, ...patch });
    await this.persist(next);
    this.cached = next;
    return next;
  }

  private async persist(settings: Settings): Promise<void> {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    const payload = JSON.stringify(settings, null, 2);
    await fs.writeFile(this.filePath, payload, 'utf-8');
  }

  private async readAndNormalize(path: string, persistIfNeeded: boolean): Promise<Settings> {
    const raw = await fs.readFile(path, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    const result = SettingsSchema.safeParse(parsed);

    if (result.success) {
      this.cached = result.data;
      return this.cached;
    }

    // Corrupt or outdated schema: fall back to defaults, preserve known fields.
    const parsedObject = parsed && typeof parsed === 'object' ? parsed : {};
    const mergedResult = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...parsedObject });
    const merged = mergedResult.success ? mergedResult.data : DEFAULT_SETTINGS;
    this.logger?.warn('settings:normalized-invalid-schema', {
      path,
      issueCount: result.error.issues.length,
      usedDefaultsOnly: !mergedResult.success,
    });
    this.cached = merged;
    if (persistIfNeeded) {
      await this.persist(merged);
    }
    return merged;
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
