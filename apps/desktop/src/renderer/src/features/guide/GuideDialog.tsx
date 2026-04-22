import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Button, Dialog, Input } from '@doku/ui';
import { MarkdownPreview } from '../workspace/MarkdownPreview.js';
import { useDict } from '../../i18n/I18nProvider.js';

type GuideSectionId = 'quickStart' | 'uiTour' | 'markdown' | 'shortcuts' | 'manual';

interface GuideDialogProps {
  open: boolean;
  onClose: () => void;
}

interface GuideSection {
  id: GuideSectionId;
  title: string;
  summary: string;
  intro: string;
  bullets: string[];
  snippetLabel?: string;
  snippet?: string;
}

const SESSION_STORAGE_KEY = 'doku.guide.active-section';

export function GuideDialog({ open, onClose }: GuideDialogProps) {
  const dict = useDict();
  const [query, setQuery] = useState('');
  const [copiedSection, setCopiedSection] = useState<GuideSectionId | null>(null);
  const articlePreviewRef = useRef<HTMLDivElement | null>(null);
  const manualOutlineRef = useRef<Array<HTMLButtonElement | null>>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const sectionNavRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeSectionId, setActiveSectionId] = useState<GuideSectionId>(() => {
    if (typeof window === 'undefined') {
      return 'quickStart';
    }

    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return isGuideSectionId(stored) ? stored : 'quickStart';
  });

  const sections = useMemo<GuideSection[]>(
    () => [
      {
        id: 'quickStart',
        ...dict.guideCenter.sections.quickStart,
      },
      {
        id: 'uiTour',
        ...dict.guideCenter.sections.uiTour,
      },
      {
        id: 'shortcuts',
        ...dict.guideCenter.sections.shortcuts,
      },
      {
        id: 'manual',
        ...dict.guideCenter.sections.manual,
      },
    ],
    [dict.guideCenter.sections],
  );

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return sections;
    }

    return sections.filter((section) =>
      [section.title, section.summary, section.intro, ...section.bullets, section.snippet ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, sections]);

  const activeSection =
    filteredSections.find((section) => section.id === activeSectionId) ?? filteredSections[0] ?? null;
  const manualOutline = useMemo(
    () => (activeSection?.id === 'manual' ? extractManualOutline(activeSection.snippet ?? '') : []),
    [activeSection],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, activeSectionId);
  }, [activeSectionId]);

  useEffect(() => {
    if (!copiedSection) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopiedSection(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [copiedSection]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);

    return () => window.clearTimeout(timeoutId);
  }, [open]);

  const handleCopySnippet = async (section: GuideSection) => {
    if (!section.snippet) {
      return;
    }

    await navigator.clipboard.writeText(section.snippet);
    setCopiedSection(section.id);
  };

  const handleManualOutlineKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === 'Home') {
      event.preventDefault();
      manualOutlineRef.current[0]?.focus();
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      manualOutlineRef.current[manualOutline.length - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      manualOutlineRef.current[(index + 1) % manualOutline.length]?.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      manualOutlineRef.current[(index - 1 + manualOutline.length) % manualOutline.length]?.focus();
    }
  };

  const handleJumpToHeading = (headingId: string) => {
    const heading = articlePreviewRef.current?.querySelector<HTMLElement>(`#${CSS.escape(headingId)}`);
    if (!heading) {
      return;
    }

    heading.scrollIntoView({ block: 'start', behavior: 'smooth' });
    heading.focus({ preventScroll: true });
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowDown' || filteredSections.length === 0) {
      return;
    }

    event.preventDefault();
    sectionNavRefs.current[0]?.focus();
  };

  const handleSectionNavKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === 'Home') {
      event.preventDefault();
      sectionNavRefs.current[0]?.focus();
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      sectionNavRefs.current[filteredSections.length - 1]?.focus();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      sectionNavRefs.current[(index + 1) % filteredSections.length]?.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      sectionNavRefs.current[(index - 1 + filteredSections.length) % filteredSections.length]?.focus();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      searchInputRef.current?.focus();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dict.guideCenter.title}
      subtitle={dict.guideCenter.subtitle}
      className="doku-dialog--wide"
      footer={
        <Button variant="primary" onClick={onClose}>
          {dict.guideCenter.close}
        </Button>
      }
    >
      <div className="guide-center">
        <aside className="guide-center__sidebar">
          <label className="guide-center__search" htmlFor="guide-center-search">
            <span className="guide-center__search-label">{dict.guideCenter.searchLabel}</span>
            <Input
              id="guide-center-search"
              ref={searchInputRef}
              data-dialog-autofocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={dict.guideCenter.searchPlaceholder}
              onKeyDown={handleSearchKeyDown}
            />
          </label>

          <nav className="guide-center__nav" aria-label={dict.guideCenter.navLabel}>
            {filteredSections.length === 0 ? (
              <p className="guide-center__empty">{dict.guideCenter.noResults}</p>
            ) : (
              filteredSections.map((section) => (
                <button
                  key={section.id}
                  ref={(node) => {
                    const sectionIndex = filteredSections.findIndex((item) => item.id === section.id);
                    sectionNavRefs.current[sectionIndex] = node;
                  }}
                  type="button"
                  className={
                    section.id === activeSection?.id
                      ? 'guide-center__nav-item guide-center__nav-item--active'
                      : 'guide-center__nav-item'
                  }
                  onClick={() => setActiveSectionId(section.id)}
                  onKeyDown={(event) =>
                    handleSectionNavKeyDown(
                      event,
                      filteredSections.findIndex((item) => item.id === section.id),
                    )
                  }
                >
                  <span className="guide-center__nav-title">{section.title}</span>
                  <span className="guide-center__nav-summary">{section.summary}</span>
                </button>
              ))
            )}
          </nav>
        </aside>

        <section className="guide-center__content">
          {activeSection ? (
            <>
              <header className="guide-center__content-header">
                <span className="guide-center__eyebrow">{activeSection.summary}</span>
                <h3 className="guide-center__title">{activeSection.title}</h3>
                <p className="guide-center__intro">{activeSection.intro}</p>
              </header>

              <ul className="guide-center__list">
                {activeSection.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>

              {activeSection.snippet ? (
                activeSection.id === 'manual' ? (
                  <div className="guide-center__article-layout">
                    {manualOutline.length > 0 ? (
                      <aside className="guide-center__panel guide-center__article-index">
                        <div className="guide-center__panel-head">
                          <div>
                            <span className="guide-center__panel-eyebrow">
                              {dict.workspace.outlineTitle}
                            </span>
                            <h4 className="guide-center__panel-title">{activeSection.title}</h4>
                          </div>
                        </div>
                        <p className="guide-center__article-index-body">{dict.workspace.outlineBody}</p>
                        <nav className="guide-center__article-nav" aria-label={dict.workspace.outlineTitle}>
                          {manualOutline.map((item, index) => (
                            <button
                              key={item.id}
                              ref={(node) => {
                                manualOutlineRef.current[index] = node;
                              }}
                              type="button"
                              className={`guide-center__article-link guide-center__article-link--level-${item.level}`}
                              onClick={() => handleJumpToHeading(item.id)}
                              onKeyDown={(event) => handleManualOutlineKeyDown(event, index)}
                            >
                              {item.title}
                            </button>
                          ))}
                        </nav>
                      </aside>
                    ) : null}

                    <section className="guide-center__panel guide-center__panel--article">
                      <div className="guide-center__panel-head">
                        <div>
                          <span className="guide-center__panel-eyebrow">{activeSection.snippetLabel}</span>
                          <h4 className="guide-center__panel-title">{activeSection.title}</h4>
                        </div>
                        <Button
                          variant={copiedSection === activeSection.id ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => void handleCopySnippet(activeSection)}
                        >
                          {copiedSection === activeSection.id
                            ? dict.guideCenter.copied
                            : dict.guideCenter.copy}
                        </Button>
                      </div>
                      <div ref={articlePreviewRef} className="guide-center__article-preview">
                        <MarkdownPreview
                          content={activeSection.snippet}
                          emptyLabel={dict.workspace.previewEmpty}
                        />
                      </div>
                    </section>
                  </div>
                ) : (
                <div className="guide-center__snippet-grid">
                  <section className="guide-center__panel">
                    <div className="guide-center__panel-head">
                      <div>
                        <span className="guide-center__panel-eyebrow">{activeSection.snippetLabel}</span>
                        <h4 className="guide-center__panel-title">{activeSection.title}</h4>
                      </div>
                      <Button
                        variant={copiedSection === activeSection.id ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => void handleCopySnippet(activeSection)}
                      >
                        {copiedSection === activeSection.id
                          ? dict.guideCenter.copied
                          : dict.guideCenter.copy}
                      </Button>
                    </div>
                    <pre className="guide-center__snippet">
                      <code>{activeSection.snippet}</code>
                    </pre>
                  </section>

                  <section className="guide-center__panel guide-center__panel--preview">
                    <span className="guide-center__panel-eyebrow">{dict.guideCenter.livePreview}</span>
                    <MarkdownPreview
                      content={activeSection.snippet}
                      emptyLabel={dict.workspace.previewEmpty}
                    />
                  </section>
                </div>
                )
              ) : null}
            </>
          ) : (
            <p className="guide-center__empty">{dict.guideCenter.noResults}</p>
          )}
        </section>
      </div>
    </Dialog>
  );
}

function isGuideSectionId(value: string | null): value is GuideSectionId {
  return (
    value === 'quickStart' ||
    value === 'uiTour' ||
    value === 'markdown' ||
    value === 'shortcuts' ||
    value === 'manual'
  );
}

function extractManualOutline(snippet: string) {
  return snippet
    .split('\n')
    .map((line) => /^(#{2,3})\s+(.*)$/.exec(line.trim()))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => ({
      level: match[1].length,
      title: match[2],
      id: slugifyHeading(match[2]),
    }));
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
