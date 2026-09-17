import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Button, Dialog, Icon, Input, type BootstrapIconName } from '@doku/ui';
import { MarkdownPreview } from '../workspace/MarkdownPreview.js';
import { useDict } from '../../i18n/I18nProvider.js';

type GuideSectionId =
  | 'quickStart'
  | 'uiTour'
  | 'markdown'
  | 'visualBlocks'
  | 'exportPdf'
  | 'typography'
  | 'workspace'
  | 'shortcuts'
  | 'manual';

interface GuideDialogProps {
  open: boolean;
  onClose: () => void;
}

interface GuideSection {
  id: GuideSectionId;
  icon: BootstrapIconName;
  title: string;
  summary: string;
  intro: string;
  bullets: string[];
  snippetLabel?: string;
  snippet?: string;
  shortcuts?: { keys: string; action: string }[];
}

const SECTION_ORDER: ReadonlyArray<{ id: GuideSectionId; icon: BootstrapIconName }> = [
  { id: 'quickStart', icon: 'lightning-charge' },
  { id: 'uiTour', icon: 'layout-sidebar' },
  { id: 'markdown', icon: 'markdown' },
  { id: 'visualBlocks', icon: 'diagram-3' },
  { id: 'exportPdf', icon: 'file-earmark-pdf' },
  { id: 'typography', icon: 'fonts' },
  { id: 'workspace', icon: 'folder2-open' },
  { id: 'shortcuts', icon: 'keyboard' },
  { id: 'manual', icon: 'book' },
];

const SESSION_STORAGE_KEY = 'doku.guide.active-section';

