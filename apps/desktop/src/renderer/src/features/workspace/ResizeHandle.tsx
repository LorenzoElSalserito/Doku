import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useDict } from '../../i18n/I18nProvider.js';
import type { ResizeDirection, ResizeSide } from './workspaceTypes.js';

interface ResizeHandleProps {
  side: ResizeSide;
  onPointerDown: () => void;
  onKeyboardResize: (side: ResizeSide, direction: ResizeDirection) => void;
}

export function ResizeHandle({ side, onPointerDown, onKeyboardResize }: ResizeHandleProps) {
  const dict = useDict();

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Home') {
      event.preventDefault();
      onKeyboardResize(side, 'min');
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      onKeyboardResize(side, 'max');
      return;
    }

    if (side === 'left' && event.key === 'ArrowLeft') {
      event.preventDefault();
      onKeyboardResize(side, 'decrease');
      return;
    }

    if (side === 'left' && event.key === 'ArrowRight') {
      event.preventDefault();
      onKeyboardResize(side, 'increase');
      return;
    }

    if (side === 'right' && event.key === 'ArrowLeft') {
      event.preventDefault();
      onKeyboardResize(side, 'increase');
      return;
    }

    if (side === 'right' && event.key === 'ArrowRight') {
      event.preventDefault();
      onKeyboardResize(side, 'decrease');
    }
  };

  return (
    <button
      type="button"
      className={`workspace__resize workspace__resize--${side}`}
      aria-label={
        side === 'left' ? dict.workspace.resizeLeftPanel : dict.workspace.resizeRightPanel
      }
      onPointerDown={onPointerDown}
      onKeyDown={handleKeyDown}
    >
      <span className="workspace__resize-grip" />
    </button>
  );
}
