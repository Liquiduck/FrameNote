import type { Annotation } from '../../types/annotation';
import type { LoadedImage } from '../../types/document';
import type { ViewportState } from '../../types/viewport';

interface CanvasViewportProps {
  image: LoadedImage;
  annotations: readonly Annotation[];
  selectedAnnotationId: string | null;
  viewport: ViewportState;
  onSelectAnnotation: (id: string | null) => void;
}

export function CanvasViewport({
  image,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  viewport,
}: CanvasViewportProps) {
  const transformStyle = {
    transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
  };

  return (
    <div className="fn-viewport-stage" style={transformStyle}>
      <div
        className="fn-image-canvas-wrapper"
        style={{
          width: image.width,
          height: image.height,
        }}
      >
        {/* Base Screenshot Image */}
        <img
          src={image.src}
          alt={image.name}
          width={image.width}
          height={image.height}
          className="fn-base-image"
        />

        {/* SVG Overlay: Uses native image pixel coordinates via viewBox */}
        <svg
          className="fn-svg-overlay"
          viewBox={`0 0 ${image.width} ${image.height}`}
          width={image.width}
          height={image.height}
          xmlns="http://www.w3.org/2000/svg"
        >
          {annotations.map((annotation) => {
            const isSelected = annotation.id === selectedAnnotationId;
            return (
              <g
                key={annotation.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnnotation(annotation.id);
                }}
                style={{ cursor: 'pointer' }}
              >
                {renderSvgAnnotation(annotation, isSelected)}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/**
 * Render individual annotations inside the SVG coordinate space (original image pixels).
 */
function renderSvgAnnotation(annotation: Annotation, isSelected: boolean) {
  const strokeColor = isSelected ? 'var(--fn-indigo-500)' : annotation.color;
  const strokeWidth = annotation.strokeWidth;

  switch (annotation.type) {
    case 'rectangle':
      return (
        <rect
          x={annotation.x}
          y={annotation.y}
          width={annotation.width}
          height={annotation.height}
          fill={annotation.fill ?? 'none'}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={isSelected ? '4 2' : undefined}
          rx={4}
        />
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