export function GuideDialog({ open, onClose }: GuideDialogProps) {
  const dict = useDict();
  const [query, setQuery] = useState('');
  const [copiedSection, setCopiedSection] = useState<GuideSectionId | null>(null);
  const articlePreviewRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
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
    () =>
      SECTION_ORDER.map(({ id, icon }) => {
        const copy = dict.guideCenter.sections[id];
        return {
          id,
          icon,
          title: copy.title,
          summary: copy.summary,
          intro: copy.intro,
          bullets: copy.bullets,
          snippetLabel: 'snippetLabel' in copy ? copy.snippetLabel : undefined,
          snippet: 'snippet' in copy ? copy.snippet : undefined,
          shortcuts: id === 'shortcuts' ? dict.guideCenter.sections.shortcuts.items : undefined,
        };
      }),
    [dict.guideCenter.sections],
  );

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return sections;
    }
    return sections.filter((section) =>
      [
        section.title,
        section.summary,
        section.intro,
        ...section.bullets,
        section.snippet ?? '',
        ...(section.shortcuts ?? []).flatMap((item) => [item.keys, item.action]),
      ]
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

  // A new section always starts at its top.
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeSection?.id]);

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

  const renderCopyButton = (section: GuideSection) => (
    <Button
      variant={copiedSection === section.id ? 'secondary' : 'ghost'}
      size="sm"
      className="guide-center__copy"
      onClick={() => void handleCopySnippet(section)}
    >
      <Icon name={copiedSection === section.id ? 'clipboard-check' : 'clipboard'} size={14} />
      <span>{copiedSection === section.id ? dict.guideCenter.copied : dict.guideCenter.copy}</span>
    </Button>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dict.guideCenter.title}
      subtitle={dict.guideCenter.subtitle}
      className="doku-dialog--guide"
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
            <span className="guide-center__search-field">
              <Icon name="search" size={14} className="guide-center__search-icon" />
              <Input
                id="guide-center-search"
                ref={searchInputRef}
                data-dialog-autofocus
                aria-label={dict.guideCenter.searchLabel}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={dict.guideCenter.searchPlaceholder}
                onKeyDown={handleSearchKeyDown}
              />
            </span>
            <span className="guide-center__search-count" aria-live="polite">
              {dict.guideCenter.resultsCount.replace('{{count}}', String(filteredSections.length))}
            </span>
          </label>

          <nav className="guide-center__nav" aria-label={dict.guideCenter.navLabel}>
            {filteredSections.length === 0 ? (
              <p className="guide-center__empty">{dict.guideCenter.noResults}</p>
            ) : (
              filteredSections.map((section, index) => (
                <button
                  key={section.id}
                  ref={(node) => {
                    sectionNavRefs.current[index] = node;
                  }}
                  type="button"
                  className={
                    section.id === activeSection?.id
                      ? 'guide-center__nav-item guide-center__nav-item--active'
                      : 'guide-center__nav-item'
                  }
                  aria-current={section.id === activeSection?.id ? 'true' : undefined}
                  onClick={() => setActiveSectionId(section.id)}
                  onKeyDown={(event) => handleSectionNavKeyDown(event, index)}
                >
                  <span className="guide-center__nav-icon" aria-hidden="true">
                    <Icon name={section.icon} size={16} />
                  </span>
                  <span className="guide-center__nav-copy">
                    <span className="guide-center__nav-title">{section.title}</span>
                    <span className="guide-center__nav-summary">{section.summary}</span>
                  </span>
                </button>
              ))
            )}
          </nav>
        </aside>

        <section
          ref={contentRef}
          className="guide-center__content"
          aria-live="polite"
          data-section={activeSection?.id}
        >
          {activeSection ? (
            <>
              <header className="guide-center__content-header">
                <span className="guide-center__content-icon" aria-hidden="true">
                  <Icon name={activeSection.icon} size={22} />
                </span>
                <div className="guide-center__content-heading">
                  <span className="guide-center__eyebrow">{activeSection.summary}</span>
                  <h3 className="guide-center__title">{activeSection.title}</h3>
                  <p className="guide-center__intro">{activeSection.intro}</p>
                </div>
              </header>

              <ul className="guide-center__list">
                {activeSection.bullets.map((bullet) => (
                  <li key={bullet}>
                    <Icon name="check2" size={14} className="guide-center__list-icon" />
                    <span>{renderInlineCode(bullet)}</span>
                  </li>
                ))}
              </ul>

              {activeSection.shortcuts ? (
                <table className="guide-center__shortcuts">
                  <thead>
                    <tr>
                      <th scope="col">{dict.guideCenter.shortcutKeysHeader}</th>
                      <th scope="col">{dict.guideCenter.shortcutActionHeader}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSection.shortcuts.map((item) => (
                      <tr key={item.keys}>
                        <td>{renderKeys(item.keys)}</td>
                        <td>{item.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {activeSection.snippet ? (
                activeSection.id === 'manual' ? (
                  <div className="guide-center__article-layout">
                    {manualOutline.length > 0 ? (
                      <aside className="guide-center__panel guide-center__article-index">
                        <div className="guide-center__panel-head">
                          <div>
                            <span className="guide-center__panel-eyebrow">
                              {dict.guideCenter.outlineTitle}
                            </span>
                            <h4 className="guide-center__panel-title">{activeSection.title}</h4>
                          </div>
                        </div>
                        <p className="guide-center__article-index-body">{dict.guideCenter.outlineBody}</p>
                        <nav className="guide-center__article-nav" aria-label={dict.guideCenter.outlineTitle}>
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
                        {renderCopyButton(activeSection)}
                      </div>
                      <div ref={articlePreviewRef} className="guide-center__article-preview">
                        <MarkdownPreview
                          content={activeSection.snippet}
                          emptyLabel={dict.workspace.previewEmpty}
                          visualLabels={{
                            loading: dict.workspace.visualBlocks.loading,
                            fallback: dict.workspace.visualBlocks.fallback,
                            errorTitle: dict.workspace.visualBlocks.errorTitle,
                          }}
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
                        {renderCopyButton(activeSection)}
                      </div>
                      <pre className="guide-center__snippet">
                        <code>{activeSection.snippet}</code>
                      </pre>
                    </section>

                    <section className="guide-center__panel guide-center__panel--preview">
                      <span className="guide-center__panel-eyebrow">{dict.guideCenter.livePreview}</span>
                      <div className="guide-center__preview-frame">
                        <MarkdownPreview
                          content={activeSection.snippet}
                          emptyLabel={dict.workspace.previewEmpty}
                          visualLabels={{
                            loading: dict.workspace.visualBlocks.loading,
                            fallback: dict.workspace.visualBlocks.fallback,
                            errorTitle: dict.workspace.visualBlocks.errorTitle,
                          }}
                        />
                      </div>
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
  return SECTION_ORDER.some((section) => section.id === value);
}

/** Renders `code` spans inside guide copy as inline code. */
function renderInlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) =>
    part.startsWith('`') && part.endsWith('`') ? (
      <code key={index} className="guide-center__inline-code">
        {part.slice(1, -1)}
      </code>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

/** "Ctrl/Cmd + Shift + S" → a row of <kbd> chips. */
function renderKeys(keys: string) {
  const chords = keys.split(' / ');
  return chords.map((chord, chordIndex) => (
    <span key={chord} className="guide-center__chord">
      {chordIndex > 0 ? <span className="guide-center__chord-separator">/</span> : null}
      {chord.split(' + ').map((key, keyIndex) => (
        <span key={`${chord}-${key}`}>
          {keyIndex > 0 ? <span className="guide-center__key-plus">+</span> : null}
          <kbd className="guide-center__key">{key}</kbd>
        </span>
      ))}
    </span>
  ));
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
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
