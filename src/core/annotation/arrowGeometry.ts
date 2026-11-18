import type { Point } from '../../types/geometry';
import type { ArrowAnnotation } from '../../types/annotation';
import { ANNOTATION_COLORS, STROKE_WIDTH_PRESETS, createAnnotationId } from './rectangleGeometry';

export interface ArrowHeadPoints {
  readonly tip: Point;
  readonly leftBarb: Point;
  readonly rightBarb: Point;
}

export interface ArrowGeometry {
  readonly start: Point;
  readonly end: Point;
  readonly length: number;
  readonly angle: number;
  readonly headLength: number;
  readonly head: ArrowHeadPoints;
}

/**
 * Pure geometry calculation for arrows.
 * Used identically by SVG overlay rendering and Canvas PNG export.
 */
export function calculateArrowGeometry(
  start: Point,
  end: Point,
  strokeWidth: number
): ArrowGeometry {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  // Scaled arrowhead proportional to stroke width with sensible min/max
  const headLength = Math.min(Math.max(14, strokeWidth * 3.5), Math.max(14, length * 0.4));
  const barbAngle = Math.PI / 6; // 30 degrees spread

  const leftBarb: Point = {
    x: end.x - headLength * Math.cos(angle - barbAngle),
    y: end.y - headLength * Math.sin(angle - barbAngle),
  };

  const rightBarb: Point = {
    x: end.x - headLength * Math.cos(angle + barbAngle),
    y: end.y - headLength * Math.sin(angle + barbAngle),
  };

  return {
    start,
    end,
    length,
    angle,
    headLength,
    head: {
      tip: end,
      leftBarb,
      rightBarb,
    },
  };
}

/**
 * Creates an ArrowAnnotation with stable ID and image coordinates.
 */
export function createArrowAnnotation(
  start: Point,
  end: Point,
  color: string = ANNOTATION_COLORS[0].value,
  strokeWidth: number = STROKE_WIDTH_PRESETS[1].value
): ArrowAnnotation {
  return {
    id: createAnnotationId(),
    type: 'arrow',
    createdAt: Date.now(),
    color,
    strokeWidth,
    start: {
      x: Math.round(start.x),
      y: Math.round(start.y),
    },
    end: {
      x: Math.round(end.x),
      y: Math.round(end.y),
    },
  };
}
