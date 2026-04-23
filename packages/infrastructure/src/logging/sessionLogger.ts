import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;

export interface SessionLoggerInfo {
  sessionId: string;
  logFilePath: string;
  startedAt: string;
}

export class SessionLogger {
  private readonly filePath: string;
  private readonly logsDir: string;
  private readonly sessionId: string;
  private readonly startedAt: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(options: { logsDir: string; sessionId?: string; startedAt?: Date }) {
    const startedAt = options.startedAt ?? new Date();
    this.logsDir = options.logsDir;
    this.sessionId = options.sessionId ?? formatSessionId(startedAt);
    this.startedAt = startedAt.toISOString();
    this.filePath = join(options.logsDir, `session-${this.sessionId}.log`);
  }

  info(event: string, context?: LogContext): void {
    this.write('info', event, context);
  }

  warn(event: string, context?: LogContext): void {
    this.write('warn', event, context);
  }

  error(event: string, context?: LogContext): void {
    this.write('error', event, context);
  }

  debug(event: string, context?: LogContext): void {
    this.write('debug', event, context);
  }

  getInfo(): SessionLoggerInfo {
    return {
      sessionId: this.sessionId,
      logFilePath: this.filePath,
      startedAt: this.startedAt,
    };
  }

  async flush(): Promise<void> {
    await this.writeQueue;
  }

  async readTail(maxChars = 12_000): Promise<string> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      return raw.length > maxChars ? raw.slice(raw.length - maxChars) : raw;
    } catch {
      return '';
    }
  }

  async pruneOlderThan(maxAgeMs: number): Promise<void> {
    const threshold = Date.now() - maxAgeMs;

    try {
      const entries = await fs.readdir(this.logsDir, { withFileTypes: true });
      await Promise.all(
        entries
          .filter((entry) => entry.isFile() && /^session-.+\.log$/.test(entry.name))
          .map(async (entry) => {
            const path = join(this.logsDir, entry.name);
            const stats = await fs.stat(path);
            if (stats.mtimeMs < threshold && path !== this.filePath) {
              await fs.rm(path, { force: true });
            }
          }),
      );
    } catch {
      // Log retention must not block app startup.
    }
  }

  private write(level: LogLevel, event: string, context: LogContext = {}): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      sessionId: this.sessionId,
      context: sanitizeForLog(context),
    };
    const payload = `${JSON.stringify(entry)}\n`;

    this.writeQueue = this.writeQueue
      .then(async () => {
        await fs.mkdir(dirname(this.filePath), { recursive: true });
        await fs.appendFile(this.filePath, payload, 'utf-8');
      })
      .catch(() => {
        // Logging must never break application flow.
      });
  }
}

export function serializeErrorForLog(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    value: String(error),
  };
}

function sanitizeForLog(value: unknown): unknown {
  if (value instanceof Error) {
    return serializeErrorForLog(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      shouldRedactKey(key) ? summarizeValue(item) : sanitizeForLog(item),
    ]),
  );
}

function shouldRedactKey(key: string): boolean {
  return /content|body|raw|text|password|token|secret/i.test(key);
}

function summarizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return {
      redacted: true,
      length: value.length,
    };
  }

  return {
    redacted: true,
    type: Array.isArray(value) ? 'array' : typeof value,
  };
}

function formatSessionId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}
