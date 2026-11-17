import { describe, expect, it } from 'vitest';
import {
  calculateFitToViewport,
  clampToImageBounds,
  imageToScreenCoordinates,
  screenToImageCoordinates,
  zoomAtFocalPoint,
} from './coordinateTransforms';
import type { ViewportState } from '../../types/viewport';

describe('coordinateTransforms', () => {
  it('correctly maps screen points to native image points', () => {
    const viewport: ViewportState = {
      zoom: 2.0,
      pan: { x: 100, y: 50 },
    };

    // Screen point (300, 250)
    // imageX = (300 - 100) / 2 = 100
    // imageY = (250 - 50) / 2 = 100
    const imagePoint = screenToImageCoordinates({ x: 300, y: 250 }, viewport);
    expect(imagePoint).toEqual({ x: 100, y: 100 });
  });

  it('correctly maps native image points to screen points', () => {
    const viewport: ViewportState = {
      zoom: 1.5,
      pan: { x: 40, y: 60 },
    };

    // screenX = 40 + (200 * 1.5) = 340
    // screenY = 60 + (100 * 1.5) = 210
    const screenPoint = imageToScreenCoordinates({ x: 200, y: 100 }, viewport);
    expect(screenPoint).toEqual({ x: 340, y: 210 });
  });

  it('guarantees roundtrip mathematical invertibility', () => {
    const viewport: ViewportState = {
      zoom: 0.75,
      pan: { x: 123.5, y: 88.2 },
    };

    const originalImagePt = { x: 450, y: 320 };
    const screenPt = imageToScreenCoordinates(originalImagePt, viewport);
    const roundtrip = screenToImageCoordinates(screenPt, viewport);

    expect(roundtrip.x).toBeCloseTo(originalImagePt.x, 5);
    expect(roundtrip.y).toBeCloseTo(originalImagePt.y, 5);
  });

  it('calculates fit-to-viewport with proper centering and padding', () => {
    const image = { width: 1000, height: 600 };
    const container = { width: 1200, height: 800 };

    const fit = calculateFitToViewport(image, container, 50);

    // Available: 1100 x 700.
    // scaleX = 1100 / 1000 = 1.1 -> capped at 1.0
    // scaleY = 700 / 600 = 1.166 -> capped at 1.0
    // zoom = 1.0
    expect(fit.zoom).toBe(1.0);
    // panX = (1200 - 1000 * 1) / 2 = 100
    // panY = (800 - 600 * 1) / 2 = 100
    expect(fit.pan).toEqual({ x: 100, y: 100 });
  });

  it('scales down large screenshots to fit smaller screens', () => {
    const largeImage = { width: 2400, height: 1600 };
    const container = { width: 1000, height: 800 };

    const fit = calculateFitToViewport(largeImage, container, 40);

    // Available: 920 x 720.
    // scaleX = 920 / 2400 = 0.3833
    // scaleY = 720 / 1600 = 0.45
    // zoom = ~0.3833
    expect(fit.zoom).toBeCloseTo(920 / 2400, 2);
    expect(fit.zoom).toBeLessThan(1.0);
  });

  it('zooms centered around focal cursor without drifting anchor point', () => {
    const initialViewport: ViewportState = {
      zoom: 1.0,
      pan: { x: 0, y: 0 },
    };

    const focalCursor = { x: 500, y: 400 };
    const nextViewport = zoomAtFocalPoint(initialViewport, 2.0, focalCursor);

    expect(nextViewport.zoom).toBe(2.0);
    // Image point under focal point before zoom: (500 - 0) / 1 = 500
    // Screen point of image point 500 after zoom: panX + 500 * 2 = focalCursor.x = 500
    // panX must be -500
    expect(nextViewport.pan.x).toBe(-500);
    expect(nextViewport.pan.y).toBe(-400);
  });

  it('clamps coordinates to image boundaries', () => {
    const bounds = { width: 800, height: 600 };
    expect(clampToImageBounds({ x: -10, y: 200 }, bounds)).toEqual({ x: 0, y: 200 });
    expect(clampToImageBounds({ x: 900, y: 700 }, bounds)).toEqual({ x: 800, y: 600 });
  });
});
