import { describe, expect, it } from 'vitest';
import {
  distancePointToSegment,
  findTopmostAnnotationAtPoint,
  isPointInsideAnnotation,
  moveAnnotation,
} from './movement';
import type { ArrowAnnotation, RectangleAnnotation } from '../../types/annotation';
import type { Dimensions, Point } from '../../types/geometry';

describe('Movement & Hit-Testing', () => {
  const imageBounds: Dimensions = { width: 1000, height: 800 };

  describe('Movement Bounds for Rectangles', () => {
    const rect: RectangleAnnotation = {
      id: 'rect-1',
      type: 'rectangle',
      createdAt: 1000,
      color: '#4f46e5',
      strokeWidth: 4,
      x: 200,
      y: 150,
      width: 300,
      height: 200,
    };

    it('translates rectangle by displacement delta', () => {
      const delta: Point = { x: 50, y: 70 };
      const moved = moveAnnotation(rect, delta, imageBounds);

      expect(moved.x).toBe(250);
      expect(moved.y).toBe(220);
      // Dimensions must remain strictly identical
      expect(moved.width).toBe(300);
      expect(moved.height).toBe(200);
    });

    it('clamps rectangle to left and top edges (0, 0)', () => {
      const delta: Point = { x: -300, y: -200 };
      const moved = moveAnnotation(rect, delta, imageBounds);

      expect(moved.x).toBe(0);
      expect(moved.y).toBe(0);
      expect(moved.width).toBe(300);
      expect(moved.height).toBe(200);
    });

    it('clamps rectangle to right and bottom edges (width - rect.width, height - rect.height)', () => {
      const delta: Point = { x: 900, y: 900 };
      const moved = moveAnnotation(rect, delta, imageBounds);

      // max X = 1000 - 300 = 700
      // max Y = 800 - 200 = 600
      expect(moved.x).toBe(700);
      expect(moved.y).toBe(600);
      expect(moved.width).toBe(300);
      expect(moved.height).toBe(200);
    });
  });

  describe('Movement Bounds for Arrows', () => {
    const arrow: ArrowAnnotation = {
      id: 'arrow-1',
      type: 'arrow',
      createdAt: 1000,
      color: '#ef4444',
      strokeWidth: 4,
      start: { x: 200, y: 300 },
      end: { x: 400, y: 500 },
    };

    it('moves arrow while preserving vector length and angle', () => {
      const delta: Point = { x: 50, y: -80 };
      const moved = moveAnnotation(arrow, delta, imageBounds);

      expect(moved.start).toEqual({ x: 250, y: 220 });
      expect(moved.end).toEqual({ x: 450, y: 420 });

      // Invariant: dx and dy between start and end must remain unchanged
      expect(moved.end.x - moved.start.x).toBe(arrow.end.x - arrow.start.x);
      expect(moved.end.y - moved.start.y).toBe(arrow.end.y - arrow.start.y);
    });

    it('clamps displacement so neither endpoint crosses image boundaries', () => {
      // Dragging far left-up
      const deltaLeftUp: Point = { x: -300, y: -400 };
      const movedLeftUp = moveAnnotation(arrow, deltaLeftUp, imageBounds);

      expect(movedLeftUp.start.x).toBeGreaterThanOrEqual(0);
      expect(movedLeftUp.start.y).toBeGreaterThanOrEqual(0);
      expect(movedLeftUp.end.x).toBeGreaterThanOrEqual(0);
      expect(movedLeftUp.end.y).toBeGreaterThanOrEqual(0);
      expect(movedLeftUp.end.x - movedLeftUp.start.x).toBe(200);
      expect(movedLeftUp.end.y - movedLeftUp.start.y).toBe(200);

      // Dragging far right-down
      const deltaRightDown: Point = { x: 800, y: 800 };
      const movedRightDown = moveAnnotation(arrow, deltaRightDown, imageBounds);

      expect(movedRightDown.end.x).toBeLessThanOrEqual(1000);
      expect(movedRightDown.end.y).toBeLessThanOrEqual(800);
      expect(movedRightDown.end.x - movedRightDown.start.x).toBe(200);
      expect(movedRightDown.end.y - movedRightDown.start.y).toBe(200);
    });
  });

  describe('Hit Testing & Topmost Selection', () => {
    const rectBottom: RectangleAnnotation = {
      id: 'rect-bottom',
      type: 'rectangle',
      createdAt: 1000,
      color: '#4f46e5',
      strokeWidth: 4,
      x: 100,
      y: 100,
      width: 300,
      height: 200,
    };

    const rectTop: RectangleAnnotation = {
      id: 'rect-top',
      type: 'rectangle',
      createdAt: 2000,
      color: '#ef4444',
      strokeWidth: 4,
      x: 200,
      y: 150,
      width: 300,
      height: 200,
    };

    const arrow: ArrowAnnotation = {
      id: 'arrow-top',
      type: 'arrow',
      createdAt: 3000,
      color: '#10b981',
      strokeWidth: 2, // thin 2px arrow
      start: { x: 50, y: 500 },
      end: { x: 450, y: 500 },
    };

    it('detects hits on rectangle interior and perimeter', () => {
      expect(isPointInsideAnnotation({ x: 250, y: 200 }, rectBottom)).toBe(true);
      expect(isPointInsideAnnotation({ x: 50, y: 50 }, rectBottom)).toBe(false);
    });

    it('includes enlarged invisible hit targets for thin arrows', () => {
      // Point (250, 508) is 8px away from the 2px thin line at y=500
      // Native line stroke radius is 1px, but enlarged hit target is >= 12px
      expect(distancePointToSegment({ x: 250, y: 508 }, arrow.start, arrow.end)).toBe(8);
      expect(isPointInsideAnnotation({ x: 250, y: 508 }, arrow)).toBe(true);

      // Point (250, 550) is 50px away: outside hit area
      expect(isPointInsideAnnotation({ x: 250, y: 550 }, arrow)).toBe(false);
    });

    it('selects the topmost annotation when annotations overlap', () => {
      const annotations = [rectBottom, rectTop, arrow];

      // Point (250, 180) is inside both rectBottom and rectTop
      // rectTop is later in array (rendered on top), so it must be selected
      const hit = findTopmostAnnotationAtPoint({ x: 250, y: 180 }, annotations);
      expect(hit?.id).toBe('rect-top');
    });

    it('returns null when clicking empty canvas space', () => {
      const annotations = [rectBottom, rectTop, arrow];
      const hit = findTopmostAnnotationAtPoint({ x: 800, y: 50 }, annotations);
      expect(hit).toBeNull();
    });
  });

  describe('Cancelled Movement', () => {
    it('restores pre-drag geometry when drag movement is cancelled', () => {
      const initialRect: RectangleAnnotation = {
        id: 'rect-cancel',
        type: 'rectangle',
        createdAt: 1000,
        color: '#4f46e5',
        strokeWidth: 4,
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      };

      let currentDocumentAnnotation = initialRect;
      let transientPreview: RectangleAnnotation | null = null;

      // Start drag: delta (50, 40)
      transientPreview = moveAnnotation(initialRect, { x: 50, y: 40 }, imageBounds);
      expect(transientPreview.x).toBe(150);
      expect(transientPreview.y).toBe(140);
      // Document state has NOT changed
      expect(currentDocumentAnnotation.x).toBe(100);

      // Cancel movement (Escape / pointercancel)
      transientPreview = null;

      // Pre-drag geometry remains intact
      expect(currentDocumentAnnotation).toEqual(initialRect);
    });
  });
});
