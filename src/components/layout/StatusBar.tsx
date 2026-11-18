import type { AnnotationDocument } from '../../types/document';
import type { ViewportState } from '../../types/viewport';
import { IconFit, IconRedo, IconUndo, IconZoomIn, IconZoomOut } from '../common/Icons';

interface StatusBarProps {
  document: AnnotationDocument;
  viewport: ViewportState;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
}

export function StatusBar({
  document,
  viewport,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
}: StatusBarProps) {
  const zoomPercent = Math.round(viewport.zoom * 100);
  const annotationCount = document.annotations.length;
  const imageDims = document.image
    ? `${document.image.width} × ${document.image.height} px`
    : null;

  return (
    <footer className="fn-statusbar" role="status" aria-label="Editor status">
      <div className="fn-statusbar-left">
        {/* Undo / Redo */}
        <div className="fn-status-item">
          <button
            type="button"
            className="fn-btn-ghost"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last action (Ctrl+Z / Cmd+Z)"
            aria-label="Undo last action (Ctrl+Z)"
          >
            <IconUndo />
          </button>
          <button
            type="button"
            className="fn-btn-ghost"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo action (Ctrl+Shift+Z / Cmd+Shift+Z)"
            aria-label="Redo action (Ctrl+Shift+Z)"
          >
            <IconRedo />
          </button>
        </div>

        {/* Annotation Count */}
        <div className="fn-status-item">
          <span>
            {annotationCount === 1 ? '1 annotation' : `${annotationCount} annotations`}
          </span>
        </div>
      </div>

      <div className="fn-statusbar-center">
        {imageDims && (
          <span className="fn-status-mono" title="Native screenshot dimensions">
            {imageDims}
          </span>
        )}
      </div>

      <div className="fn-statusbar-right">
        {/* Zoom Controls */}
        <div className="fn-zoom-controls">
          <button
            type="button"
            className="fn-zoom-btn"
            onClick={onZoomOut}
            title="Zoom out (-)"
            aria-label="Zoom out"
          >
            <IconZoomOut />
          </button>

          <button
            type="button"
            className="fn-zoom-btn fn-zoom-value"
            onClick={onResetZoom}
            title="Click to reset to 100%"
          >
            {zoomPercent}%
          </button>

          <button
            type="button"
            className="fn-zoom-btn"
            onClick={onZoomIn}
            title="Zoom in (+)"
            aria-label="Zoom in"
          >
            <IconZoomIn />
          </button>

          <button
            type="button"
            className="fn-zoom-btn"
            onClick={onFitToScreen}
            title="Fit to view (0)"
            aria-label="Fit to view"
          >
            <IconFit />
          </button>
        </div>
      </div>
    </footer>
  );
}
