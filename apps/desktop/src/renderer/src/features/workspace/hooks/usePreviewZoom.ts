import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '@doku/ui';
import {
  PREVIEW_FIT_LENGTH_ZOOM,
  PREVIEW_FIT_WIDTH_ZOOM,
  PREVIEW_ZOOM_MAX,
  PREVIEW_ZOOM_MIN,
} from '../workspaceTypes.js';
import { clamp, logWorkspaceEvent, roundZoom } from '../workspaceDocuments.js';

/**
 * Owns: the preview page zoom (slider, steps, fit, manual entry) and the
 * colour inversion override.
 * Exposes: the zoom value and draft, the inverted flag and their handlers.
 * Does not: persist anything; zoom and inversion live for the session only.
 */
export function usePreviewZoom() {
  const [previewZoom, setPreviewZoom] = useState(1);
  // The preview follows the app theme by default; the invert button only holds
  // an explicit override until the theme changes again.
  const { resolved: resolvedTheme } = useTheme();
  const [previewInvertOverride, setPreviewInvertOverride] = useState<boolean | null>(null);
  const previewInverted = previewInvertOverride ?? resolvedTheme === 'dark';
  // A theme switch wins over a previous manual override: the preview goes back
  // to matching the app.
  useEffect(() => {
    setPreviewInvertOverride(null);
  }, [resolvedTheme]);
  const [zoomEditing, setZoomEditing] = useState(false);
  const [zoomDraft, setZoomDraft] = useState('');
  const zoomClickTimerRef = useRef<number | null>(null);

  const adjustPreviewZoom = useCallback((delta: number) => {
    setPreviewZoom((current) =>
      roundZoom(clamp(current + delta, PREVIEW_ZOOM_MIN, PREVIEW_ZOOM_MAX)),
    );
  }, []);

  const setPreviewZoomValue = useCallback((value: number) => {
    if (!Number.isFinite(value)) {
      return;
    }
    setPreviewZoom(roundZoom(clamp(value, PREVIEW_ZOOM_MIN, PREVIEW_ZOOM_MAX)));
  }, []);

  const handleZoomValueClick = useCallback(() => {
    // Defer the single-click reset so a double-click (manual entry) can cancel it.
    if (zoomClickTimerRef.current !== null) {
      window.clearTimeout(zoomClickTimerRef.current);
    }
    zoomClickTimerRef.current = window.setTimeout(() => {
      zoomClickTimerRef.current = null;
      setPreviewZoom(1);
      logWorkspaceEvent('workspace-preview-zoom-reset');
    }, 220);
  }, []);

  const handleZoomValueDoubleClick = useCallback(() => {
    if (zoomClickTimerRef.current !== null) {
      window.clearTimeout(zoomClickTimerRef.current);
      zoomClickTimerRef.current = null;
    }
    setZoomDraft(String(Math.round(previewZoom * 100)));
    setZoomEditing(true);
  }, [previewZoom]);

  const commitZoomDraft = useCallback(() => {
    const parsed = Number(zoomDraft);
    if (Number.isFinite(parsed) && zoomDraft.trim() !== '') {
      setPreviewZoom(roundZoom(clamp(parsed / 100, PREVIEW_ZOOM_MIN, PREVIEW_ZOOM_MAX)));
    }
    setZoomEditing(false);
  }, [zoomDraft]);

  useEffect(() => {
    return () => {
      if (zoomClickTimerRef.current !== null) {
        window.clearTimeout(zoomClickTimerRef.current);
      }
    };
  }, []);

  const fitPreview = useCallback((mode: 'width' | 'length') => {
    const nextZoom = mode === 'width' ? PREVIEW_FIT_WIDTH_ZOOM : PREVIEW_FIT_LENGTH_ZOOM;
    setPreviewZoom(nextZoom);
    logWorkspaceEvent('workspace-preview-zoom-fit', { mode, zoom: nextZoom });
  }, []);

  const togglePreviewInverted = useCallback(() => {
    setPreviewInvertOverride((current) => {
      const next = !(current ?? resolvedTheme === 'dark');
      logWorkspaceEvent('workspace-preview-inverted-toggled', {
        inverted: next,
        theme: resolvedTheme,
      });
      return next;
    });
  }, [resolvedTheme]);

  return {
    previewZoom,
    previewInverted,
    zoomEditing,
    zoomDraft,
    setZoomDraft,
    setZoomEditing,
    adjustPreviewZoom,
    setPreviewZoomValue,
    handleZoomValueClick,
    handleZoomValueDoubleClick,
    commitZoomDraft,
    fitPreview,
    togglePreviewInverted,
  };
}

export type PreviewZoomControls = ReturnType<typeof usePreviewZoom>;
