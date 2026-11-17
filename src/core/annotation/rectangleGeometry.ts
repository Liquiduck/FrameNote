import type { Point, Rect } from '../../types/geometry';
import type { RectangleAnnotation } from '../../types/annotation';

/**
 * Screen pixel threshold: dragging fewer screen pixels is treated as an accidental click
 * and rejected.
 */
export const MIN_DRAG_DISTANCE_SCREEN_PX = 4;

/**
 * Minimum rectangle dimensions in image pixels to avoid zero-area or invisible boxes.
 */
export const MIN_RECT_SIZE_IMAGE_PX = 2;

/**
 * Curated preset colors for annotations.
 */
export const ANNOTATION_COLORS = [
  { id: 'indigo', label: 'Indigo', value: '#4f46e5' },
  { id: 'coral', label: 'Coral', value: '#ef4444' },
  { id: 'amber', label: 'Amber', value: '#f59e0b' },
  { id: 'emerald', label: 'Emerald', value: '#10b981' },
  { id: 'sky', label: 'Sky', value: '#0ea5e9' },
  { id: 'white', label: 'White', value: '#ffffff' },
] as const;

export type PresetColor = (typeof ANNOTATION_COLORS)[number]['value'];

/**
 * Stroke width presets stored directly in native image units (pixels).
 * These ensure constant geometry across zoom levels and export resolutions.
 */
export const STROKE_WIDTH_PRESETS = [
  { id: 'thin', label: 'Thin', value: 2 },
  { id: 'medium', label: 'Medium', value: 4 },
  { id: 'bold', label: 'Bold', value: 8 },
  { id: 'heavy', label: 'Heavy', value: 12 },
] as const;

export type StrokeWidthPreset = (typeof STROKE_WIDTH_PRESETS)[number]['value'];

/**
 * Generates a stable unique identifier for annotations.
 */
export function createAnnotationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ann-${crypto.randomUUID()}`;
  }
  return `ann-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Normalizes two arbitrary points (start and current) into a standard rectangle
 * with non-negative width, non-negative height, and top-left coordinates.
 * Handles dragging in all 4 diagonal directions.
 */
export function normalizeRectangle(start: Point, current: Point): Rect {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);

  return { x, y, width, height };
}

/**
 * Calculates Euclidean distance between two screen coordinates.
 */
export function calculateScreenDistance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Evaluates whether a drag gesture exceeds the tiny-drag screen threshold
 * and meets the minimum size requirements in image space.
 */
export function isValidRectangleDrag(
  startScreenPoint: Point,
  currentScreenPoint: Point,
  normalizedRect: Rect,
  minScreenDistance = MIN_DRAG_DISTANCE_SCREEN_PX,
  minImageDimension = MIN_RECT_SIZE_IMAGE_PX
): boolean {
  const screenDist = calculateScreenDistance(startScreenPoint, currentScreenPoint);
  if (screenDist < minScreenDistance) {
    return false;
  }

  if (normalizedRect.width < minImageDimension || normalizedRect.height < minImageDimension) {
    return false;
  }

  return true;
}

/**
 * Factory for creating a validated RectangleAnnotation.
 */
export function createRectangleAnnotation(
  rect: Rect,
  color: string = ANNOTATION_COLORS[0].value,
  strokeWidth: number = STROKE_WIDTH_PRESETS[1].value,
  fill = 'transparent'
): RectangleAnnotation {
  return {
    id: createAnnotationId(),
    type: 'rectangle',
    createdAt: Date.now(),
    color,
    strokeWidth,
    fill,
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}
