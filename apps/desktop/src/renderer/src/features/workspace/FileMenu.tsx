import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Icon } from '@doku/ui';
import type { DocumentSummary } from '@doku/application';

interface FileMenuLabels {
  trigger: string;
  newDocument: string;
  openFile: string;
  recentHeading: string;
  recentEmpty: string;
}

interface FileMenuProps {
  labels: FileMenuLabels;
  recents: DocumentSummary[];
  onNew: () => void;
  onOpen: () => void;
  onSelectRecent: (summary: DocumentSummary) => void;
}

export function FileMenu({ labels, recents, onNew, onOpen, onSelectRecent }: FileMenuProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = 'workspace-file-menu';

  const items = useMemo<FileMenuItem[]>(() => {
    const base: FileMenuItem[] = [
      { key: 'new', label: labels.newDocument, action: onNew },
      { key: 'open', label: labels.openFile, action: onOpen },
    ];
    recents.forEach((summary) => {
      base.push({
        key: `recent:${summary.id}`,
        label: summary.title,
        action: () => onSelectRecent(summary),
      });
    });
    return base;
  }, [labels.newDocument, labels.openFile, onNew, onOpen, onSelectRecent, recents]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const node = containerRef.current;
      if (node && event.target instanceof Node && !node.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      closeAndRestore();
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const target = itemRefs.current[focusIndex];
    target?.focus();
  }, [focusIndex, open]);

  const closeAndRestore = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setFocusIndex(0);
      setOpen(true);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusIndex(items.length - 1);
      setOpen(true);
    }
  };

  const handleItemKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusIndex((index + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusIndex((index - 1 + items.length) % items.length);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeAndRestore();
    } else if (event.key === 'Home') {
      event.preventDefault();
      setFocusIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setFocusIndex(items.length - 1);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const runAction = (item: FileMenuItem) => {
    setOpen(false);
    item.action();
  };

  return (
    <div className="file-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="file-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setFocusIndex(0);
          setOpen((value) => !value);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{labels.trigger}</span>
        <span
          className={`file-menu__chevron${open ? ' file-menu__chevron--open' : ''}`}
          aria-hidden
        >
          <Icon name="chevron-down" size={12} />
        </span>
      </button>

      {open && (
        <div id={menuId} role="menu" aria-label={labels.trigger} className="file-menu__popover">
          <div className="file-menu__section">
            <button
              type="button"
              role="menuitem"
              className="file-menu__item file-menu__item--action"
              ref={(node) => {
                itemRefs.current[0] = node;
              }}
              onClick={() => runAction(items[0]!)}
              onKeyDown={(event) => handleItemKeyDown(event, 0)}
            >
              <span className="file-menu__item-icon" aria-hidden>
                <Icon name="file-earmark-plus" size={15} />
              </span>
              <span className="file-menu__item-copy">
                <span className="file-menu__item-label">{labels.newDocument}</span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="file-menu__item file-menu__item--action"
              ref={(node) => {
                itemRefs.current[1] = node;
              }}
              onClick={() => runAction(items[1]!)}
              onKeyDown={(event) => handleItemKeyDown(event, 1)}
            >
              <span className="file-menu__item-icon" aria-hidden>
                <Icon name="folder2-open" size={15} />
              </span>
              <span className="file-menu__item-copy">
                <span className="file-menu__item-label">{labels.openFile}</span>
              </span>
            </button>
          </div>
          <div className="file-menu__separator" role="presentation" />
          <div className="file-menu__section">
            <div className="file-menu__heading" role="presentation">
              {labels.recentHeading}
            </div>
            {recents.length === 0 ? (
              <div className="file-menu__empty" role="presentation">
                {labels.recentEmpty}
              </div>
            ) : (
              recents.map((summary, recentIndex) => {
                const index = recentIndex + 2;
                return (
                  <button
                    key={summary.id}
                    type="button"
                    role="menuitem"
                    className="file-menu__item file-menu__item--recent"
                    ref={(node) => {
                      itemRefs.current[index] = node;
                    }}
                    onClick={() => runAction(items[index]!)}
                    onKeyDown={(event) => handleItemKeyDown(event, index)}
                    title={summary.path ?? summary.title}
                  >
                    <span className="file-menu__item-copy">
                      <span className="file-menu__item-label">{summary.title}</span>
                      <span className="file-menu__item-meta">{describeRecent(summary)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface FileMenuItem {
  key: string;
  label: string;
  action: () => void;
}

function describeRecent(summary: DocumentSummary): string {
  if (summary.snippet.trim()) {
    return summary.snippet;
  }

  if (summary.path) {
    const filename = summary.path.split(/[\\/]/).pop();
    return filename ?? summary.path;
  }

  return summary.lastOpenedAt;
}
