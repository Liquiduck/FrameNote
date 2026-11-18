import { describe, expect, it } from 'vitest';
import {
  distancePointToSegment,
  findTopmostAnnotationAtPoint,
  isPointInsideAnnotation,
  moveAnnotation,
} from './movement';
import type { ArrowAnnotation, PinAnnotation, RectangleAnnotation } from '../../types/annotation';
import type { Dimensions, Point } from '../../types/geometry';
import { PIN_RADIUS } from './pinGeometry';

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

      expect(moved.end.x - moved.start.x).toBe(arrow.end.x - arrow.start.x);
      expect(moved.end.y - moved.start.y).toBe(arrow.end.y - arrow.start.y);
    });

    it('clamps displacement so neither endpoint crosses image boundaries', () => {
      const deltaLeftUp: Point = { x: -300, y: -400 };
      const movedLeftUp = moveAnnotation(arrow, deltaLeftUp, imageBounds);

      expect(movedLeftUp.start.x).toBeGreaterThanOrEqual(0);
      expect(movedLeftUp.start.y).toBeGreaterThanOrEqual(0);
      expect(movedLeftUp.end.x).toBeGreaterThanOrEqual(0);
      expect(movedLeftUp.end.y).toBeGreaterThanOrEqual(0);
      expect(movedLeftUp.end.x - movedLeftUp.start.x).toBe(200);
      expect(movedLeftUp.end.y - movedLeftUp.start.y).toBe(200);

      const deltaRightDown: Point = { x: 800, y: 800 };
      const movedRightDown = moveAnnotation(arrow, deltaRightDown, imageBounds);

      expect(movedRightDown.end.x).toBeLessThanOrEqual(1000);
      expect(movedRightDown.end.y).toBeLessThanOrEqual(800);
      expect(movedRightDown.end.x - movedRightDown.start.x).toBe(200);
      expect(movedRightDown.end.y - movedRightDown.start.y).toBe(200);
    });
  });

  describe('Movement Bounds for Pins', () => {
    const pin: PinAnnotation = {
      id: 'pin-1',
      type: 'pin',
      createdAt: 1000,
      color: '#4f46e5',
      strokeWidth: 2,
      x: 300,
      y: 200,
      text: 'Button alignment note',
    };

    it('moves pin by delta displacement', () => {
      const delta: Point = { x: 40, y: -60 };
      const moved = moveAnnotation(pin, delta, imageBounds);

      expect(moved.x).toBe(340);
      expect(moved.y).toBe(140);
      expect(moved.text).toBe('Button alignment note');
    });

    it('clamps pin movement so marker circle is never clipped', () => {
      // Drag past top-left
      const deltaTopLeft: Point = { x: -500, y: -500 };
      const movedTopLeft = moveAnnotation(pin, deltaTopLeft, imageBounds);

      expect(movedTopLeft.x).toBe(PIN_RADIUS);
      expect(movedTopLeft.y).toBe(PIN_RADIUS);

      // Drag past bottom-right
      const deltaBottomRight: Point = { x: 900, y: 900 };
      const movedBottomRight = moveAnnotation(pin, deltaBottomRight, imageBounds);

      expect(movedBottomRight.x).toBe(imageBounds.width - PIN_RADIUS);
      expect(movedBottomRight.y).toBe(imageBounds.height - PIN_RADIUS);
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
      strokeWidth: 2,
      start: { x: 50, y: 500 },
      end: { x: 450, y: 500 },
    };

    const pin: PinAnnotation = {
      id: 'pin-top',
      type: 'pin',
      createdAt: 4000,
      color: '#f59e0b',
      strokeWidth: 2,
      x: 250,
      y: 180,
      text: 'Pin dropped on rectTop',
    };

    it('detects hits on rectangle interior and perimeter', () => {
      expect(isPointInsideAnnotation({ x: 250, y: 200 }, rectBottom)).toBe(true);
      expect(isPointInsideAnnotation({ x: 50, y: 50 }, rectBottom)).toBe(false);
    });

    it('includes enlarged invisible hit targets for thin arrows', () => {
      expect(distancePointToSegment({ x: 250, y: 508 }, arrow.start, arrow.end)).toBe(8);
      expect(isPointInsideAnnotation({ x: 250, y: 508 }, arrow)).toBe(true);
      expect(isPointInsideAnnotation({ x: 250, y: 550 }, arrow)).toBe(false);
    });

    it('detects hits on pins within circular radius', () => {
      // Pin center is (250, 180). Point (258, 184) is ~9px away (inside 14px radius)
      expect(isPointInsideAnnotation({ x: 258, y: 184 }, pin)).toBe(true);
      // Point (280, 210) is ~42px away
      expect(isPointInsideAnnotation({ x: 280, y: 210 }, pin)).toBe(false);
    });

    it('selects the topmost annotation when annotations overlap', () => {
      // rectBottom, rectTop, and pin all overlap at (250, 180)
      // pin was created last, so it is on top
      const annotations = [rectBottom, rectTop, arrow, pin];
      const hit = findTopmostAnnotationAtPoint({ x: 250, y: 180 }, annotations);
      expect(hit?.id).toBe('pin-top');

      // Without pin, rectTop is selected over rectBottom
      const hitWithoutPin = findTopmostAnnotationAtPoint({ x: 250, y: 180 }, [rectBottom, rectTop, arrow]);
      expect(hitWithoutPin?.id).toBe('rect-top');
    });

    it('returns null when clicking empty canvas space', () => {
      const annotations = [rectBottom, rectTop, arrow, pin];
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

      transientPreview = moveAnnotation(initialRect, { x: 50, y: 40 }, imageBounds);
      expect(transientPreview.x).toBe(150);
      expect(transientPreview.y).toBe(140);
      expect(currentDocumentAnnotation.x).toBe(100);

      transientPreview = null;
      expect(currentDocumentAnnotation).toEqual(initialRect);
    });
  });
});
