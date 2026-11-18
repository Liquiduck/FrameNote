import type { Annotation, ArrowAnnotation, PinAnnotation, RectangleAnnotation } from '../../types/annotation';
import type { Dimensions, Point } from '../../types/geometry';
import { PIN_RADIUS } from './pinGeometry';

/**
 * Calculates new annotation position from an initial geometry snapshot and pointer displacement.
 * Clamps coordinates strictly within image boundaries while preserving exact shape dimensions.
 */
export function moveAnnotation<T extends Annotation>(
  initial: T,
  delta: Point,
  imageBounds: Dimensions
): T {
  switch (initial.type) {
    case 'rectangle': {
      const rect = initial as unknown as RectangleAnnotation;
      const maxX = Math.max(0, imageBounds.width - rect.width);
      const maxY = Math.max(0, imageBounds.height - rect.height);

      const unclampedX = rect.x + delta.x;
      const unclampedY = rect.y + delta.y;

      const clampedX = Math.round(Math.max(0, Math.min(unclampedX, maxX)));
      const clampedY = Math.round(Math.max(0, Math.min(unclampedY, maxY)));

      return {
        ...rect,
        x: clampedX,
        y: clampedY,
      } as unknown as T;
    }

    case 'arrow': {
      const arrow = initial as unknown as ArrowAnnotation;
      const minX = Math.min(arrow.start.x, arrow.end.x);
      const maxX = Math.max(arrow.start.x, arrow.end.x);
      const minY = Math.min(arrow.start.y, arrow.end.y);
      const maxY = Math.max(arrow.start.y, arrow.end.y);

      // Clamp displacement so neither endpoint crosses image boundaries
      const minAllowedDx = -minX;
      const maxAllowedDx = Math.max(0, imageBounds.width - maxX);
      const minAllowedDy = -minY;
      const maxAllowedDy = Math.max(0, imageBounds.height - maxY);

      const clampedDx = Math.round(Math.max(minAllowedDx, Math.min(delta.x, maxAllowedDx)));
      const clampedDy = Math.round(Math.max(minAllowedDy, Math.min(delta.y, maxAllowedDy)));

      return {
        ...arrow,
        start: {
          x: arrow.start.x + clampedDx,
          y: arrow.start.y + clampedDy,
        },
        end: {
          x: arrow.end.x + clampedDx,
          y: arrow.end.y + clampedDy,
        },
      } as unknown as T;
    }

    case 'pin': {
      const pin = initial as unknown as PinAnnotation;
      const minX = PIN_RADIUS;
      const maxX = Math.max(PIN_RADIUS, imageBounds.width - PIN_RADIUS);
      const minY = PIN_RADIUS;
      const maxY = Math.max(PIN_RADIUS, imageBounds.height - PIN_RADIUS);

      const unclampedX = pin.x + delta.x;
      const unclampedY = pin.y + delta.y;

      const clampedX = Math.round(Math.max(minX, Math.min(unclampedX, maxX)));
      const clampedY = Math.round(Math.max(minY, Math.min(unclampedY, maxY)));

      return {
        ...pin,
        x: clampedX,
        y: clampedY,
      } as unknown as T;
    }

    default:
      return initial;
  }
}

/**
 * Distance from a point P to a line segment AB.
 */
export function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * (b.x - a.x);
  const projY = a.y + t * (b.y - a.y);

  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Hit test for an individual annotation with enlarged hit radius for thin elements.
 */
export function isPointInsideAnnotation(
  point: Point,
  annotation: Annotation,
  minHitRadius = 12
): boolean {
  switch (annotation.type) {
    case 'rectangle': {
      const strokeMargin = Math.max(minHitRadius, annotation.strokeWidth / 2);
      return (
        point.x >= annotation.x - strokeMargin &&
        point.x <= annotation.x + annotation.width + strokeMargin &&
        point.y >= annotation.y - strokeMargin &&
        point.y <= annotation.y + annotation.height + strokeMargin
      );
    }

    case 'arrow': {
      const hitRadius = Math.max(minHitRadius, annotation.strokeWidth * 1.8);
      return distancePointToSegment(point, annotation.start, annotation.end) <= hitRadius;
    }

    case 'pin': {
      const hitRadius = Math.max(PIN_RADIUS, minHitRadius);
      return Math.hypot(point.x - annotation.x, point.y - annotation.y) <= hitRadius;
    }

    default:
      return false;
  }
}

/**
 * Finds the topmost annotation under a given image point.
 * Iterates in reverse order (top of visual stack first).
 */
export function findTopmostAnnotationAtPoint(
  point: Point,
  annotations: readonly Annotation[],
  minHitRadius = 12
): Annotation | null {
  for (let i = annotations.length - 1; i >= 0; i--) {
    const ann = annotations[i]!;
    if (isPointInsideAnnotation(point, ann, minHitRadius)) {
      return ann;
    }
  }
  return null;
}
