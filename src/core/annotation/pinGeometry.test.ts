import { describe, expect, it } from 'vitest';
import {
  clampPinToImageBounds,
  createPinAnnotation,
  getAllPins,
  getPinDisplayNumber,
  PIN_RADIUS,
} from './pinGeometry';
import type { Annotation, RectangleAnnotation } from '../../types/annotation';
import type { Dimensions, Point } from '../../types/geometry';

describe('pinGeometry & Numbered Comment Pins', () => {
  const imageDims: Dimensions = { width: 1200, height: 800 };

  describe('Pin Creation & Numbering', () => {
    it('creates pins with stable unique IDs, coordinates, and comment text', () => {
      const pin = createPinAnnotation({ x: 150.2, y: 220.8 }, 'Fix navigation alignment', '#4f46e5');

      expect(pin.type).toBe('pin');
      expect(pin.id).toMatch(/^ann-/);
      expect(pin.x).toBe(150);
      expect(pin.y).toBe(221);
      expect(pin.text).toBe('Fix navigation alignment');
      expect(pin.color).toBe('#4f46e5');
    });

    it('derives dynamic display numbers in order of creation', () => {
      const pinA = createPinAnnotation({ x: 100, y: 100 });
      const pinB = createPinAnnotation({ x: 200, y: 200 });
      const pinC = createPinAnnotation({ x: 300, y: 300 });

      const annotations: Annotation[] = [pinA, pinB, pinC];

      expect(getPinDisplayNumber(pinA.id, annotations)).toBe(1);
      expect(getPinDisplayNumber(pinB.id, annotations)).toBe(2);
      expect(getPinDisplayNumber(pinC.id, annotations)).toBe(3);
    });

    it('renumbers consistently after deletion', () => {
      const pinA = createPinAnnotation({ x: 100, y: 100 });
      const pinC = createPinAnnotation({ x: 300, y: 300 });

      // Simulate state where pinB was deleted
      const remainingAfterBDeleted: Annotation[] = [pinA, pinC];

      // pinA remains #1
      expect(getPinDisplayNumber(pinA.id, remainingAfterBDeleted)).toBe(1);
      // pinC is now #2
      expect(getPinDisplayNumber(pinC.id, remainingAfterBDeleted)).toBe(2);
    });

    it('maintains proper numbering even when interleaved with rectangles and arrows', () => {
      const pin1 = createPinAnnotation({ x: 100, y: 100 });
      const rect: RectangleAnnotation = {
        id: 'rect-1',
        type: 'rectangle',
        createdAt: 100,
        color: '#4f46e5',
        strokeWidth: 4,
        x: 50,
        y: 50,
        width: 200,
        height: 100,
      };
      const pin2 = createPinAnnotation({ x: 400, y: 400 });

      const annotations: Annotation[] = [rect, pin1, pin2];

      const pins = getAllPins(annotations);
      expect(pins).toHaveLength(2);
      expect(getPinDisplayNumber(pin1.id, annotations)).toBe(1);
      expect(getPinDisplayNumber(pin2.id, annotations)).toBe(2);
    });
  });

  describe('Bounds Clamping for Pin Markers', () => {
    it('clamps pin centers to stay at least PIN_RADIUS inside left/top edges', () => {
      const tooCloseToTopLeft: Point = { x: 5, y: -10 };
      const clamped = clampPinToImageBounds(tooCloseToTopLeft, imageDims);

      expect(clamped.x).toBe(PIN_RADIUS);
      expect(clamped.y).toBe(PIN_RADIUS);
    });

    it('clamps pin centers to stay at least PIN_RADIUS inside right/bottom edges', () => {
      const tooCloseToBottomRight: Point = { x: 1250, y: 810 };
      const clamped = clampPinToImageBounds(tooCloseToBottomRight, imageDims);

      expect(clamped.x).toBe(imageDims.width - PIN_RADIUS);
      expect(clamped.y).toBe(imageDims.height - PIN_RADIUS);
    });

    it('preserves valid in-bounds points', () => {
      const inBounds: Point = { x: 500, y: 350 };
      const clamped = clampPinToImageBounds(inBounds, imageDims);

      expect(clamped).toEqual({ x: 500, y: 350 });
    });
  });
});
