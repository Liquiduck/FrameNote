import type { Dimensions, Point } from '../../types/geometry';
import type { ViewportState } from '../../types/viewport';
import { MAX_ZOOM, MIN_ZOOM } from '../../types/viewport';

/**
 * Minimum margin (in screen pixels) of the image that must remain visible inside the container.
 * Prevents the image from being panned irretrievably out of view.
 */
export const MIN_VISIBLE_MARGIN = 64;

/**
 * Converts a point in viewport/screen pixel space to the original unscaled image pixel space
 * given an analytical ViewportState.
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
 * Converts screen/client coordinates (e.g., from PointerEvent.clientX / clientY)
 * to exact unscaled image coordinates using the SVG element's Screen CTM (or bounding rect).
 *
 * This accounts for:
 * 1. SVG viewBox to image pixel mapping (1:1 with decoded image).
 * 2. Current zoom scale and pan offset transforms.
 * 3. Element position on screen and window scrolling.
 * 4. Device pixel ratio.
 */
export function clientToImageCoordinates(
  clientPoint: Point,
  svgElement: SVGSVGElement,
  imageDimensions?: Dimensions,
  clamp = true
): Point {
  let pt: Point;

  const ctm = svgElement.getScreenCTM?.();
  if (ctm && typeof svgElement.createSVGPoint === 'function') {
    try {
      const svgPoint = svgElement.createSVGPoint();
      svgPoint.x = clientPoint.x;
      svgPoint.y = clientPoint.y;
      const transformed = svgPoint.matrixTransform(ctm.inverse());
      pt = { x: transformed.x, y: transformed.y };
    } catch {
      pt = clientToImageViaBoundingRect(clientPoint, svgElement, imageDimensions);
    }
  } else {
    pt = clientToImageViaBoundingRect(clientPoint, svgElement, imageDimensions);
  }

  if (clamp && imageDimensions) {
    return clampToImageBounds(pt, imageDimensions);
  }

  return pt;
}

/**
 * Fallback converter using getBoundingClientRect and viewBox / dimensions.
 * Guaranteed to work in both browsers and headless/jsdom testing environments.
 */
export function clientToImageViaBoundingRect(
  clientPoint: Point,
  svgElement: SVGSVGElement | { getBoundingClientRect: () => DOMRect; viewBox?: { baseVal?: { width?: number; height?: number } } },
  imageDimensions?: Dimensions
): Point {
  const rect = svgElement.getBoundingClientRect();
  const vbWidth =
    svgElement.viewBox?.baseVal?.width && svgElement.viewBox.baseVal.width > 0
      ? svgElement.viewBox.baseVal.width
      : (imageDimensions?.width ?? rect.width);
  const vbHeight =
    svgElement.viewBox?.baseVal?.height && svgElement.viewBox.baseVal.height > 0
      ? svgElement.viewBox.baseVal.height
      : (imageDimensions?.height ?? rect.height);

  const scaleX = rect.width > 0 ? vbWidth / rect.width : 1;
  const scaleY = rect.height > 0 ? vbHeight / rect.height : 1;

  return {
    x: (clientPoint.x - rect.left) * scaleX,
    y: (clientPoint.y - rect.top) * scaleY,
  };
}

/**
 * Clamps pan translation so the image is never panned irretrievably out of view.
 */
export function clampPanToBounds(
  pan: Point,
  zoom: number,
  image: Dimensions,
  container: Dimensions,
  minVisibleMargin = MIN_VISIBLE_MARGIN
): Point {
  if (container.width <= 0 || container.height <= 0 || image.width <= 0 || image.height <= 0) {
    return pan;
  }

  const renderedWidth = image.width * zoom;
  const renderedHeight = image.height * zoom;

  // Ensure at least minVisibleMargin (or total image width/height if smaller) remains visible inside viewport
  const marginX = Math.min(minVisibleMargin, renderedWidth);
  const marginY = Math.min(minVisibleMargin, renderedHeight);

  const minX = -renderedWidth + marginX;
  const maxX = container.width - marginX;
  const minY = -renderedHeight + marginY;
  const maxY = container.height - marginY;

  return {
    x: Math.round(Math.max(minX, Math.min(pan.x, maxX))),
    y: Math.round(Math.max(minY, Math.min(pan.y, maxY))),
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
 * Calculates actual 1:1 scale (one image pixel per CSS pixel, zoom = 1.0)
 * centered within the container.
 */
export function calculateActualSize(
  image: Dimensions,
  container: Dimensions
): ViewportState {
  if (image.width <= 0 || image.height <= 0 || container.width <= 0 || container.height <= 0) {
    return {
      zoom: 1.0,
      pan: { x: 0, y: 0 },
    };
  }

  const panX = (container.width - image.width) / 2;
  const panY = (container.height - image.height) / 2;

  return {
    zoom: 1.0,
    pan: clampPanToBounds({ x: panX, y: panY }, 1.0, image, container),
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
 * Zooms while preserving the point at the center of the viewport container.
 */
export function zoomViewportCentered(
  currentViewport: ViewportState,
  targetZoom: number,
  container: Dimensions,
  image?: Dimensions
): ViewportState {
  const center: Point = {
    x: container.width / 2,
    y: container.height / 2,
  };
  const updated = zoomAtFocalPoint(currentViewport, targetZoom, center);

  if (image && container.width > 0 && container.height > 0) {
    return {
      zoom: updated.zoom,
      pan: clampPanToBounds(updated.pan, updated.zoom, image, container),
    };
  }

  return updated;
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
