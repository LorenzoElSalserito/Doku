import { useDict } from '../../i18n/I18nProvider.js';
import type { PreviewZoomControls } from './hooks/usePreviewZoom.js';
import { PREVIEW_ZOOM_MAX, PREVIEW_ZOOM_MIN, PREVIEW_ZOOM_STEP } from './workspaceTypes.js';
import { FitPageIcon, FitWidthIcon, InvertColorsIcon } from './WorkspaceIcons.js';

/** Floating bar of the full preview: fit, invert, zoom steps, slider, value. */
export function PreviewZoomBar({ zoom }: { zoom: PreviewZoomControls }) {
  const dict = useDict();
  const { previewZoom, previewInverted } = zoom;

  return (
    <div
      className="workspace__preview-zoom-bar"
      role="group"
      aria-label={dict.workspace.previewZoom.label}
    >
      <button
        type="button"
        className="workspace__preview-zoom-fit"
        title={dict.workspace.previewZoom.fitWidth}
        aria-label={dict.workspace.previewZoom.fitWidth}
        onClick={() => zoom.fitPreview('width')}
      >
        <FitWidthIcon />
      </button>
      <button
        type="button"
        className="workspace__preview-zoom-fit"
        title={dict.workspace.previewZoom.fitPage}
        aria-label={dict.workspace.previewZoom.fitPage}
        onClick={() => zoom.fitPreview('length')}
      >
        <FitPageIcon />
      </button>
      <button
        type="button"
        className={`workspace__preview-zoom-fit${
          previewInverted ? ' workspace__preview-zoom-fit--active' : ''
        }`}
        title={
          previewInverted
            ? dict.workspace.previewInvert.restore
            : dict.workspace.previewInvert.invert
        }
        aria-label={
          previewInverted
            ? dict.workspace.previewInvert.restore
            : dict.workspace.previewInvert.invert
        }
        aria-pressed={previewInverted}
        onClick={zoom.togglePreviewInverted}
      >
        <InvertColorsIcon />
      </button>
      <span className="workspace__preview-zoom-divider" aria-hidden />
      <button
        type="button"
        className="workspace__preview-zoom-step"
        title={dict.workspace.previewZoom.zoomOut}
        aria-label={dict.workspace.previewZoom.zoomOut}
        disabled={previewZoom <= PREVIEW_ZOOM_MIN}
        onClick={() => zoom.adjustPreviewZoom(-PREVIEW_ZOOM_STEP)}
      >
        −
      </button>
      <input
        type="range"
        className="workspace__preview-zoom-slider"
        min={PREVIEW_ZOOM_MIN}
        max={PREVIEW_ZOOM_MAX}
        step={0.05}
        value={previewZoom}
        aria-label={dict.workspace.previewZoom.label}
        onChange={(event) => zoom.setPreviewZoomValue(Number(event.target.value))}
      />
      <button
        type="button"
        className="workspace__preview-zoom-step"
        title={dict.workspace.previewZoom.zoomIn}
        aria-label={dict.workspace.previewZoom.zoomIn}
        disabled={previewZoom >= PREVIEW_ZOOM_MAX}
        onClick={() => zoom.adjustPreviewZoom(PREVIEW_ZOOM_STEP)}
      >
        +
      </button>
      {zoom.zoomEditing ? (
        <input
          type="number"
          className="workspace__preview-zoom-input"
          min={PREVIEW_ZOOM_MIN * 100}
          max={PREVIEW_ZOOM_MAX * 100}
          step={5}
          value={zoom.zoomDraft}
          autoFocus
          aria-label={dict.workspace.previewZoom.label}
          onChange={(event) => zoom.setZoomDraft(event.target.value)}
          onBlur={zoom.commitZoomDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              zoom.commitZoomDraft();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              zoom.setZoomEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="workspace__preview-zoom-value"
          title={dict.workspace.previewZoom.reset}
          aria-label={dict.workspace.previewZoom.reset}
          onClick={zoom.handleZoomValueClick}
          onDoubleClick={zoom.handleZoomValueDoubleClick}
        >
          {Math.round(previewZoom * 100)}%
        </button>
      )}
    </div>
  );
}
