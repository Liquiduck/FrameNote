import { useCallback, useState } from 'react';
import type { Dimensions, Point } from '../types/geometry';
import type { ViewportState } from '../types/viewport';
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from '../types/viewport';
import {
  calculateActualSize,
  calculateFitToViewport,
  clampPanToBounds,
  zoomAtFocalPoint,
  zoomViewportCentered,
} from '../core/coordinates/coordinateTransforms';

export function useViewport() {
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);

  /**
   * Fits and centers the image comfortably inside the container,
   * capping initial scale at 1.0 so low-resolution screenshots are not pixelated.
   */
  const fitToScreen = useCallback((image: Dimensions, container: Dimensions) => {
    const fitted = calculateFitToViewport(image, container);
    setViewport(fitted);
  }, []);

  /**
   * Sets actual 1:1 scale (1 image pixel = 1 CSS pixel, zoom = 1.0),
   * centered and clamped within the container.
   */
  const actualSize = useCallback((image: Dimensions, container: Dimensions) => {
    const actual = calculateActualSize(image, container);
    setViewport(actual);
  }, []);

  /**
   * Zoom in by ZOOM_STEP (+10%).
   * If container is passed, preserves the point at the viewport center.
   * If a focalPoint is passed, preserves that point.
   */
  const zoomIn = useCallback((container?: Dimensions, image?: Dimensions, focalPoint?: Point) => {
    setViewport((prev) => {
      const targetZoom = Math.min(prev.zoom + ZOOM_STEP, MAX_ZOOM);
      if (focalPoint) {
        const zoomed = zoomAtFocalPoint(prev, targetZoom, focalPoint);
        return image && container
          ? { zoom: zoomed.zoom, pan: clampPanToBounds(zoomed.pan, zoomed.zoom, image, container) }
          : zoomed;
      }
      if (container) {
        return zoomViewportCentered(prev, targetZoom, container, image);
      }
      return { ...prev, zoom: targetZoom };
    });
  }, []);

  /**
   * Zoom out by ZOOM_STEP (-10%).
   * If container is passed, preserves the point at the viewport center.
   * If a focalPoint is passed, preserves that point.
   */
  const zoomOut = useCallback((container?: Dimensions, image?: Dimensions, focalPoint?: Point) => {
    setViewport((prev) => {
      const targetZoom = Math.max(prev.zoom - ZOOM_STEP, MIN_ZOOM);
      if (focalPoint) {
        const zoomed = zoomAtFocalPoint(prev, targetZoom, focalPoint);
        return image && container
          ? { zoom: zoomed.zoom, pan: clampPanToBounds(zoomed.pan, zoomed.zoom, image, container) }
          : zoomed;
      }
      if (container) {
        return zoomViewportCentered(prev, targetZoom, container, image);
      }
      return { ...prev, zoom: targetZoom };
    });
  }, []);

  const setZoom = useCallback((zoomValue: number) => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.min(Math.max(zoomValue, MIN_ZOOM), MAX_ZOOM),
    }));
  }, []);

  const startPanning = useCallback((screenPoint: Point) => {
    setIsPanning(true);
    setPanStart(screenPoint);
  }, []);

  const updatePanning = useCallback((
    screenPoint: Point,
    bounds?: { image?: Dimensions; container?: Dimensions }
  ) => {
    if (!panStart) return;
    const deltaX = screenPoint.x - panStart.x;
    const deltaY = screenPoint.y - panStart.y;

    setViewport((prev) => {
      const rawPan = {
        x: prev.pan.x + deltaX,
        y: prev.pan.y + deltaY,
      };

      if (bounds?.image && bounds?.container) {
        return {
          ...prev,
          pan: clampPanToBounds(rawPan, prev.zoom, bounds.image, bounds.container),
        };
      }

      return {
        ...prev,
        pan: rawPan,
      };
    });

    setPanStart(screenPoint);
  }, [panStart]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, []);

  /**
   * Wheel handler scoped to workspace.
   * Only intercepts (calls e.preventDefault()) when Ctrl/Cmd is pressed for zooming around pointer.
   * Does NOT hijack ordinary page scrolling when Ctrl/Cmd is not active.
   */
  const handleWheel = useCallback(
    (
      e: React.WheelEvent<HTMLElement>,
      containerRect: DOMRect,
      image?: Dimensions
    ) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const focalPoint: Point = {
          x: e.clientX - containerRect.left,
          y: e.clientY - containerRect.top,
        };

        // Smooth zoom step proportional to delta
        const zoomDelta = e.deltaY < 0 ? 1.1 : 0.9;
        const container: Dimensions = {
          width: containerRect.width,
          height: containerRect.height,
        };

        setViewport((prev) => {
          const targetZoom = prev.zoom * zoomDelta;
          const zoomed = zoomAtFocalPoint(prev, targetZoom, focalPoint);
          if (image) {
            return {
              zoom: zoomed.zoom,
              pan: clampPanToBounds(zoomed.pan, zoomed.zoom, image, container),
            };
          }
          return zoomed;
        });
      }
    },
    []
  );

  return {
    viewport,
    setViewport,
    isPanning,
    startPanning,
    updatePanning,
    stopPanning,
    fitToScreen,
    actualSize,
    resetZoom: actualSize, // backward compatible alias
    zoomIn,
    zoomOut,
    setZoom,
    handleWheel,
  };
}
