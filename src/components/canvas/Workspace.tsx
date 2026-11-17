import { useEffect, useRef } from 'react';
import type { AnnotationDocument } from '../../types/document';
import type { ViewportState } from '../../types/viewport';
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
  onSelectAnnotation: (id: string | null) => void;
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
  onSelectAnnotation,
  onFitToScreen,
  isLoading = false,
}: WorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const image = document.image;

  // Auto-fit image to container on initial load
  useEffect(() => {
    if (image && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      onFitToScreen({ width: rect.width, height: rect.height });
    }
  }, [image, onFitToScreen]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Middle mouse button or clicking canvas background triggers pan
    if (e.button === 1 || e.target === containerRef.current || (e.target as HTMLElement).tagName === 'DIV') {
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

  return (
    <main
      ref={containerRef}
      className="fn-workspace"
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      role="region"
      aria-label="Image annotation workspace"
    >
      {/* Floating Drawing Toolbar (visible when an image is loaded) */}
      {image && (
        <DrawingToolbar
          activeTool={document.activeTool}
          onSelectTool={() => {
            // Note: Tool switching will be wired to document reducer;
            // drawing interactions are held for the next phase.
          }}
        />
      )}

      {image ? (
        <CanvasViewport
          image={image}
          annotations={document.annotations}
          selectedAnnotationId={document.selectedAnnotationId}
          viewport={viewport}
          onSelectAnnotation={onSelectAnnotation}
        />
      ) : (
        <EmptyState
          onUploadFile={onUploadFile}
          onTrySample={onTrySample}
          isLoading={isLoading}
        />
      )}
    </main>
  );
}
