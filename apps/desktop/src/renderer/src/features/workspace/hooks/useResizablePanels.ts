import { useCallback, useEffect, useRef, useState } from 'react';
import type { Settings, SettingsPatch } from '@doku/application';
import {
  LEFT_MAX,
  LEFT_MIN,
  RESIZE_KEYBOARD_STEP,
  RIGHT_MAX,
  RIGHT_MIN,
  type ResizeDirection,
  type ResizeSide,
} from '../workspaceTypes.js';
import { clamp } from '../workspaceDocuments.js';

/**
 * Owns: the side panel layout (widths, collapsed flags) and the pointer drag.
 * Exposes: the live layout, panel styles, collapse toggles, drag start and
 * keyboard resizing; every final change is persisted through `onUpdate`.
 * Does not: render the panels or the resize handles.
 */
export function useResizablePanels(
  persistedWorkspace: Settings['workspace'],
  onUpdate: (patch: SettingsPatch) => Promise<void>,
) {
  const [layout, setLayout] = useState(persistedWorkspace);
  const [dragState, setDragState] = useState<ResizeSide | null>(null);
  const draftLayoutRef = useRef(layout);

  useEffect(() => {
    setLayout(persistedWorkspace);
    draftLayoutRef.current = persistedWorkspace;
  }, [persistedWorkspace]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const currentLayout = draftLayoutRef.current;

      if (dragState === 'left') {
        const nextWidth = clamp(event.clientX - 24, LEFT_MIN, LEFT_MAX);
        const nextLayout = {
          ...currentLayout,
          leftPanelWidth: nextWidth,
          leftPanelCollapsed: false,
        };
        draftLayoutRef.current = nextLayout;
        setLayout(nextLayout);
      }

      if (dragState === 'right') {
        const nextWidth = clamp(window.innerWidth - event.clientX - 24, RIGHT_MIN, RIGHT_MAX);
        const nextLayout = {
          ...currentLayout,
          rightPanelWidth: nextWidth,
          rightPanelCollapsed: false,
        };
        draftLayoutRef.current = nextLayout;
        setLayout(nextLayout);
      }
    };

    const handlePointerUp = () => {
      const nextLayout = draftLayoutRef.current;
      setDragState(null);
      void onUpdate({ workspace: nextLayout });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, onUpdate]);

  const leftStyle = layout.leftPanelCollapsed ? undefined : { width: `${layout.leftPanelWidth}px` };
  const rightStyle = layout.rightPanelCollapsed
    ? undefined
    : { width: `${layout.rightPanelWidth}px` };

  const toggleLeft = () => {
    const nextLayout = {
      ...layout,
      leftPanelCollapsed: !layout.leftPanelCollapsed,
    };
    setLayout(nextLayout);
    draftLayoutRef.current = nextLayout;
    void onUpdate({ workspace: nextLayout });
  };

  const toggleRight = () => {
    const nextLayout = {
      ...layout,
      rightPanelCollapsed: !layout.rightPanelCollapsed,
    };
    setLayout(nextLayout);
    draftLayoutRef.current = nextLayout;
    void onUpdate({ workspace: nextLayout });
  };

  const resizeFromKeyboard = useCallback(
    (side: ResizeSide, direction: ResizeDirection) => {
      const currentLayout = draftLayoutRef.current;
      const nextLayout = { ...currentLayout };

      if (side === 'left') {
        if (direction === 'min') {
          nextLayout.leftPanelWidth = LEFT_MIN;
        } else if (direction === 'max') {
          nextLayout.leftPanelWidth = LEFT_MAX;
        } else {
          const delta = direction === 'increase' ? RESIZE_KEYBOARD_STEP : -RESIZE_KEYBOARD_STEP;
          nextLayout.leftPanelWidth = clamp(
            currentLayout.leftPanelWidth + delta,
            LEFT_MIN,
            LEFT_MAX,
          );
        }
        nextLayout.leftPanelCollapsed = false;
      }

      if (side === 'right') {
        if (direction === 'min') {
          nextLayout.rightPanelWidth = RIGHT_MIN;
        } else if (direction === 'max') {
          nextLayout.rightPanelWidth = RIGHT_MAX;
        } else {
          const delta = direction === 'increase' ? RESIZE_KEYBOARD_STEP : -RESIZE_KEYBOARD_STEP;
          nextLayout.rightPanelWidth = clamp(
            currentLayout.rightPanelWidth + delta,
            RIGHT_MIN,
            RIGHT_MAX,
          );
        }
        nextLayout.rightPanelCollapsed = false;
      }

      draftLayoutRef.current = nextLayout;
      setLayout(nextLayout);
      void onUpdate({ workspace: nextLayout });
    },
    [onUpdate],
  );

  return {
    layout,
    leftStyle,
    rightStyle,
    startDrag: setDragState,
    toggleLeft,
    toggleRight,
    resizeFromKeyboard,
  };
}
