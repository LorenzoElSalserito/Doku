import { beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: unknown[]) => void;

interface FakeBrowserWindow {
  options: Record<string, unknown>;
  show: ReturnType<typeof vi.fn>;
  maximize: ReturnType<typeof vi.fn>;
  setFullScreen: ReturnType<typeof vi.fn>;
  loadURL: ReturnType<typeof vi.fn>;
  loadFile: ReturnType<typeof vi.fn>;
  webContents: { setWindowOpenHandler: ReturnType<typeof vi.fn> };
  once: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  emit(event: string, ...args: unknown[]): void;
}

const electronMock = vi.hoisted(() => {
  const instances: FakeBrowserWindow[] = [];

  class BrowserWindow {
    static readonly instances = instances;
    constructor(opts: Record<string, unknown>) {
      const onceHandlers = new Map<string, Handler[]>();
      const onHandlers = new Map<string, Handler[]>();

      const instance: FakeBrowserWindow = {
        options: opts,
        show: vi.fn(),
        maximize: vi.fn(),
        setFullScreen: vi.fn(),
        loadURL: vi.fn().mockResolvedValue(undefined),
        loadFile: vi.fn().mockResolvedValue(undefined),
        webContents: { setWindowOpenHandler: vi.fn() },
        once: vi.fn((event: string, cb: Handler) => {
          const arr = onceHandlers.get(event) ?? [];
          arr.push(cb);
          onceHandlers.set(event, arr);
        }),
        on: vi.fn((event: string, cb: Handler) => {
          const arr = onHandlers.get(event) ?? [];
          arr.push(cb);
          onHandlers.set(event, arr);
        }),
        emit(event: string, ...args: unknown[]) {
          const onceList = onceHandlers.get(event) ?? [];
          onceHandlers.set(event, []);
          for (const cb of onceList) cb(...args);
          for (const cb of onHandlers.get(event) ?? []) cb(...args);
        },
      };
      instances.push(instance);
      return instance as unknown as BrowserWindow;
    }
  }

  return {
    BrowserWindow,
    instances,
    shell: { openExternal: vi.fn().mockResolvedValue(undefined) },
  };
});

vi.mock('electron', () => ({
  BrowserWindow: electronMock.BrowserWindow,
  shell: electronMock.shell,
}));

vi.mock('@doku/application', () => ({
  PRODUCT_NAME: 'Doku',
}));

const defaultOptions = {
  preloadPath: '/preload.js',
  rendererFile: '/renderer/index.html',
};

async function buildWindow(): Promise<FakeBrowserWindow> {
  const { createMainWindow } = await import('./window.js');
  createMainWindow(defaultOptions);
  const instance = electronMock.instances.at(-1);
  if (!instance) throw new Error('BrowserWindow was not instantiated');
  return instance;
}

function withPlatform(platform: NodeJS.Platform, block: () => Promise<void> | void): Promise<void> {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  return Promise.resolve(block()).finally(() => {
    Object.defineProperty(process, 'platform', { value: original, configurable: true });
  });
}

describe('createMainWindow — fullscreen startup & OS snap compatibility', () => {
  beforeEach(() => {
    vi.resetModules();
    electronMock.instances.length = 0;
  });

  it('maximizes the window on ready-to-show so it fills the screen at startup', async () => {
    const instance = await buildWindow();

    expect(instance.maximize).not.toHaveBeenCalled();
    expect(instance.show).not.toHaveBeenCalled();

    instance.emit('ready-to-show');

    expect(instance.maximize).toHaveBeenCalledTimes(1);
    expect(instance.show).toHaveBeenCalledTimes(1);
    const maximizeOrder = instance.maximize.mock.invocationCallOrder[0]!;
    const showOrder = instance.show.mock.invocationCallOrder[0]!;
    expect(maximizeOrder).toBeLessThan(showOrder);
  });

  it('does not force real fullscreen on startup (would break OS snap gestures)', async () => {
    const instance = await buildWindow();
    instance.emit('ready-to-show');

    expect(instance.setFullScreen).not.toHaveBeenCalled();
    expect(instance.options.fullscreen).not.toBe(true);
    expect(instance.options.kiosk).not.toBe(true);
  });

  it('uses minimum dimensions that fit OS half-screen and top/bottom snap on common displays', async () => {
    const instance = await buildWindow();

    // 1440×900 halved horizontally → 720 wide. Min must not exceed that.
    expect(instance.options.minWidth).toBeLessThanOrEqual(720);
    // 1920×1080 split top/bottom → 540 tall. 480 leaves headroom for taskbars.
    expect(instance.options.minHeight).toBeLessThanOrEqual(480);
    // Sanity floors: never shrink below a legible editor footprint.
    expect(instance.options.minWidth).toBeGreaterThanOrEqual(480);
    expect(instance.options.minHeight).toBeGreaterThanOrEqual(360);
  });

  it('keeps the window resizable and framed so the OS can dock it to half / top / bottom', async () => {
    const instance = await buildWindow();

    // Electron defaults: resizable=true, frame=true, fullscreenable=true.
    // The factory must not opt out of any of them, or OS snapping breaks.
    expect(instance.options.resizable).not.toBe(false);
    expect(instance.options.frame).not.toBe(false);
    expect(instance.options.movable).not.toBe(false);
    expect(instance.options.fullscreenable).not.toBe(false);
  });

  it('converts Linux true-fullscreen transitions back to maximized', async () => {
    await withPlatform('linux', async () => {
      const instance = await buildWindow();
      instance.emit('enter-full-screen');

      expect(instance.setFullScreen).toHaveBeenCalledWith(false);
      // maximize is called by both the ready-to-show handler and the linux
      // fullscreen fallback; here we only need the fallback path to have fired.
      expect(instance.maximize).toHaveBeenCalled();
    });
  });

  it('does not force maximize on non-Linux enter-full-screen (respects native fullscreen)', async () => {
    await withPlatform('darwin', async () => {
      const instance = await buildWindow();
      instance.maximize.mockClear();
      instance.setFullScreen.mockClear();

      instance.emit('enter-full-screen');

      expect(instance.setFullScreen).not.toHaveBeenCalled();
      expect(instance.maximize).not.toHaveBeenCalled();
    });
  });
});
