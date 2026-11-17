import type { Dimensions, Point } from '../../types/geometry';
import type { ViewportState } from '../../types/viewport';
import { MAX_ZOOM, MIN_ZOOM } from '../../types/viewport';

/**
 * Converts a point in viewport/screen pixel space to the original unscaled image pixel space.
 * All annotation geometries MUST be transformed and stored using image coordinates.
 */
export function screenToImageCoordinates(
  screenPoint: Point,
  viewport: ViewportState
): Point {
  if (viewport.zoom <= 0) {
    throw new Error('Viewport zoom must be greater than zero');
  }

  return {
    x: (screenPoint.x - viewport.pan.x) / viewport.zoom,
    y: (screenPoint.y - viewport.pan.y) / viewport.zoom,
  };
}

/**
 * Converts a point from original image pixel space to viewport/screen pixel space.
 */
export function imageToScreenCoordinates(
  imagePoint: Point,
  viewport: ViewportState
): Point {
  return {
    x: viewport.pan.x + imagePoint.x * viewport.zoom,
    y: viewport.pan.y + imagePoint.y * viewport.zoom,
  };
}

/**
 * Calculates zoom level and pan offsets to center an image comfortably within a container.
 */
export function calculateFitToViewport(
  image: Dimensions,
  container: Dimensions,
  padding = 48
): ViewportState {
  if (image.width <= 0 || image.height <= 0 || container.width <= 0 || container.height <= 0) {
    return {
      zoom: 1,
      pan: { x: 0, y: 0 },
    };
  }

  const availableWidth = Math.max(container.width - padding * 2, 40);
  const availableHeight = Math.max(container.height - padding * 2, 40);

  const scaleX = availableWidth / image.width;
  const scaleY = availableHeight / image.height;

  // Fit inside container, capped at 1.0 (100% scale) so small screenshots aren't blurred by default
  const fittedZoom = Math.min(scaleX, scaleY, 1.0);
  const zoom = Math.min(Math.max(fittedZoom, MIN_ZOOM), MAX_ZOOM);

  const renderedWidth = image.width * zoom;
  const renderedHeight = image.height * zoom;

  const panX = (container.width - renderedWidth) / 2;
  const panY = (container.height - renderedHeight) / 2;

  return {
    zoom,
    pan: {
      x: Math.round(panX),
      y: Math.round(panY),
    },
  };
}

/**
 * Zooms into or out of a specific focal point (e.g., mouse cursor position)
 * while preserving the cursor's anchor on the image.
 */
export function zoomAtFocalPoint(
  currentViewport: ViewportState,
  targetZoom: number,
  focalPoint: Point
): ViewportState {
  const clampedZoom = Math.min(Math.max(targetZoom, MIN_ZOOM), MAX_ZOOM);
  if (clampedZoom === currentViewport.zoom) {
    return currentViewport;
  }

  const zoomFactor = clampedZoom / currentViewport.zoom;

  // New pan ensures the image point under the focal cursor remains fixed in screen coordinates
  const newPanX = focalPoint.x - (focalPoint.x - currentViewport.pan.x) * zoomFactor;
  const newPanY = focalPoint.y - (focalPoint.y - currentViewport.pan.y) * zoomFactor;

  return {
    zoom: clampedZoom,
    pan: {
      x: Math.round(newPanX * 100) / 100,
      y: Math.round(newPanY * 100) / 100,
    },
  };
}

/**
 * Clamps coordinates to stay within image boundaries.
 */
export function clampToImageBounds(point: Point, dimensions: Dimensions): Point {
  return {
    x: Math.max(0, Math.min(point.x, dimensions.width)),
    y: Math.max(0, Math.min(point.y, dimensions.height)),
  };
}
