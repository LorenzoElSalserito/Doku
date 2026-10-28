import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@doku/ui';
import type { Dictionary } from '../../i18n/keys.js';
import type { WorkspaceDocumentTab } from './workspaceTypes.js';
import { resolveDocumentTabTitle } from './workspaceDocuments.js';
import { CloseTabIcon, ReopenIcon, WarningIcon } from './WorkspaceIcons.js';

interface DocumentTabsProps {
  tabs: WorkspaceDocumentTab[];
  activeTabId: string | null;
  labels: Dictionary['workspace']['tabs'];
  onActivate: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onReopenFromDisk: (tabId: string) => void;
}

export function DocumentTabs({
  tabs,
  activeTabId,
  labels,
  onActivate,
  onClose,
  onReorder,
  onReopenFromDisk,
}: DocumentTabsProps) {
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [dropTargetTabId, setDropTargetTabId] = useState<string | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const tabRefs = useRef(new Map<string, HTMLDivElement>());
  const stripRef = useRef<HTMLDivElement | null>(null);

  const updateScrollState = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    const maxScroll = strip.scrollWidth - strip.clientWidth;
    setCanScrollPrev(strip.scrollLeft > 1);
    setCanScrollNext(maxScroll > 1 && strip.scrollLeft < maxScroll - 1);
  }, []);

  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  // Keeps the active tab inside the strip, like a browser tab bar. `onlyIfHidden`
  // avoids fighting the user when the tab is already fully in view.
  const scrollActiveTabIntoView = useCallback((behavior: ScrollBehavior, onlyIfHidden: boolean) => {
    const tabId = activeTabIdRef.current;
    const strip = stripRef.current;
    if (!tabId || !strip) {
      return;
    }
    const activeTabElement = tabRefs.current.get(tabId);
    if (typeof activeTabElement?.scrollIntoView !== 'function') {
      return;
    }
    if (onlyIfHidden) {
      const stripRect = strip.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();
      if (tabRect.left >= stripRect.left && tabRect.right <= stripRect.right) {
        return;
      }
    }
    activeTabElement.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior });
  }, []);

  useEffect(() => {
    scrollActiveTabIntoView('smooth', false);
    // `tabs.length` is a dependency on purpose: on session restore the active
    // tab element mounts after `activeTabId` is set, so this has to re-run
    // once the strip is populated to keep the active tab in view.
  }, [activeTabId, tabs.length, scrollActiveTabIntoView]);

  useEffect(() => {
    updateScrollState();
    const strip = stripRef.current;
    if (!strip || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      updateScrollState();
      // The strip width changes when the window is resized or header actions
      // mount after the tabs: re-anchor the active tab if it got clipped.
      scrollActiveTabIntoView('auto', true);
    });
    observer.observe(strip);
    return () => observer.disconnect();
  }, [tabs.length, updateScrollState, scrollActiveTabIntoView]);

  const scrollByStep = useCallback((direction: -1 | 1) => {
    const strip = stripRef.current;
    if (!strip || typeof strip.scrollBy !== 'function') {
      return;
    }
    strip.scrollBy({
      left: direction * Math.max(strip.clientWidth * 0.7, 160),
      behavior: 'smooth',
    });
  }, []);

  // Like a browser tab bar: a vertical wheel over the strip scrolls it sideways.
  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const strip = stripRef.current;
    if (!strip || typeof strip.scrollBy !== 'function') {
      return;
    }
    if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
      return;
    }
    if (strip.scrollWidth <= strip.clientWidth) {
      return;
    }
    strip.scrollBy({ left: event.deltaY, behavior: 'auto' });
  }, []);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="workspace-tabs-bar">
      <button
        type="button"
        className="workspace-tabs__nav workspace-tabs__nav--prev"
        aria-label={labels.scrollPrev}
        title={labels.scrollPrev}
        hidden={!canScrollPrev}
        tabIndex={canScrollPrev ? 0 : -1}
        onClick={() => scrollByStep(-1)}
      >
        <TabScrollIcon direction="prev" />
      </button>
      <div
        ref={stripRef}
        className="workspace-tabs"
        role="tablist"
        aria-label={labels.label}
        onScroll={updateScrollState}
        onWheel={handleWheel}
      >
        {tabs.map((tab) => {
          const title = tab.document
            ? resolveDocumentTabTitle(tab.document)
            : (tab.summary?.title ?? '...');
          const isActive = tab.id === activeTabId;
          const isDragging = tab.id === draggingTabId;
          const isDropTarget = tab.id === dropTargetTabId && tab.id !== draggingTabId;
          const isMissing = tab.loadState === 'missing';
          const isErrored = tab.loadState === 'error';
          const errorLabel = tab.errorMessage ?? labels.missingDocumentFile;

          return (
            <div
              key={tab.id}
              ref={(element) => {
                if (element) {
                  tabRefs.current.set(tab.id, element);
                } else {
                  tabRefs.current.delete(tab.id);
                }
              }}
              className={[
                'workspace-tabs__item',
                isActive ? 'workspace-tabs__item--active' : '',
                isMissing ? 'workspace-tabs__item--missing' : '',
                isErrored ? 'workspace-tabs__item--error' : '',
                isDragging ? 'workspace-tabs__item--dragging' : '',
                isDropTarget ? 'workspace-tabs__item--drop-target' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/x-doku-tab-id', tab.id);
                setDraggingTabId(tab.id);
              }}
              onDragOver={(event) => {
                if (!draggingTabId || draggingTabId === tab.id) {
                  return;
                }
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropTargetTabId(tab.id);
              }}
              onDragLeave={() => {
                setDropTargetTabId((current) => (current === tab.id ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const fromId = event.dataTransfer.getData('text/x-doku-tab-id') || draggingTabId;
                setDraggingTabId(null);
                setDropTargetTabId(null);
                if (fromId) {
                  onReorder(fromId, tab.id);
                }
              }}
              onDragEnd={() => {
                setDraggingTabId(null);
                setDropTargetTabId(null);
              }}
            >
              <button
                type="button"
                className="workspace-tabs__button"
                role="tab"
                aria-selected={isActive}
                title={title}
                onClick={() => onActivate(tab.id)}
              >
                <span
                  className={`workspace-tabs__state workspace-tabs__state--${tab.saveState}`}
                  aria-hidden="true"
                />
                {isMissing || isErrored ? (
                  <span
                    className="workspace-tabs__warning"
                    title={errorLabel}
                    aria-label={errorLabel}
                  >
                    <WarningIcon />
                  </span>
                ) : null}
                <span className="workspace-tabs__title">{title}</span>
              </button>
              {isMissing || isErrored ? (
                <button
                  type="button"
                  className="workspace-tabs__reopen"
                  aria-label={`${labels.reopenFromDisk}: ${title}`}
                  title={labels.reopenFromDisk}
                  onClick={(event) => {
                    event.stopPropagation();
                    onReopenFromDisk(tab.id);
                  }}
                >
                  <ReopenIcon />
                </button>
              ) : null}
              <button
                type="button"
                className="workspace-tabs__close"
                aria-label={`${labels.close}: ${title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab.id);
                }}
              >
                <CloseTabIcon />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="workspace-tabs__nav workspace-tabs__nav--next"
        aria-label={labels.scrollNext}
        title={labels.scrollNext}
        hidden={!canScrollNext}
        tabIndex={canScrollNext ? 0 : -1}
        onClick={() => scrollByStep(1)}
      >
        <TabScrollIcon direction="next" />
      </button>
    </div>
  );
}

function TabScrollIcon({ direction }: { direction: 'prev' | 'next' }) {
  return <Icon name={direction === 'prev' ? 'chevron-left' : 'chevron-right'} size={14} />;
}
