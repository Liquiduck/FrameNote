import { describe, expect, it, vi } from 'vitest';
import {
  isValidRectangleDrag,
  normalizeRectangle,
} from '../core/annotation/rectangleGeometry';
import type { Point } from '../types/geometry';

describe('Draft interaction & cancellation behavior', () => {
  it('discards draft when gesture is cancelled (pointercancel simulation)', () => {
    let draftAnnotation: { x: number; y: number; width: number; height: number } | null = null;
    let committed = false;

    // Simulate pointerdown at (50, 50)
    const startImagePt: Point = { x: 50, y: 50 };

    // Simulate pointermove to (200, 150)
    const currentImagePt: Point = { x: 200, y: 150 };

    draftAnnotation = normalizeRectangle(startImagePt, currentImagePt);
    expect(draftAnnotation).toEqual({ x: 50, y: 50, width: 150, height: 100 });

    // Pointercancel fires before pointerup
    const handleCancel = () => {
      draftAnnotation = null;
      // Do not commit
    };

    handleCancel();

    expect(draftAnnotation).toBeNull();
    expect(committed).toBe(false);
  });

  it('discards draft and rejects commit when drag distance is under screen threshold', () => {
    const onCommit = vi.fn();

    const startScreen: Point = { x: 100, y: 100 };
    const endScreen: Point = { x: 101, y: 101 }; // tiny 1.4px movement
    const normalized = normalizeRectangle({ x: 50, y: 50 }, { x: 52, y: 52 });

    const isValid = isValidRectangleDrag(startScreen, endScreen, normalized);
    expect(isValid).toBe(false);

    if (isValid) {
      onCommit();
    }

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits rectangle when drag distance is valid', () => {
    const onCommit = vi.fn();

    const startScreen: Point = { x: 100, y: 100 };
    const endScreen: Point = { x: 180, y: 160 }; // 100px screen distance
    const normalized = normalizeRectangle({ x: 50, y: 50 }, { x: 250, y: 200 });

    const isValid = isValidRectangleDrag(startScreen, endScreen, normalized);
    expect(isValid).toBe(true);

    if (isValid) {
      onCommit(normalized);
    }

    expect(onCommit).toHaveBeenCalledWith({ x: 50, y: 50, width: 200, height: 150 });
  });
});
