import { useEffect } from 'react';
import type { Annotation, AnnotationTool, RectangleAnnotation } from '../../types/annotation';
import type { LoadedImage } from '../../types/document';
import type { ViewportState } from '../../types/viewport';
import { useRectangleDrawing } from '../../hooks/useRectangleDrawing';

interface CanvasViewportProps {
  image: LoadedImage;
  annotations: readonly Annotation[];
  selectedAnnotationId: string | null;
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  viewport: ViewportState;
  onSelectAnnotation: (id: string | null) => void;
  onCommitAnnotation: (annotation: RectangleAnnotation) => void;
}

export function CanvasViewport({
  image,
  annotations,
  selectedAnnotationId,
  activeTool,
  activeColor,
  activeStrokeWidth,
  viewport,
  onSelectAnnotation,
  onCommitAnnotation,
}: CanvasViewportProps) {
  const {
    draftAnnotation,
    cancelDrawing,
    pointerHandlers,
  } = useRectangleDrawing({
    activeTool,
    activeColor,
    activeStrokeWidth,
    imageDimensions: { width: image.width, height: image.height },
    onCommitAnnotation,
  });

  // Cancel draft drawing on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDrawing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelDrawing]);

  const transformStyle = {
    transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
  };

  const isDrawingTool = activeTool === 'rectangle';

  return (
    <div className="fn-viewport-stage" style={transformStyle}>
      <div
        className="fn-image-canvas-wrapper"
        style={{
          width: image.width,
          height: image.height,
        }}
      >
        {/* Base Screenshot Image (aspect ratio strictly preserved, no crop or stretch) */}
        <img
          src={image.src}
          alt={`Screenshot: ${image.name}`}
          width={image.width}
          height={image.height}
          className="fn-base-image"
          draggable={false}
        />

        {/* SVG Overlay: Coordinate space locked to native image pixels via viewBox */}
        <svg
          className="fn-svg-overlay"
          viewBox={`0 0 ${image.width} ${image.height}`}
          width={image.width}
          height={image.height}
          xmlns="http://www.w3.org/2000/svg"
          style={{ cursor: isDrawingTool ? 'crosshair' : 'default' }}
          {...pointerHandlers}
        >
          {/* Committed Annotations */}
          {annotations.map((annotation) => {
            const isSelected = annotation.id === selectedAnnotationId;
            return (
              <g
                key={annotation.id}
                onClick={(e) => {
                  if (activeTool === 'select') {
                    e.stopPropagation();
                    onSelectAnnotation(annotation.id);
                  }
                }}
                style={{ cursor: activeTool === 'select' ? 'pointer' : 'crosshair' }}
              >
                {renderSvgAnnotation(annotation, isSelected)}
              </g>
            );
          })}

          {/* Active Draft Rectangle */}
          {draftAnnotation && (
            <rect
              className="fn-draft-rectangle"
              x={draftAnnotation.x}
              y={draftAnnotation.y}
              width={draftAnnotation.width}
              height={draftAnnotation.height}
              fill="transparent"
              stroke={draftAnnotation.color}
              strokeWidth={draftAnnotation.strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              rx={2}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

function renderSvgAnnotation(annotation: Annotation, isSelected: boolean) {
  const strokeColor = isSelected ? '#4f46e5' : annotation.color;
  const strokeWidth = annotation.strokeWidth;

  switch (annotation.type) {
    case 'rectangle':
      return (
        <g>
          {/* Selection halo if selected */}
          {isSelected && (
            <rect
              x={annotation.x - 3}
              y={annotation.y - 3}
              width={annotation.width + 6}
              height={annotation.height + 6}
              fill="none"
              stroke="#6366f1"
              strokeWidth={Math.max(1, strokeWidth * 0.5)}
              strokeDasharray="4 3"
              rx={4}
              opacity={0.8}
            />
          )}
          <rect
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            fill={annotation.fill && annotation.fill !== 'transparent' ? annotation.fill : 'transparent'}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
            rx={2}
          />
        </g>
      );

    case 'arrow':
      return (
        <line
          x1={annotation.start.x}
          y1={annotation.start.y}
          x2={annotation.end.x}
          y2={annotation.end.y}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      );

    case 'pen':
      if (annotation.points.length < 2) return null;
      {
        const d = annotation.points
          .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
          .join(' ');
        return (
          <path
            d={d}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      }

    case 'text':
      return (
        <text
          x={annotation.x}
          y={annotation.y}
          fill={strokeColor}
          fontSize={annotation.fontSize}
          fontWeight={600}
        >
          {annotation.text}
        </text>
      );

    case 'callout':
      return (
        <g>
          <circle cx={annotation.x} cy={annotation.y} r={14} fill={strokeColor} />
          <text
            x={annotation.x}
            y={annotation.y}
            fill="#ffffff"
            fontSize={12}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {annotation.index}
          </text>
        </g>
      );

    case 'blur':
      return (
        <rect
          x={annotation.x}
          y={annotation.y}
          width={annotation.width}
          height={annotation.height}
          fill="rgba(0, 0, 0, 0.45)"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      );
  }
}
