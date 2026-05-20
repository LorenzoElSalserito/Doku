import { promises as fs } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SessionLogger } from './sessionLogger.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'doku-logs-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('SessionLogger', () => {
  it('writes ordered JSONL entries with stable process metadata', async () => {
    const logger = new SessionLogger({
      logsDir: tempDir,
      sessionId: 'test-session',
      processName: 'main',
      appVersion: '9.9.9',
    });

    logger.info('startup:process-created', { rawText: 'secret body' });
    logger.error('process:uncaught-exception', { error: new Error('boom') });
    await logger.flush();

    const lines = (await fs.readFile(join(tempDir, 'session-test-session.log'), 'utf-8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(lines).toHaveLength(2);
    expect(lines.map((entry) => entry.sequence)).toEqual([1, 2]);
    expect(lines[0]).toMatchObject({
      level: 'info',
      event: 'startup:process-created',
      sessionId: 'test-session',
      process: {
        name: 'main',
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        appVersion: '9.9.9',
      },
    });
    expect(lines[0]?.context).toMatchObject({
      rawText: {
        redacted: true,
        length: 'secret body'.length,
      },
    });
    expect(lines[1]?.context).toMatchObject({
      error: {
        name: 'Error',
        message: 'boom',
      },
    });
  });

  it('writeSync persists entries before the writeQueue drains (survives sigkill scenarios)', async () => {
    const logger = new SessionLogger({
      logsDir: tempDir,
      sessionId: 'sync-session',
      processName: 'main',
      appVersion: '0.0.0',
    });

    // Interleave: queued-info, sync-error, queued-info. The sync entry must
    // land in the file even before `flush()` resolves.
    logger.info('startup:before', {});
    logger.writeSync('error', 'process:signal', { signal: 'SIGSEGV' });
    logger.info('startup:after', {});

    const filePath = join(tempDir, 'session-sync-session.log');
    const partial = await fs.readFile(filePath, 'utf-8');
    const syncLines = partial
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(syncLines.some((entry) => entry.event === 'process:signal')).toBe(true);

    await logger.flush();

    const lines = (await fs.readFile(filePath, 'utf-8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    const events = lines.map((entry) => entry.event);
    expect(events).toContain('startup:before');
    expect(events).toContain('process:signal');
    expect(events).toContain('startup:after');
    // Sequence values must cover [1..N] without gaps; physical write order
    // can interleave sync vs async, but every call must produce one record.
    const sequences = lines.map((entry) => entry.sequence as number).sort((a, b) => a - b);
    expect(sequences).toEqual([1, 2, 3]);
  });
});
