import { lazy, Suspense, type CSSProperties, type MutableRefObject } from 'react';
import { Card } from '@doku/ui';
import type { DocumentSession } from '@doku/application';
import { useDict } from '../../i18n/I18nProvider.js';
import { MarkdownPreview } from './MarkdownPreview.js';
import type { MonacoEditorHandle } from './MonacoEditor.js';
import { PlainTextEditor } from './PlainTextEditor.js';
import { PreviewZoomBar } from './PreviewZoomBar.js';
import type { ImageDropControls } from './hooks/useImageDrop.js';
import type { PreviewZoomControls } from './hooks/usePreviewZoom.js';
import type { LoadState, ViewMode } from './workspaceTypes.js';
import { logWorkspaceEvent } from './workspaceDocuments.js';
import { ImmersiveEnterIcon, ImmersiveExitIcon } from './WorkspaceIcons.js';

const MonacoEditor = lazy(async () => {
  logWorkspaceEvent('monaco-module-load-started');
  try {
    const module = await import('./MonacoEditor.js');
    logWorkspaceEvent('monaco-module-load-finished');
    return { default: module.MonacoEditor };
  } catch (error: unknown) {
    logWorkspaceEvent('monaco-module-load-failed', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
});

interface EditorPanesProps {
  document: DocumentSession | null;
  loadState: LoadState;
  errorMessage: string | null;
  noticeMessage: string | null;
  viewMode: ViewMode;
  useTextareaEditor: boolean;
  monacoEditorRef: MutableRefObject<MonacoEditorHandle | null>;
  previewScrollRef: MutableRefObject<HTMLDivElement | null>;
  imageDrop: ImageDropControls;
  zoom: PreviewZoomControls;
  contentColorStyle: CSSProperties;
  immersive: boolean;
  onToggleImmersive: () => void;
  onContentChange: (value: string) => void;
  onEditorScrollChange: (state: {
    scrollTop: number;
    scrollHeight: number;
    viewportHeight: number;
  }) => void;
  onPreviewWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
  onMonacoReady: () => void;
  onMonacoError: (error: Error) => void;
}

/** Central card: loading / error states, the editor pane and the preview pane. */
export function EditorPanes({
  document,
  loadState,
  errorMessage,
  noticeMessage,
  viewMode,
  useTextareaEditor,
  monacoEditorRef,
  previewScrollRef,
  imageDrop,
  zoom,
  contentColorStyle,
  immersive,
  onToggleImmersive,
  onContentChange,
  onEditorScrollChange,
  onPreviewWheel,
  onMonacoReady,
  onMonacoError,
}: EditorPanesProps) {
  const dict = useDict();
  const previewContent = document?.content ?? '';
  const { previewZoom, previewInverted } = zoom;

  const renderImmersiveToggle = () => (
    <button
      type="button"
      className="workspace__immersive-toggle"
      aria-pressed={immersive}
      title={immersive ? dict.workspace.immersive.exit : dict.workspace.immersive.enter}
      aria-label={immersive ? dict.workspace.immersive.exit : dict.workspace.immersive.enter}
      onClick={onToggleImmersive}
    >
      {immersive ? <ImmersiveExitIcon /> : <ImmersiveEnterIcon />}
    </button>
  );

  return (
    <main className="workspace__editor" id="workspace-editor" tabIndex={-1}>
      <Card elevated className="workspace__editor-card">
        {loadState === 'loading' ? (
          <div className="workspace__editor-loading">{dict.workspace.editorLoading}</div>
        ) : loadState === 'missing' || loadState === 'error' ? (
          <div className="workspace__editor-error" role="alert">
            <h2 className="workspace__editor-title">{dict.workspace.editorErrorTitle}</h2>
            <p className="workspace__editor-body">
              {errorMessage ?? dict.workspace.editorErrorBody}
            </p>
          </div>
        ) : (
          <div className={`workspace__editor-shell workspace__editor-shell--${viewMode}`}>
            {noticeMessage ? <div className="workspace__editor-notice">{noticeMessage}</div> : null}
            <div className={`workspace__editor-panels workspace__editor-panels--${viewMode}`}>
              {(viewMode === 'write' || viewMode === 'split') && (
                <section
                  className={`workspace__editor-pane workspace__editor-pane--write${
                    imageDrop.editorDropActive ? ' workspace__editor-pane--drop-active' : ''
                  }`}
                  onDragEnter={imageDrop.handleEditorDragEnter}
                  onDragOver={imageDrop.handleEditorDragOver}
                  onDragLeave={imageDrop.handleEditorDragLeave}
                  onDrop={imageDrop.handleEditorDrop}
                >
                  {imageDrop.editorDropActive ? (
                    <div className="workspace__editor-dropzone">
                      <span className="workspace__editor-dropzone-eyebrow">
                        {dict.workspace.imageDropzoneEyebrow}
                      </span>
                      <strong className="workspace__editor-dropzone-title">
                        {dict.workspace.imageDropzoneTitle}
                      </strong>
                    </div>
                  ) : null}
                  {useTextareaEditor ? (
                    <PlainTextEditor
                      ref={monacoEditorRef}
                      value={document?.content ?? ''}
                      onChange={onContentChange}
                      onScrollChange={onEditorScrollChange}
                    />
                  ) : (
                    <Suspense
                      fallback={
                        <div className="workspace__editor-loading">
                          {dict.workspace.editorLoading}
                        </div>
                      }
                    >
                      <MonacoEditor
                        ref={monacoEditorRef}
                        value={document?.content ?? ''}
                        onChange={onContentChange}
                        onScrollChange={onEditorScrollChange}
                        onReady={onMonacoReady}
                        onError={onMonacoError}
                      />
                    </Suspense>
                  )}
                  {viewMode === 'write' ? renderImmersiveToggle() : null}
                </section>
              )}

              {(viewMode === 'preview' || viewMode === 'split') && (
                <section
                  className={`workspace__editor-pane workspace__editor-pane--preview${
                    viewMode === 'preview' ? ' workspace__editor-pane--preview-page' : ''
                  }${
                    viewMode === 'preview' && previewInverted
                      ? ' workspace__editor-pane--preview-inverted'
                      : ''
                  }`}
                  data-preview-inverted={viewMode === 'preview' ? previewInverted : undefined}
                  style={contentColorStyle}
                >
                  <div
                    ref={previewScrollRef}
                    className="workspace__preview-scroll"
                    onWheel={onPreviewWheel}
                    // In the full preview the scroller is a focusable
                    // region so arrow / page keys reach it natively too.
                    tabIndex={viewMode === 'preview' ? 0 : undefined}
                    role={viewMode === 'preview' ? 'region' : undefined}
                    aria-label={viewMode === 'preview' ? dict.workspace.previewEyebrow : undefined}
                    data-testid="preview-scroll"
                  >
                    <div
                      className="workspace__preview-zoom"
                      style={
                        viewMode === 'preview'
                          ? ({ zoom: previewZoom } as CSSProperties)
                          : undefined
                      }
                    >
                      <MarkdownPreview
                        content={previewContent}
                        sourcePath={document?.path}
                        emptyLabel={dict.workspace.previewEmpty}
                        visualLabels={{
                          loading: dict.workspace.visualBlocks.loading,
                          fallback: dict.workspace.visualBlocks.fallback,
                          errorTitle: dict.workspace.visualBlocks.errorTitle,
                        }}
                      />
                    </div>
                  </div>
                  {viewMode === 'preview' ? <PreviewZoomBar zoom={zoom} /> : null}
                  {renderImmersiveToggle()}
                </section>
              )}
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
