import { useCallback, useState } from 'react';
import type { Dimensions, Point } from '../types/geometry';
import type { ViewportState } from '../types/viewport';
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from '../types/viewport';
import {
  calculateFitToViewport,
  zoomAtFocalPoint,
} from '../core/coordinates/coordinateTransforms';

export function useViewport() {
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);

  const fitToScreen = useCallback((image: Dimensions, container: Dimensions) => {
    const fitted = calculateFitToViewport(image, container);
    setViewport(fitted);
  }, []);

  const resetZoom = useCallback((image?: Dimensions, container?: Dimensions) => {
    if (image && container) {
      setViewport({
        zoom: 1,
        pan: {
          x: Math.round((container.width - image.width) / 2),
          y: Math.round((container.height - image.height) / 2),
        },
      });
    } else {
      setViewport((prev) => ({
        ...prev,
        zoom: 1,
      }));
    }
  }, []);

  const zoomIn = useCallback((focalPoint?: Point) => {
    setViewport((prev) => {
      const nextZoom = Math.min(prev.zoom + ZOOM_STEP, MAX_ZOOM);
      if (focalPoint) {
        return zoomAtFocalPoint(prev, nextZoom, focalPoint);
      }
      return { ...prev, zoom: nextZoom };
    });
  }, []);

  const zoomOut = useCallback((focalPoint?: Point) => {
    setViewport((prev) => {
      const nextZoom = Math.max(prev.zoom - ZOOM_STEP, MIN_ZOOM);
      if (focalPoint) {
        return zoomAtFocalPoint(prev, nextZoom, focalPoint);
      }
      return { ...prev, zoom: nextZoom };
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

  const updatePanning = useCallback((screenPoint: Point) => {
    if (!isPanning || !panStart) return;
    const deltaX = screenPoint.x - panStart.x;
    const deltaY = screenPoint.y - panStart.y;
    setViewport((prev) => ({
      ...prev,
      pan: {
        x: prev.pan.x + deltaX,
        y: prev.pan.y + deltaY,
      },
    }));
    setPanStart(screenPoint);
  }, [isPanning, panStart]);

  const stopPanning = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLElement>, containerRect: DOMRect) => {
      e.preventDefault();
      const focalPoint: Point = {
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top,
      };

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom on touchpad or Ctrl+wheel
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        setViewport((prev) => zoomAtFocalPoint(prev, prev.zoom * factor, focalPoint));
      } else {
        // Standard 2D pan with mouse wheel / touchpad trackpad
        setViewport((prev) => ({
          ...prev,
          pan: {
            x: prev.pan.x - e.deltaX,
            y: prev.pan.y - e.deltaY,
          },
        }));
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
    resetZoom,
    zoomIn,
    zoomOut,
    setZoom,
    handleWheel,
  };
}
