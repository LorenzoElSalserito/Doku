import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const CRASH_STATE_FILENAME = 'crash-state.json';
const SAFE_MODE_THRESHOLD = 2;
const HEALTHY_BOOTSTRAP_DELAY_MS = 8000;

interface CrashStatePayload {
  consecutiveCrashes: number;
  lastBootstrapAt: string;
}

export class CrashStateManager {
  private readonly filePath: string;
  private state: CrashStatePayload = { consecutiveCrashes: 0, lastBootstrapAt: '' };

  constructor(dataDir: string) {
    this.filePath = join(dataDir, CRASH_STATE_FILENAME);
  }

  async markBootstrapStarted(): Promise<void> {
    await this.read();
    this.state = {
      consecutiveCrashes: this.state.consecutiveCrashes + 1,
      lastBootstrapAt: new Date().toISOString(),
    };
    await this.write();
  }

  async markBootstrapHealthy(): Promise<void> {
    await this.read();
    if (this.state.consecutiveCrashes === 0) {
      return;
    }
    this.state = { consecutiveCrashes: 0, lastBootstrapAt: this.state.lastBootstrapAt };
    await this.write();
  }

  isInSafeMode(): boolean {
    return this.state.consecutiveCrashes >= SAFE_MODE_THRESHOLD;
  }

  get healthyBootstrapDelayMs(): number {
    return HEALTHY_BOOTSTRAP_DELAY_MS;
  }

  get snapshot(): CrashStatePayload {
    return { ...this.state };
  }

  private async read(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<CrashStatePayload>;
      this.state = {
        consecutiveCrashes:
          typeof parsed.consecutiveCrashes === 'number' && parsed.consecutiveCrashes >= 0
            ? Math.floor(parsed.consecutiveCrashes)
            : 0,
        lastBootstrapAt: typeof parsed.lastBootstrapAt === 'string' ? parsed.lastBootstrapAt : '',
      };
    } catch {
      this.state = { consecutiveCrashes: 0, lastBootstrapAt: '' };
    }
  }

  private async write(): Promise<void> {
    await fs.mkdir(join(this.filePath, '..'), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
  }
}
