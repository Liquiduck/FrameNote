import type { Dimensions, Point } from '../../types/geometry';
import type { Annotation, PinAnnotation } from '../../types/annotation';
import { ANNOTATION_COLORS, createAnnotationId } from './rectangleGeometry';

/**
 * Standard radius of numbered pin marker in image coordinates.
 * Diameter = 28px.
 */
export const PIN_RADIUS = 14;

/**
 * Clamps pin center coordinates inside image bounds so the circle marker
 * is never clipped at the edges.
 */
export function clampPinToImageBounds(
  point: Point,
  dimensions: Dimensions,
  radius = PIN_RADIUS
): Point {
  const minX = radius;
  const maxX = Math.max(radius, dimensions.width - radius);
  const minY = radius;
  const maxY = Math.max(radius, dimensions.height - radius);

  return {
    x: Math.round(Math.max(minX, Math.min(point.x, maxX))),
    y: Math.round(Math.max(minY, Math.min(point.y, maxY))),
  };
}

/**
 * Retrieves all PinAnnotations in chronological / document order.
 */
export function getAllPins(annotations: readonly Annotation[]): PinAnnotation[] {
  return annotations.filter((a): a is PinAnnotation => a.type === 'pin');
}

/**
 * Derives a dynamic 1-based display number for a pin from the ordered list of pin annotations.
 * Numbers are not stored as IDs and update automatically upon deletion.
 */
export function getPinDisplayNumber(
  pinId: string,
  annotations: readonly Annotation[]
): number {
  const pins = getAllPins(annotations);
  const index = pins.findIndex((p) => p.id === pinId);
  return index >= 0 ? index + 1 : 1;
}

/**
 * Creates a new PinAnnotation at image coordinates with a stable ID.
 */
export function createPinAnnotation(
  point: Point,
  text = '',
  color: string = ANNOTATION_COLORS[0].value,
  strokeWidth = 2
): PinAnnotation {
  return {
    id: createAnnotationId(),
    type: 'pin',
    createdAt: Date.now(),
    color,
    strokeWidth,
    x: Math.round(point.x),
    y: Math.round(point.y),
    text,
  };
}
