import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { Annotation, AnnotationTool } from '../../types/annotation';
import type { AnnotationDocument } from '../../types/document';
import type { Dimensions, Point } from '../../types/geometry';
import type { ViewportState } from '../../types/viewport';
import { IconUpload } from '../common/Icons';
import { CanvasViewport } from './CanvasViewport';
import { DrawingToolbar } from './DrawingToolbar';
import { EmptyState } from './EmptyState';

interface WorkspaceProps {
  document: AnnotationDocument;
  viewport: ViewportState;
  isPanning: boolean;
  onStartPanning: (screenPoint: Point) => void;
  onUpdatePanning: (screenPoint: Point, bounds?: { image?: Dimensions; container?: Dimensions }) => void;
  onStopPanning: () => void;
  onWheel: (e: React.WheelEvent<HTMLElement>, containerRect: DOMRect, image?: Dimensions) => void;
  onUploadFile: (file: File) => void;
  onTrySample: () => void;
  onSelectTool: (tool: AnnotationTool) => void;
  onSelectColor: (color: string) => void;
  onSelectStrokeWidth: (width: number) => void;
  onSelectAnnotation: (id: string | null) => void;
  onCommitAnnotation: (annotation: Annotation) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  onFitToScreen: (containerDims: { width: number; height: number }) => void;
  isLoading?: boolean;
}

export function Workspace({
  document,
  viewport,
  isPanning,
  onStartPanning,
  onUpdatePanning,
  onStopPanning,
  onWheel,
  onUploadFile,
  onTrySample,
  onSelectTool,
  onSelectColor,
  onSelectStrokeWidth,
  onSelectAnnotation,
  onCommitAnnotation,
  onUpdateAnnotation,
  onFitToScreen,
  isLoading = false,
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isWorkspaceDragOver, setIsWorkspaceDragOver] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const image = document.image;

  // Selected annotation (if any) to drive style controls
  const selectedAnnotation = document.annotations.find(
    (a) => a.id === document.selectedAnnotationId
  );

  const displayColor = selectedAnnotation ? selectedAnnotation.color : document.activeColor;
  const displayStrokeWidth = selectedAnnotation ? selectedAnnotation.strokeWidth : document.activeStrokeWidth;

  const isPanningMode = isSpacePressed || document.activeTool === 'hand';

  // Auto-fit image when a new image loads
  useEffect(() => {
    if (image && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        onFitToScreen({ width: rect.width, height: rect.height });
      }
    }
  }, [image, onFitToScreen]);

  // Handle container resizing via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          // Keep image centered/fitted when workspace size shifts
          onFitToScreen({ width, height });
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [onFitToScreen]);

  // Spacebar pan mode: ignore when user is actively editing comments or input fields
  useEffect(() => {
    const isTargetEditable = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return (
        el?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName || '')
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTargetEditable(e.target)) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    const handleWindowBlur = () => {
      setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Primary button with hand/space mode, middle mouse button, or clicking empty workspace background
    const isMiddleClick = e.button === 1;
    const isPrimaryWithPan = e.button === 0 && (isPanningMode || e.target === containerRef.current);

    if (isMiddleClick || isPrimaryWithPan) {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Fallback for non-supporting test environments
      }
      onStartPanning({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      const bounds =
        image && rect
          ? { image, container: { width: rect.width, height: rect.height } }
          : undefined;
      onUpdatePanning({ x: e.clientX, y: e.clientY }, bounds);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
      onStopPanning();
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      onWheel(e, rect, image || undefined);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsWorkspaceDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsWorkspaceDragOver(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWorkspaceDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const cursorStyle = isPanning ? 'grabbing' : isPanningMode ? 'grab' : 'default';

  return (
    <main
      ref={containerRef}
      className={`fn-workspace ${isWorkspaceDragOver ? 'is-drag-active' : ''} ${
        isPanningMode ? 'is-panning-mode' : ''
      }`}
      style={{ cursor: cursorStyle }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label="Image annotation workspace"
    >
      {/* Drag Over Overlay */}
      {isWorkspaceDragOver && (
        <div className="fn-workspace-drop-overlay" aria-hidden="true">
          <div className="fn-drop-overlay-card">
            <IconUpload width={32} height={32} />
            <p className="fn-drop-overlay-title">Drop image to replace current screenshot</p>
            <p className="fn-drop-overlay-sub">Supported formats: PNG, JPEG, WebP (up to 25 MB)</p>
          </div>
        </div>
      )}

      {/* Floating Drawing Toolbar (shown when image is loaded) */}
      {image && (
        <DrawingToolbar
          activeTool={document.activeTool}
          activeColor={displayColor}
          activeStrokeWidth={displayStrokeWidth}
          hasSelection={Boolean(selectedAnnotation)}
          onSelectTool={onSelectTool}
          onSelectColor={onSelectColor}
          onSelectStrokeWidth={onSelectStrokeWidth}
        />
      )}

      {/* Workspace Content */}
      {image ? (
        <CanvasViewport
          image={image}
          annotations={document.annotations}
          selectedAnnotationId={document.selectedAnnotationId}
          activeTool={document.activeTool}
          activeColor={document.activeColor}
          activeStrokeWidth={document.activeStrokeWidth}
          viewport={viewport}
          isPanningMode={isPanningMode}
          onSelectAnnotation={onSelectAnnotation}
          onCommitAnnotation={onCommitAnnotation}
          onUpdateAnnotation={onUpdateAnnotation}
        />
      ) : (
        <EmptyState
          onUploadFile={onUploadFile}
          onTrySample={onTrySample}
          isLoading={isLoading}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fn-workspace-loading-scrim" role="status" aria-live="polite">
          <div className="fn-loading-indicator">
            <span className="fn-loading-spinner" />
            <span>Decoding screenshot...</span>
          </div>
        </div>
      )}
    </main>
  );
}
