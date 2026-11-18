import { describe, expect, it } from 'vitest';
import {
  calculateActualSize,
  calculateFitToViewport,
  clampPanToBounds,
  clampToImageBounds,
  imageToScreenCoordinates,
  MIN_VISIBLE_MARGIN,
  screenToImageCoordinates,
  zoomAtFocalPoint,
  zoomViewportCentered,
} from './coordinateTransforms';
import type { ViewportState } from '../../types/viewport';
import { moveAnnotation } from '../annotation/movement';
import type { RectangleAnnotation } from '../../types/annotation';

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

  it('guarantees roundtrip mathematical invertibility at arbitrary zoom and pan', () => {
    const testCases: ViewportState[] = [
      { zoom: 0.25, pan: { x: -200, y: 150 } },
      { zoom: 0.75, pan: { x: 123.5, y: 88.2 } },
      { zoom: 1.0, pan: { x: 0, y: 0 } },
      { zoom: 2.5, pan: { x: -450.8, y: -220.4 } },
      { zoom: 5.0, pan: { x: 1024, y: 768 } },
    ];

    const testPoints = [
      { x: 0, y: 0 },
      { x: 450, y: 320 },
      { x: 1920, y: 1080 },
    ];

    for (const vp of testCases) {
      for (const pt of testPoints) {
        const screenPt = imageToScreenCoordinates(pt, vp);
        const roundtrip = screenToImageCoordinates(screenPt, vp);
        expect(roundtrip.x).toBeCloseTo(pt.x, 5);
        expect(roundtrip.y).toBeCloseTo(pt.y, 5);
      }
    }
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

  it('calculates actual size (1 image px = 1 CSS px) centered in container', () => {
    const image = { width: 800, height: 600 };
    const container = { width: 1200, height: 900 };

    const actual = calculateActualSize(image, container);
    expect(actual.zoom).toBe(1.0);
    expect(actual.pan).toEqual({
      x: (1200 - 800) / 2, // 200
      y: (900 - 600) / 2, // 150
    });
  });

  it('zooms centered around focal cursor without drifting anchor point', () => {
    const initialViewport: ViewportState = {
      zoom: 1.0,
      pan: { x: 0, y: 0 },
    };

    const focalCursor = { x: 500, y: 400 };

    // Image point directly under focal cursor before zoom
    const imgPointBefore = screenToImageCoordinates(focalCursor, initialViewport);

    // Zoom in to 2.5x around focal cursor
    const nextViewport = zoomAtFocalPoint(initialViewport, 2.5, focalCursor);
    expect(nextViewport.zoom).toBe(2.5);

    // Image point under the same screen cursor must remain identical
    const imgPointAfter = screenToImageCoordinates(focalCursor, nextViewport);
    expect(imgPointAfter.x).toBeCloseTo(imgPointBefore.x, 2);
    expect(imgPointAfter.y).toBeCloseTo(imgPointBefore.y, 2);
  });

  it('zoomViewportCentered preserves the pixel at container center', () => {
    const container = { width: 1000, height: 800 };
    const image = { width: 1600, height: 1200 };
    const initialViewport: ViewportState = {
      zoom: 0.5,
      pan: { x: 100, y: 100 },
    };

    const containerCenter = { x: container.width / 2, y: container.height / 2 };
    const imgPointAtCenterBefore = screenToImageCoordinates(containerCenter, initialViewport);

    const nextViewport = zoomViewportCentered(initialViewport, 1.2, container, image);

    const imgPointAtCenterAfter = screenToImageCoordinates(containerCenter, nextViewport);
    expect(imgPointAtCenterAfter.x).toBeCloseTo(imgPointAtCenterBefore.x, 1);
    expect(imgPointAtCenterAfter.y).toBeCloseTo(imgPointAtCenterBefore.y, 1);
  });

  it('clampPanToBounds prevents image from being lost off-screen', () => {
    const image = { width: 1000, height: 600 };
    const container = { width: 800, height: 600 };
    const zoom = 1.0;

    // Attempting to pan far to the left (pan.x = -5000)
    const clampedLeft = clampPanToBounds({ x: -5000, y: 0 }, zoom, image, container);
    // At least MIN_VISIBLE_MARGIN must remain inside [0, 800]
    expect(clampedLeft.x).toBe(-1000 + MIN_VISIBLE_MARGIN);

    // Attempting to pan far to the right (pan.x = 5000)
    const clampedRight = clampPanToBounds({ x: 5000, y: 0 }, zoom, image, container);
    expect(clampedRight.x).toBe(container.width - MIN_VISIBLE_MARGIN);

    // Attempting to pan far upwards (pan.y = -5000)
    const clampedTop = clampPanToBounds({ x: 0, y: -5000 }, zoom, image, container);
    expect(clampedTop.y).toBe(-600 + MIN_VISIBLE_MARGIN);

    // Attempting to pan far downwards (pan.y = 5000)
    const clampedBottom = clampPanToBounds({ x: 0, y: 5000 }, zoom, image, container);
    expect(clampedBottom.y).toBe(container.height - MIN_VISIBLE_MARGIN);
  });

  it('clamps coordinates to image boundaries', () => {
    const bounds = { width: 800, height: 600 };
    expect(clampToImageBounds({ x: -10, y: 200 }, bounds)).toEqual({ x: 0, y: 200 });
    expect(clampToImageBounds({ x: 900, y: 700 }, bounds)).toEqual({ x: 800, y: 600 });
  });

  it('verifies annotation movement remains identical in image space regardless of zoom level', () => {
    const imageBounds = { width: 1000, height: 1000 };
    const rect: RectangleAnnotation = {
      id: 'rect-1',
      type: 'rectangle',
      createdAt: 100,
      color: '#4f46e5',
      strokeWidth: 2,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
    };

    // When zoom = 2.0, a 100px screen drag translates to 50px image displacement
    const screenDisplacement = { x: 100, y: 60 };
    const zoomA = 2.0;
    const imageDeltaA = {
      x: screenDisplacement.x / zoomA, // 50
      y: screenDisplacement.y / zoomA, // 30
    };

    const movedA = moveAnnotation(rect, imageDeltaA, imageBounds);
    expect(movedA).toMatchObject({
      x: 150,
      y: 130,
      width: 200,
      height: 150,
    });

    // When zoom = 0.5, a 100px screen drag translates to 200px image displacement
    const zoomB = 0.5;
    const imageDeltaB = {
      x: screenDisplacement.x / zoomB, // 200
      y: screenDisplacement.y / zoomB, // 120
    };

    const movedB = moveAnnotation(rect, imageDeltaB, imageBounds);
    expect(movedB).toMatchObject({
      x: 300,
      y: 220,
      width: 200,
      height: 150,
    });

    // Dimensions and internal geometry are strictly preserved in image units
    expect(movedA.width).toBe(rect.width);
    expect(movedA.height).toBe(rect.height);
    expect(movedB.width).toBe(rect.width);
    expect(movedB.height).toBe(rect.height);
  });
});
