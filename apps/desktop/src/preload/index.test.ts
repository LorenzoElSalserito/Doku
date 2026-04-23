import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DokuBridge } from '@doku/application';
import { IPC_CHANNELS } from '../../../../packages/infrastructure/src/ipc/channels.js';

const electronMock = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}));

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: electronMock.exposeInMainWorld,
  },
  ipcRenderer: {
    invoke: electronMock.invoke,
    on: electronMock.on,
    removeListener: electronMock.removeListener,
  },
}));

describe('preload bridge', () => {
  beforeEach(async () => {
    vi.resetModules();
    electronMock.exposeInMainWorld.mockClear();
    electronMock.invoke.mockReset();
    electronMock.on.mockClear();
    electronMock.removeListener.mockClear();
    electronMock.invoke.mockResolvedValue('ok');

    await import('./index.js');
  });

  it('exposes the doku bridge in the isolated renderer world', () => {
    expect(electronMock.exposeInMainWorld).toHaveBeenCalledWith('doku', expect.any(Object));
  });

  it('routes workspace document APIs through their IPC channels', async () => {
    const bridge = exposedBridge();
    const importInput = {
      documentPath: '/workspace/chapter.md',
      sourcePath: '/tmp/cover.png',
      strategy: 'project-assets' as const,
    };

    await bridge.documents.openDocumentAtPath('/workspace/notes.md');
    await bridge.documents.importAsset(importInput);
    await bridge.documents.listWorkspaceTree('/workspace/chapter.md');
    await bridge.documents.createWorkspaceFile('/workspace/chapter.md', 'notes');
    await bridge.documents.createWorkspaceFolder('/workspace/chapter.md', 'assets');

    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.documentsOpenDocumentAtPath,
      '/workspace/notes.md',
    );
    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.documentsImportAsset,
      importInput,
    );
    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      3,
      IPC_CHANNELS.documentsListWorkspaceTree,
      '/workspace/chapter.md',
    );
    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      4,
      IPC_CHANNELS.documentsCreateWorkspaceEntry,
      {
        documentPath: '/workspace/chapter.md',
        name: 'notes',
        kind: 'markdown',
      },
    );
    expect(electronMock.invoke).toHaveBeenNthCalledWith(
      5,
      IPC_CHANNELS.documentsCreateWorkspaceEntry,
      {
        documentPath: '/workspace/chapter.md',
        name: 'assets',
        kind: 'directory',
      },
    );
  });

  it('subscribes to workspace tree changes and disposes the listener', () => {
    const bridge = exposedBridge();
    const onChange = vi.fn();

    const dispose = bridge.documents.watchWorkspaceTree('/workspace/chapter.md', onChange);
    const handler = electronMock.on.mock.calls[0]?.[1] as (
      event: unknown,
      payload: { watchId?: string },
    ) => void;
    const watchPayload = electronMock.invoke.mock.calls[0]?.[1] as { watchId?: string };

    expect(electronMock.on).toHaveBeenCalledWith(
      IPC_CHANNELS.documentsWorkspaceTreeChanged,
      expect.any(Function),
    );
    expect(electronMock.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.documentsWatchWorkspaceTree,
      expect.objectContaining({
        documentPath: '/workspace/chapter.md',
      }),
    );

    handler({}, { watchId: watchPayload.watchId });
    expect(onChange).toHaveBeenCalledTimes(1);

    dispose();

    expect(electronMock.removeListener).toHaveBeenCalledWith(
      IPC_CHANNELS.documentsWorkspaceTreeChanged,
      handler,
    );
    expect(electronMock.invoke).toHaveBeenLastCalledWith(
      IPC_CHANNELS.documentsUnwatchWorkspaceTree,
      watchPayload.watchId,
    );
  });
});

function exposedBridge(): DokuBridge {
  const call = electronMock.exposeInMainWorld.mock.calls.at(-1);
  if (!call) {
    throw new Error('Doku bridge was not exposed');
  }

  return call[1] as DokuBridge;
}
