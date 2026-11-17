import { describe, expect, it } from 'vitest';
import {
  createAnnotationId,
  createRectangleAnnotation,
  isValidRectangleDrag,
  normalizeRectangle,
} from './rectangleGeometry';
import {
  clampToImageBounds,
  clientToImageCoordinates,
  clientToImageViaBoundingRect,
} from '../coordinates/coordinateTransforms';
import type { Dimensions, Point } from '../../types/geometry';

describe('rectangleGeometry & Rectangle Drawing', () => {
  const imageDims: Dimensions = { width: 1200, height: 800 };

  describe('Rectangle Normalization across all 4 drag directions', () => {
    it('normalizes top-left to bottom-right drag', () => {
      const start: Point = { x: 100, y: 150 };
      const current: Point = { x: 400, y: 350 };

      const rect = normalizeRectangle(start, current);
      expect(rect).toEqual({ x: 100, y: 150, width: 300, height: 200 });
    });

    it('normalizes bottom-right to top-left drag (negative delta)', () => {
      const start: Point = { x: 400, y: 350 };
      const current: Point = { x: 100, y: 150 };

      const rect = normalizeRectangle(start, current);
      expect(rect).toEqual({ x: 100, y: 150, width: 300, height: 200 });
    });

    it('normalizes bottom-left to top-right drag', () => {
      const start: Point = { x: 100, y: 350 };
      const current: Point = { x: 400, y: 150 };

      const rect = normalizeRectangle(start, current);
      expect(rect).toEqual({ x: 100, y: 150, width: 300, height: 200 });
    });

    it('normalizes top-right to bottom-left drag', () => {
      const start: Point = { x: 400, y: 150 };
      const current: Point = { x: 100, y: 350 };

      const rect = normalizeRectangle(start, current);
      expect(rect).toEqual({ x: 100, y: 150, width: 300, height: 200 });
    });

    it('handles zero-dimension drags cleanly without negative values', () => {
      const pt: Point = { x: 200, y: 200 };
      const rect = normalizeRectangle(pt, pt);
      expect(rect).toEqual({ x: 200, y: 200, width: 0, height: 0 });
    });
  });

  describe('Bounds Clamping', () => {
    it('clamps points extending past left/top negative coordinates', () => {
      const outOfBounds: Point = { x: -50, y: -20 };
      const clamped = clampToImageBounds(outOfBounds, imageDims);
      expect(clamped).toEqual({ x: 0, y: 0 });
    });

    it('clamps points extending past right/bottom image boundaries', () => {
      const outOfBounds: Point = { x: 1350, y: 920 };
      const clamped = clampToImageBounds(outOfBounds, imageDims);
      expect(clamped).toEqual({ x: 1200, y: 800 });
    });

    it('preserves valid in-bounds points', () => {
      const inBounds: Point = { x: 500, y: 400 };
      const clamped = clampToImageBounds(inBounds, imageDims);
      expect(clamped).toEqual({ x: 500, y: 400 });
    });
  });

  describe('Tiny-Drag Rejection & Thresholds', () => {
    it('rejects click gestures where screen drag distance is below MIN_DRAG_DISTANCE_SCREEN_PX', () => {
      const startScreen: Point = { x: 100, y: 100 };
      // 2px movement in screen space (below 4px threshold)
      const endScreen: Point = { x: 102, y: 100 };
      const rect = normalizeRectangle({ x: 100, y: 100 }, { x: 102, y: 100 });

      expect(isValidRectangleDrag(startScreen, endScreen, rect)).toBe(false);
    });

    it('rejects drag if normalized image dimensions are under MIN_RECT_SIZE_IMAGE_PX', () => {
      const startScreen: Point = { x: 100, y: 100 };
      const endScreen: Point = { x: 120, y: 120 }; // 28px screen distance (valid)
      // but image dimension is 1px
      const rect = { x: 10, y: 10, width: 1, height: 100 };

      expect(isValidRectangleDrag(startScreen, endScreen, rect)).toBe(false);
    });

    it('accepts gestures that exceed screen distance and minimum image dimensions', () => {
      const startScreen: Point = { x: 100, y: 100 };
      const endScreen: Point = { x: 125, y: 135 }; // ~43px screen distance
      const rect = normalizeRectangle({ x: 100, y: 100 }, { x: 200, y: 250 });

      expect(isValidRectangleDrag(startScreen, endScreen, rect)).toBe(true);
    });
  });

  describe('Coordinate Conversion (Shared Screen to Image)', () => {
    it('converts client coordinates to unscaled image pixels using SVG bounds', () => {
      // Mock an SVG element displayed at 600x400 with image native resolution 1200x800 (2x scaling)
      const mockSvg = {
        getBoundingClientRect: () => ({
          left: 100,
          top: 50,
          right: 700,
          bottom: 450,
          width: 600,
          height: 400,
          x: 100,
          y: 50,
          toJSON: () => {},
        }),
        viewBox: {
          baseVal: {
            width: 1200,
            height: 800,
          },
        },
      };

      // Client point (400, 250)
      // relX = 400 - 100 = 300; imageX = 300 * (1200 / 600) = 600
      // relY = 250 - 50 = 200; imageY = 200 * (800 / 400) = 400
      const imgPt = clientToImageViaBoundingRect({ x: 400, y: 250 }, mockSvg as unknown as SVGSVGElement, imageDims);
      expect(imgPt.x).toBe(600);
      expect(imgPt.y).toBe(400);
    });

    it('uses SVG CTM inverse when available', () => {
      // Mock matrix transform
      const mockCTM = {
        a: 2, // 2x scale
        b: 0,
        c: 0,
        d: 2,
        e: 100, // 100px screen offset X
        f: 50,  // 50px screen offset Y
        inverse: () => ({
          a: 0.5,
          b: 0,
          c: 0,
          d: 0.5,
          e: -50,
          f: -25,
        }),
      };

      const mockSvg = {
        getScreenCTM: () => mockCTM,
        createSVGPoint: () => ({
          x: 0,
          y: 0,
          matrixTransform: (m: { a: number; d: number; e: number; f: number }) => ({
            x: 500 * m.a + m.e, // 500 * 0.5 - 50 = 200
            y: 350 * m.d + m.f, // 350 * 0.5 - 25 = 150
          }),
        }),
        getBoundingClientRect: () => ({
          left: 100,
          top: 50,
          width: 2400,
          height: 1600,
        }),
      };

      const pt = clientToImageCoordinates(
        { x: 500, y: 350 },
        mockSvg as unknown as SVGSVGElement,
        imageDims,
        true
      );
      expect(pt).toEqual({ x: 200, y: 150 });
    });
  });

  describe('Annotation Creation & Stable IDs', () => {
    it('creates stable unique IDs with proper prefix', () => {
      const id1 = createAnnotationId();
      const id2 = createAnnotationId();

      expect(id1).toMatch(/^ann-/);
      expect(id2).toMatch(/^ann-/);
      expect(id1).not.toBe(id2);
    });

    it('creates rectangle annotation with transparent fill and rounded bounds', () => {
      const rect = { x: 50.4, y: 80.6, width: 200.2, height: 120.7 };
      const annotation = createRectangleAnnotation(rect, '#4f46e5', 4, 'transparent');

      expect(annotation.type).toBe('rectangle');
      expect(annotation.x).toBe(50);
      expect(annotation.y).toBe(81);
      expect(annotation.width).toBe(200);
      expect(annotation.height).toBe(121);
      expect(annotation.color).toBe('#4f46e5');
      expect(annotation.strokeWidth).toBe(4);
      expect(annotation.fill).toBe('transparent');
    });
  });
});
