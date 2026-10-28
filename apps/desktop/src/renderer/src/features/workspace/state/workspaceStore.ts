import {
  createContext,
  createElement,
  useContext,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import type { DocumentSummary } from '@doku/application';
import type { WorkspaceDocumentTab } from '../workspaceTypes.js';
import { createDraftDocumentId } from '../workspaceDocuments.js';

/**
 * Owns: the open tabs, the active tab id, the pending open request (summary or
 * new draft), the session-restore flag and the editor notice.
 * Exposes: the state plus stable setters with `useState` semantics (value or
 * updater; equal values do not re-render), and `tabsRef` for event handlers.
 * Does not: load, save or persist anything. Hooks do that through the setters.
 */
export interface WorkspaceState {
  tabs: WorkspaceDocumentTab[];
  activeTabId: string | null;
  activeSummary: DocumentSummary | null;
  draftRequestId: string | null;
  sessionRestoreComplete: boolean;
  noticeMessage: string | null;
}

type StateUpdate<T> = T | ((current: T) => T);
type Setter<T> = (update: StateUpdate<T>) => void;

type WorkspaceAction = {
  [K in keyof WorkspaceState]: { key: K; update: StateUpdate<WorkspaceState[K]> };
}[keyof WorkspaceState];

export interface WorkspaceStore extends WorkspaceState {
  tabsRef: MutableRefObject<WorkspaceDocumentTab[]>;
  setTabs: Setter<WorkspaceDocumentTab[]>;
  setActiveTabId: Setter<string | null>;
  setActiveSummary: Setter<DocumentSummary | null>;
  setDraftRequestId: Setter<string | null>;
  setSessionRestoreComplete: Setter<boolean>;
  setNoticeMessage: Setter<string | null>;
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  const current = state[action.key];
  const next =
    typeof action.update === 'function'
      ? (action.update as (value: typeof current) => typeof current)(current)
      : action.update;
  if (Object.is(next, current)) {
    return state;
  }
  return { ...state, [action.key]: next };
}

export function createInitialWorkspaceState(restoringTabs: boolean): WorkspaceState {
  return {
    tabs: [],
    activeTabId: null,
    activeSummary: null,
    draftRequestId: restoringTabs ? null : createDraftDocumentId(),
    sessionRestoreComplete: !restoringTabs,
    noticeMessage: null,
  };
}

const WorkspaceStoreContext = createContext<WorkspaceStore | null>(null);

export function WorkspaceStoreProvider({
  restoringTabs,
  children,
}: {
  restoringTabs: boolean;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    workspaceReducer,
    restoringTabs,
    createInitialWorkspaceState,
  );
  const tabsRef = useRef<WorkspaceDocumentTab[]>([]);

  // Layout effect: the ref is current before any passive effect of the
  // workspace hooks (they read it to find already open tabs).
  useLayoutEffect(() => {
    tabsRef.current = state.tabs;
  }, [state.tabs]);

  const setters = useMemo(() => {
    const setter =
      <K extends keyof WorkspaceState>(key: K): Setter<WorkspaceState[K]> =>
      (update) =>
        dispatch({ key, update } as WorkspaceAction);
    return {
      setTabs: setter('tabs'),
      setActiveTabId: setter('activeTabId'),
      setActiveSummary: setter('activeSummary'),
      setDraftRequestId: setter('draftRequestId'),
      setSessionRestoreComplete: setter('sessionRestoreComplete'),
      setNoticeMessage: setter('noticeMessage'),
    };
  }, []);

  const store = useMemo<WorkspaceStore>(
    () => ({ ...state, ...setters, tabsRef }),
    [state, setters],
  );

  return createElement(WorkspaceStoreContext.Provider, { value: store }, children);
}

export function useWorkspaceStore(): WorkspaceStore {
  const store = useContext(WorkspaceStoreContext);
  if (!store) {
    throw new Error('useWorkspaceStore must be used inside WorkspaceStoreProvider.');
  }
  return store;
}
