import { useCallback, useRef, useState } from 'react';
import type { AnnotationTool, RectangleAnnotation } from '../types/annotation';
import type { Dimensions, Point } from '../types/geometry';
import { clientToImageCoordinates } from '../core/coordinates/coordinateTransforms';
import {
  createRectangleAnnotation,
  isValidRectangleDrag,
  normalizeRectangle,
} from '../core/annotation/rectangleGeometry';

interface UseRectangleDrawingOptions {
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  imageDimensions: Dimensions;
  onCommitAnnotation: (annotation: RectangleAnnotation) => void;
}

export function useRectangleDrawing({
  activeTool,
  activeColor,
  activeStrokeWidth,
  imageDimensions,
  onCommitAnnotation,
}: UseRectangleDrawingOptions) {
  const [draftAnnotation, setDraftAnnotation] = useState<RectangleAnnotation | null>(null);

  const isDrawingRef = useRef(false);
  const startImagePointRef = useRef<Point | null>(null);
  const startScreenPointRef = useRef<Point | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const cancelDrawing = useCallback(() => {
    isDrawingRef.current = false;
    startImagePointRef.current = null;
    startScreenPointRef.current = null;
    pointerIdRef.current = null;
    setDraftAnnotation(null);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Only trigger when rectangle tool is active and primary button is pressed
      if (activeTool !== 'rectangle' || e.button !== 0) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const svgElement = e.currentTarget;
      pointerIdRef.current = e.pointerId;
      try {
        svgElement.setPointerCapture(e.pointerId);
      } catch {
        // Fallback if browser doesn't support capture on SVG in certain configurations
      }

      const screenPt: Point = { x: e.clientX, y: e.clientY };
      const imagePt = clientToImageCoordinates(screenPt, svgElement, imageDimensions, true);

      isDrawingRef.current = true;
      startImagePointRef.current = imagePt;
      startScreenPointRef.current = screenPt;
      setDraftAnnotation(null);
    },
    [activeTool, imageDimensions]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDrawingRef.current || !startImagePointRef.current || !startScreenPointRef.current) {
        return;
      }

      e.preventDefault();
      const svgElement = e.currentTarget;
      const screenPt: Point = { x: e.clientX, y: e.clientY };
      const currentImagePt = clientToImageCoordinates(screenPt, svgElement, imageDimensions, true);

      const normalized = normalizeRectangle(startImagePointRef.current, currentImagePt);

      // Only display the visual draft if drag exceeds tiny-drag screen threshold
      const isValid = isValidRectangleDrag(startScreenPointRef.current, screenPt, normalized);
      if (isValid) {
        setDraftAnnotation({
          id: 'draft-rectangle',
          type: 'rectangle',
          createdAt: 0,
          color: activeColor,
          strokeWidth: activeStrokeWidth,
          fill: 'transparent',
          x: normalized.x,
          y: normalized.y,
          width: normalized.width,
          height: normalized.height,
        });
      } else {
        setDraftAnnotation(null);
      }
    },
    [activeColor, activeStrokeWidth, imageDimensions]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDrawingRef.current || !startImagePointRef.current || !startScreenPointRef.current) {
        return;
      }

      e.preventDefault();
      const svgElement = e.currentTarget;

      if (pointerIdRef.current !== null) {
        try {
          svgElement.releasePointerCapture(pointerIdRef.current);
        } catch {
          // Ignore release errors
        }
      }

      const screenPt: Point = { x: e.clientX, y: e.clientY };
      const currentImagePt = clientToImageCoordinates(screenPt, svgElement, imageDimensions, true);
      const normalized = normalizeRectangle(startImagePointRef.current, currentImagePt);

      // Check if the gesture passed the tiny drag threshold
      if (isValidRectangleDrag(startScreenPointRef.current, screenPt, normalized)) {
        const committed = createRectangleAnnotation(
          normalized,
          activeColor,
          activeStrokeWidth,
          'transparent'
        );
        onCommitAnnotation(committed);
      }

      cancelDrawing();
    },
    [activeColor, activeStrokeWidth, cancelDrawing, imageDimensions, onCommitAnnotation]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (pointerIdRef.current !== null) {
        try {
          e.currentTarget.releasePointerCapture(pointerIdRef.current);
        } catch {
          // Ignore release errors
        }
      }
      cancelDrawing();
    },
    [cancelDrawing]
  );

  return {
    draftAnnotation,
    isDrawing: isDrawingRef.current,
    cancelDrawing,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}
