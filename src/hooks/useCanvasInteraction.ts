import { useCallback, useRef, useState } from 'react';
import type { Annotation, AnnotationTool } from '../types/annotation';
import type { Dimensions, Point } from '../types/geometry';
import { clientToImageCoordinates } from '../core/coordinates/coordinateTransforms';
import {
  createRectangleAnnotation,
  isValidRectangleDrag,
  normalizeRectangle,
} from '../core/annotation/rectangleGeometry';
import { createArrowAnnotation } from '../core/annotation/arrowGeometry';
import { clampPinToImageBounds, createPinAnnotation } from '../core/annotation/pinGeometry';
import { findTopmostAnnotationAtPoint, moveAnnotation } from '../core/annotation/movement';

interface UseCanvasInteractionOptions {
  activeTool: AnnotationTool;
  activeColor: string;
  activeStrokeWidth: number;
  imageDimensions: Dimensions;
  annotations: readonly Annotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onCommitAnnotation: (annotation: Annotation) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
}

export function useCanvasInteraction({
  activeTool,
  activeColor,
  activeStrokeWidth,
  imageDimensions,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onCommitAnnotation,
  onUpdateAnnotation,
}: UseCanvasInteractionOptions) {
  // Separate draft state for new drawing (rectangle or arrow)
  const [draftAnnotation, setDraftAnnotation] = useState<Annotation | null>(null);

  // Separate transient preview for moving an existing annotation
  const [movingAnnotation, setMovingAnnotation] = useState<Annotation | null>(null);

  const isInteractingRef = useRef(false);
  const interactionModeRef = useRef<'draw' | 'move' | 'pin' | null>(null);
  const startImagePointRef = useRef<Point | null>(null);
  const startScreenPointRef = useRef<Point | null>(null);
  const initialAnnotationRef = useRef<Annotation | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const cancelInteraction = useCallback(() => {
    isInteractingRef.current = false;
    interactionModeRef.current = null;
    startImagePointRef.current = null;
    startScreenPointRef.current = null;
    initialAnnotationRef.current = null;
    pointerIdRef.current = null;
    setDraftAnnotation(null);
    setMovingAnnotation(null);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Primary mouse button or touch/pen only
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      const svgElement = e.currentTarget;
      pointerIdRef.current = e.pointerId;
      try {
        svgElement.setPointerCapture(e.pointerId);
      } catch {
        // Fallback for environments lacking pointer capture
      }

      const screenPt: Point = { x: e.clientX, y: e.clientY };
      const imagePt = clientToImageCoordinates(screenPt, svgElement, imageDimensions, true);

      isInteractingRef.current = true;
      startImagePointRef.current = imagePt;
      startScreenPointRef.current = screenPt;

      if (activeTool === 'select') {
        // Hit test to see if user clicked an existing annotation (topmost first)
        const hit = findTopmostAnnotationAtPoint(imagePt, annotations);
        if (hit) {
          interactionModeRef.current = 'move';
          initialAnnotationRef.current = hit;
          onSelectAnnotation(hit.id);
          setMovingAnnotation(hit);
        } else {
          // Clicked empty space: clear selection
          interactionModeRef.current = null;
          onSelectAnnotation(null);
        }
      } else if (activeTool === 'pin') {
        // Pin tool: immediately place a pin on pointerdown / click
        interactionModeRef.current = 'pin';
        const clampedPoint = clampPinToImageBounds(imagePt, imageDimensions);
        const newPin = createPinAnnotation(clampedPoint, '', activeColor);
        onCommitAnnotation(newPin);
        onSelectAnnotation(newPin.id);
      } else if (activeTool === 'rectangle' || activeTool === 'arrow') {
        interactionModeRef.current = 'draw';
        setDraftAnnotation(null);
      }
    },
    [activeColor, activeTool, annotations, imageDimensions, onCommitAnnotation, onSelectAnnotation]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isInteractingRef.current || !startImagePointRef.current || !startScreenPointRef.current) {
        return;
      }

      e.preventDefault();
      const svgElement = e.currentTarget;
      const screenPt: Point = { x: e.clientX, y: e.clientY };
      const currentImagePt = clientToImageCoordinates(screenPt, svgElement, imageDimensions, true);

      // 1. Moving an existing annotation (rectangle, arrow, or pin)
      if (interactionModeRef.current === 'move' && initialAnnotationRef.current) {
        const delta: Point = {
          x: currentImagePt.x - startImagePointRef.current.x,
          y: currentImagePt.y - startImagePointRef.current.y,
        };

        const moved = moveAnnotation(initialAnnotationRef.current, delta, imageDimensions);
        setMovingAnnotation(moved);
        return;
      }

      // 2. Drawing a new rectangle
      if (interactionModeRef.current === 'draw' && activeTool === 'rectangle') {
        const normalized = normalizeRectangle(startImagePointRef.current, currentImagePt);
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
        return;
      }

      // 3. Drawing a new arrow
      if (interactionModeRef.current === 'draw' && activeTool === 'arrow') {
        const screenDist = Math.hypot(
          screenPt.x - startScreenPointRef.current.x,
          screenPt.y - startScreenPointRef.current.y
        );

        if (screenDist >= 4) {
          setDraftAnnotation({
            id: 'draft-arrow',
            type: 'arrow',
            createdAt: 0,
            color: activeColor,
            strokeWidth: activeStrokeWidth,
            start: startImagePointRef.current,
            end: currentImagePt,
          });
        } else {
          setDraftAnnotation(null);
        }
      }
    },
    [activeColor, activeStrokeWidth, activeTool, imageDimensions]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isInteractingRef.current) return;

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

      // Handle commit for moving
      if (interactionModeRef.current === 'move' && initialAnnotationRef.current && startImagePointRef.current) {
        const delta: Point = {
          x: currentImagePt.x - startImagePointRef.current.x,
          y: currentImagePt.y - startImagePointRef.current.y,
        };

        // Only commit if there was actual movement
        if (delta.x !== 0 || delta.y !== 0) {
          const moved = moveAnnotation(initialAnnotationRef.current, delta, imageDimensions);
          onUpdateAnnotation(moved);
        }
      }

      // Handle commit for drawing rectangle
      if (
        interactionModeRef.current === 'draw' &&
        activeTool === 'rectangle' &&
        startImagePointRef.current &&
        startScreenPointRef.current
      ) {
        const normalized = normalizeRectangle(startImagePointRef.current, currentImagePt);
        if (isValidRectangleDrag(startScreenPointRef.current, screenPt, normalized)) {
          const committed = createRectangleAnnotation(
            normalized,
            activeColor,
            activeStrokeWidth,
            'transparent'
          );
          onCommitAnnotation(committed);
        }
      }

      // Handle commit for drawing arrow
      if (
        interactionModeRef.current === 'draw' &&
        activeTool === 'arrow' &&
        startImagePointRef.current &&
        startScreenPointRef.current
      ) {
        const screenDist = Math.hypot(
          screenPt.x - startScreenPointRef.current.x,
          screenPt.y - startScreenPointRef.current.y
        );

        if (screenDist >= 4) {
          const committed = createArrowAnnotation(
            startImagePointRef.current,
            currentImagePt,
            activeColor,
            activeStrokeWidth
          );
          onCommitAnnotation(committed);
        }
      }

      cancelInteraction();
    },
    [
      activeColor,
      activeStrokeWidth,
      activeTool,
      cancelInteraction,
      imageDimensions,
      onCommitAnnotation,
      onUpdateAnnotation,
    ]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (pointerIdRef.current !== null) {
        try {
          e.currentTarget.releasePointerCapture(pointerIdRef.current);
        } catch {
          // Ignore
        }
      }
      cancelInteraction();
    },
    [cancelInteraction]
  );

  return {
    draftAnnotation,
    movingAnnotation,
    selectedAnnotationId,
    cancelInteraction,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
}
