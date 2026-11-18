import { useEffect } from 'react';
import type { Annotation, AnnotationTool } from '../../types/annotation';
import type { LoadedImage } from '../../types/document';
import type { ViewportState } from '../../types/viewport';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { calculateArrowGeometry } from '../../core/annotation/arrowGeometry';
import { getPinDisplayNumber, PIN_RADIUS } from '../../core/annotation/pinGeometry';

interface CanvasViewportProps {
  image: LoadedImage;
  annotations: readonly Annotation[];
  selectedAnnotationId: string | null;
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  viewport: ViewportState;
  onSelectAnnotation: (id: string | null) => void;
  onCommitAnnotation: (annotation: Annotation) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
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
  onUpdateAnnotation,
}: CanvasViewportProps) {
  const {
    draftAnnotation,
    movingAnnotation,
    cancelInteraction,
    pointerHandlers,
  } = useCanvasInteraction({
    activeTool,
    activeColor,
    activeStrokeWidth,
    imageDimensions: { width: image.width, height: image.height },
    annotations,
    selectedAnnotationId,
    onSelectAnnotation,
    onCommitAnnotation,
    onUpdateAnnotation,
  });

  // Cancel draft drawing or movement on Escape key; also clear selection if idle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelInteraction();
        if (selectedAnnotationId) {
          onSelectAnnotation(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelInteraction, onSelectAnnotation, selectedAnnotationId]);

  const transformStyle = {
    transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
  };

  const isDrawing = activeTool === 'rectangle' || activeTool === 'arrow' || activeTool === 'pin';

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
          style={{ cursor: isDrawing ? 'crosshair' : movingAnnotation ? 'grabbing' : 'default' }}
          {...pointerHandlers}
        >
          {/* Committed Annotations */}
          {annotations.map((annotation) => {
            const activeAnn =
              movingAnnotation && movingAnnotation.id === annotation.id
                ? movingAnnotation
                : annotation;
            const isSelected = activeAnn.id === selectedAnnotationId;

            return (
              <g
                key={activeAnn.id}
                className={`fn-annotation-group ${isSelected ? 'is-selected' : ''}`}
                style={{ cursor: activeTool === 'select' ? 'grab' : isDrawing ? 'crosshair' : 'default' }}
              >
                {renderSvgAnnotation(activeAnn, isSelected, false, annotations)}
              </g>
            );
          })}

          {/* Active Draft (Rectangle or Arrow preview) */}
          {draftAnnotation && (
            <g className="fn-draft-layer" pointerEvents="none">
              {renderSvgAnnotation(draftAnnotation, false, true, annotations)}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

/**
 * Render individual annotations with optional editor selection indicator and enlarged invisible hit targets.
 */
function renderSvgAnnotation(
  annotation: Annotation,
  isSelected: boolean,
  isDraft = false,
  allAnnotations: readonly Annotation[] = []
) {
  const strokeColor = isSelected ? '#4f46e5' : annotation.color;
  const strokeWidth = annotation.strokeWidth;

  switch (annotation.type) {
    case 'rectangle':
      return (
        <g>
          {/* Enlarged invisible hit target */}
          <rect
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            fill="transparent"
            stroke="transparent"
            strokeWidth={Math.max(strokeWidth + 16, 24)}
          />

          {/* Editor-only selection halo (never in export) */}
          {isSelected && (
            <rect
              x={annotation.x - 4}
              y={annotation.y - 4}
              width={annotation.width + 8}
              height={annotation.height + 8}
              fill="none"
              stroke="#4f46e5"
              strokeWidth={Math.max(1.5, strokeWidth * 0.4)}
              strokeDasharray="4 3"
              rx={4}
              opacity={0.9}
              pointerEvents="none"
            />
          )}

          {/* Visible rectangle */}
          <rect
            className={isDraft ? 'fn-draft-rectangle' : undefined}
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

    case 'arrow': {
      const geom = calculateArrowGeometry(annotation.start, annotation.end, strokeWidth);
      const head = geom.head;
      const headPath = `M ${head.tip.x} ${head.tip.y} L ${head.leftBarb.x} ${head.leftBarb.y} L ${head.rightBarb.x} ${head.rightBarb.y} Z`;

      return (
        <g>
          {/* Enlarged invisible hit target along the shaft */}
          <line
            x1={annotation.start.x}
            y1={annotation.start.y}
            x2={annotation.end.x}
            y2={annotation.end.y}
            stroke="transparent"
            strokeWidth={Math.max(strokeWidth + 20, 26)}
            strokeLinecap="round"
          />

          {/* Editor-only selection indicators (control rings at tail and tip) */}
          {isSelected && (
            <g pointerEvents="none">
              <line
                x1={annotation.start.x}
                y1={annotation.start.y}
                x2={annotation.end.x}
                y2={annotation.end.y}
                stroke="#4f46e5"
                strokeWidth={strokeWidth + 6}
                strokeLinecap="round"
                opacity={0.3}
              />
              <circle
                cx={annotation.start.x}
                cy={annotation.start.y}
                r={5}
                fill="#4f46e5"
                stroke="#ffffff"
                strokeWidth={2}
              />
              <circle
                cx={annotation.end.x}
                cy={annotation.end.y}
                r={5}
                fill="#4f46e5"
                stroke="#ffffff"
                strokeWidth={2}
              />
            </g>
          )}

          {/* Visible Shaft */}
          <line
            x1={geom.start.x}
            y1={geom.start.y}
            x2={geom.end.x}
            y2={geom.end.y}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Visible Arrowhead */}
          <path
            d={headPath}
            fill={strokeColor}
            stroke={strokeColor}
            strokeWidth={Math.min(2, strokeWidth * 0.5)}
            strokeLinejoin="round"
          />
        </g>
      );
    }

    case 'pin': {
      const pinNumber = getPinDisplayNumber(annotation.id, allAnnotations);
      const radius = PIN_RADIUS;

      return (
        <g
          role="button"
          tabIndex={0}
          aria-label={`Comment pin ${pinNumber}: ${annotation.text ? annotation.text : 'No feedback entered'}`}
        >
          {/* Enlarged invisible hit target */}
          <circle
            cx={annotation.x}
            cy={annotation.y}
            r={radius + 8}
            fill="transparent"
            stroke="transparent"
          />

          {/* Editor-only selection halo */}
          {isSelected && (
            <circle
              cx={annotation.x}
              cy={annotation.y}
              r={radius + 5}
              fill="none"
              stroke="#4f46e5"
              strokeWidth={2}
              strokeDasharray="4 2"
              pointerEvents="none"
            />
          )}

          {/* Pin circular marker */}
          <circle
            cx={annotation.x}
            cy={annotation.y}
            r={radius}
            fill={annotation.color}
            stroke="#ffffff"
            strokeWidth={2.5}
            style={{
              filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.35))',
            }}
          />

          {/* Centered Number text */}
          <text
            x={annotation.x}
            y={annotation.y}
            fill="#ffffff"
            fontSize={12}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="central"
            pointerEvents="none"
          >
            {pinNumber}
          </text>
        </g>
      );
    }

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
          <circle cx={annotation.x} cy={annotation.y} r={PIN_RADIUS} fill={strokeColor} />
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
