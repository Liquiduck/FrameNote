import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { Annotation, AnnotationTool } from '../../types/annotation';
import type { AnnotationDocument } from '../../types/document';
import type { ViewportState } from '../../types/viewport';
import { IconUpload } from '../common/Icons';
import { CanvasViewport } from './CanvasViewport';
import { DrawingToolbar } from './DrawingToolbar';
import { EmptyState } from './EmptyState';

interface WorkspaceProps {
  document: AnnotationDocument;
  viewport: ViewportState;
  isPanning: boolean;
  onStartPanning: (screenPoint: { x: number; y: number }) => void;
  onUpdatePanning: (screenPoint: { x: number; y: number }) => void;
  onStopPanning: () => void;
  onWheel: (e: React.WheelEvent<HTMLElement>, containerRect: DOMRect) => void;
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
  const image = document.image;

  // Selected annotation (if any) to drive style controls
  const selectedAnnotation = document.annotations.find(
    (a) => a.id === document.selectedAnnotationId
  );

  const displayColor = selectedAnnotation ? selectedAnnotation.color : document.activeColor;
  const displayStrokeWidth = selectedAnnotation ? selectedAnnotation.strokeWidth : document.activeStrokeWidth;

  // Auto-fit image to container whenever a new image is loaded
  useEffect(() => {
    if (image && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        onFitToScreen({ width: rect.width, height: rect.height });
      }
    }
  }, [image, onFitToScreen]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (image && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          onFitToScreen({ width: rect.width, height: rect.height });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [image, onFitToScreen]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only pan workspace background when middle button or clicked empty region
    if (e.button === 1 || e.target === containerRef.current) {
      e.preventDefault();
      onStartPanning({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      onUpdatePanning({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      onStopPanning();
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      onWheel(e, rect);
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

  return (
    <main
      ref={containerRef}
      className={`fn-workspace ${isWorkspaceDragOver ? 'is-drag-active' : ''}`}
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
