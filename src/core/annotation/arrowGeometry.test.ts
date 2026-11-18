import { describe, expect, it } from 'vitest';
import { calculateArrowGeometry, createArrowAnnotation } from './arrowGeometry';
import type { Point } from '../../types/geometry';

describe('arrowGeometry', () => {
  it('calculates arrowhead geometry correctly for a horizontal arrow pointing right', () => {
    const start: Point = { x: 100, y: 200 };
    const end: Point = { x: 300, y: 200 };
    const strokeWidth = 4;

    const geom = calculateArrowGeometry(start, end, strokeWidth);

    expect(geom.length).toBe(200);
    expect(geom.angle).toBeCloseTo(0, 5);
    expect(geom.head.tip).toEqual({ x: 300, y: 200 });

    // Barbs should extend back along x-axis (x < 300)
    expect(geom.head.leftBarb.x).toBeLessThan(300);
    expect(geom.head.rightBarb.x).toBeLessThan(300);

    // One barb above y=200, one barb below y=200
    const minY = Math.min(geom.head.leftBarb.y, geom.head.rightBarb.y);
    const maxY = Math.max(geom.head.leftBarb.y, geom.head.rightBarb.y);
    expect(minY).toBeLessThan(200);
    expect(maxY).toBeGreaterThan(200);

    // Both barbs must be symmetrical around the shaft
    const dyLeft = Math.abs(geom.head.leftBarb.y - 200);
    const dyRight = Math.abs(geom.head.rightBarb.y - 200);
    expect(dyLeft).toBeCloseTo(dyRight, 5);
  });

  it('calculates arrowhead geometry for vertical arrow pointing down', () => {
    const start: Point = { x: 150, y: 50 };
    const end: Point = { x: 150, y: 250 };
    const strokeWidth = 4;

    const geom = calculateArrowGeometry(start, end, strokeWidth);

    expect(geom.length).toBe(200);
    expect(geom.angle).toBeCloseTo(Math.PI / 2, 5);
    expect(geom.head.tip).toEqual({ x: 150, y: 250 });

    // Barbs should extend back along y-axis (y < 250)
    expect(geom.head.leftBarb.y).toBeLessThan(250);
    expect(geom.head.rightBarb.y).toBeLessThan(250);

    // One barb left of x=150, one barb right of x=150
    const minX = Math.min(geom.head.leftBarb.x, geom.head.rightBarb.x);
    const maxX = Math.max(geom.head.leftBarb.x, geom.head.rightBarb.x);
    expect(minX).toBeLessThan(150);
    expect(maxX).toBeGreaterThan(150);

    // Symmetrical horizontally around x=150
    const dxLeft = Math.abs(geom.head.leftBarb.x - 150);
    const dxRight = Math.abs(geom.head.rightBarb.x - 150);
    expect(dxLeft).toBeCloseTo(dxRight, 5);
  });

  it('supports arrows in diagonal directions (360 degrees)', () => {
    const start: Point = { x: 400, y: 300 };
    const end: Point = { x: 100, y: 100 }; // pointing up-left (-135 degrees)
    const strokeWidth = 6;

    const geom = calculateArrowGeometry(start, end, strokeWidth);

    expect(geom.length).toBeCloseTo(Math.hypot(300, 200), 4);
    expect(geom.head.tip).toEqual({ x: 100, y: 100 });
    expect(geom.headLength).toBeGreaterThanOrEqual(14);
  });

  it('scales arrowhead proportionally with stroke width', () => {
    const start: Point = { x: 0, y: 0 };
    const end: Point = { x: 200, y: 0 };

    const thin = calculateArrowGeometry(start, end, 2);
    const thick = calculateArrowGeometry(start, end, 8);

    expect(thick.headLength).toBeGreaterThan(thin.headLength);
  });

  it('creates arrow annotation with stable ID and coordinates', () => {
    const arrow = createArrowAnnotation({ x: 10.4, y: 20.6 }, { x: 100.2, y: 150.8 }, '#ef4444', 4);

    expect(arrow.type).toBe('arrow');
    expect(arrow.id).toMatch(/^ann-/);
    expect(arrow.color).toBe('#ef4444');
    expect(arrow.strokeWidth).toBe(4);
    expect(arrow.start).toEqual({ x: 10, y: 21 });
    expect(arrow.end).toEqual({ x: 100, y: 151 });
  });
});
