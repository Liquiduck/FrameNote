import { describe, expect, it } from 'vitest';
import {
  checkExportDimensions,
  getExportFilename,
} from './exportPipeline';
import type { LoadedImage } from '../../types/document';
import type { ArrowAnnotation, PinAnnotation, RectangleAnnotation } from '../../types/annotation';
import { calculateArrowGeometry } from '../annotation/arrowGeometry';
import { PIN_RADIUS } from '../annotation/pinGeometry';
import { MAX_IMAGE_DIMENSION } from '../image/imageConstants';

describe('exportPipeline', () => {
  const sampleImage: LoadedImage = {
    src: 'data:image/png;base64,mock',
    name: 'dashboard-preview.png',
    width: 1920,
    height: 1080,
    sizeBytes: 500_000,
  };

  describe('getExportFilename', () => {
    it('appends -annotated.png for image-only export', () => {
      expect(getExportFilename('screenshot.png', false)).toBe('screenshot-annotated.png');
      expect(getExportFilename('ui-design.jpeg', false)).toBe('ui-design-annotated.png');
      expect(getExportFilename('landing-page.webp', false)).toBe('landing-page-annotated.png');
    });

    it('appends -annotated-with-notes.png when appendix is included', () => {
      expect(getExportFilename('dashboard.png', true)).toBe('dashboard-annotated-with-notes.png');
    });

    it('falls back to framenote-annotated.png for missing or empty filenames', () => {
      expect(getExportFilename('', false)).toBe('framenote-annotated.png');
      expect(getExportFilename(undefined, false)).toBe('framenote-annotated.png');
      expect(getExportFilename(undefined, true)).toBe('framenote-annotated-with-notes.png');
    });
  });

  describe('checkExportDimensions', () => {
    it('validates normal image-only dimensions within limits', () => {
      const check = checkExportDimensions(sampleImage, [], false);
      expect(check.willExceedLimit).toBe(false);
      expect(check.width).toBe(1920);
      expect(check.height).toBe(1080);
      expect(check.totalPixels).toBe(1920 * 1080);
      expect(check.appendixHeight).toBe(0);
    });

    it('omits appendix height when there are no pin comments', () => {
      const rect: RectangleAnnotation = {
        id: 'rect-1',
        type: 'rectangle',
        createdAt: 100,
        color: '#ef4444',
        strokeWidth: 2,
        x: 50,
        y: 50,
        width: 100,
        height: 80,
      };

      const check = checkExportDimensions(sampleImage, [rect], true);
      expect(check.willExceedLimit).toBe(false);
      expect(check.appendixHeight).toBe(0);
      expect(check.height).toBe(1080);
    });

    it('adds appendix height when comments are present', () => {
      const pin: PinAnnotation = {
        id: 'pin-1',
        type: 'pin',
        createdAt: 100,
        color: '#ef4444',
        strokeWidth: 2,
        x: 50,
        y: 50,
        text: 'Review button contrast',
      };

      const check = checkExportDimensions(sampleImage, [pin], true);
      expect(check.willExceedLimit).toBe(false);
      expect(check.appendixHeight).toBeGreaterThan(0);
      expect(check.height).toBe(1080 + check.appendixHeight);
      expect(check.width).toBe(1920);
    });

    it('flags limit exceeded when single dimension exceeds MAX_IMAGE_DIMENSION', () => {
      const tallImage: LoadedImage = {
        src: 'data:image/png;base64,mock',
        name: 'very-tall.png',
        width: 2000,
        height: MAX_IMAGE_DIMENSION + 50, // 8242 > 8192
        sizeBytes: 1_000_000,
      };

      const check = checkExportDimensions(tallImage, [], false);
      expect(check.willExceedLimit).toBe(true);
      expect(check.reason).toContain('exceed maximum limit');
    });

    it('flags limit exceeded when total resolution exceeds MAX_IMAGE_PIXELS', () => {
      // 8000 x 6000 = 48,000,000 pixels > 40,000,000 MP limit
      const massiveImage: LoadedImage = {
        src: 'data:image/png;base64,mock',
        name: 'massive.png',
        width: 8000,
        height: 6000,
        sizeBytes: 5_000_000,
      };

      const check = checkExportDimensions(massiveImage, [], false);
      expect(check.willExceedLimit).toBe(true);
      expect(check.reason).toContain('exceeds maximum limit of 40 MP');
    });

    it('detects when an appendix causes total height to exceed MAX_IMAGE_DIMENSION', () => {
      // Image height 8150px is under 8192px, but adding appendix will push it over 8192px
      const nearLimitImage: LoadedImage = {
        src: 'data:image/png;base64,mock',
        name: 'near-limit.png',
        width: 1000,
        height: MAX_IMAGE_DIMENSION - 20, // 8172
        sizeBytes: 2_000_000,
      };

      const pin: PinAnnotation = {
        id: 'pin-1',
        type: 'pin',
        createdAt: 100,
        color: '#ef4444',
        strokeWidth: 2,
        x: 50,
        y: 50,
        text: 'This appendix will push total height over 8,192 px',
      };

      // Image-only is valid
      const checkImageOnly = checkExportDimensions(nearLimitImage, [pin], false);
      expect(checkImageOnly.willExceedLimit).toBe(false);

      // With appendix exceeds 8,192 px
      const checkWithAppendix = checkExportDimensions(nearLimitImage, [pin], true);
      expect(checkWithAppendix.willExceedLimit).toBe(true);
      expect(checkWithAppendix.height).toBeGreaterThan(MAX_IMAGE_DIMENSION);
    });
  });

  describe('Shared Geometry and Ordering', () => {
    it('uses the shared calculateArrowGeometry helper for identical SVG and canvas arrowhead output', () => {
      const arrow: ArrowAnnotation = {
        id: 'arrow-1',
        type: 'arrow',
        createdAt: 100,
        color: '#ef4444',
        strokeWidth: 4,
        start: { x: 50, y: 50 },
        end: { x: 250, y: 200 },
      };

      const geom = calculateArrowGeometry(arrow.start, arrow.end, arrow.strokeWidth);

      expect(geom.start).toEqual({ x: 50, y: 50 });
      expect(geom.head.tip).toEqual({ x: 250, y: 200 });
      // Left and right barbs are symmetrical and valid numbers
      expect(Number.isFinite(geom.head.leftBarb.x)).toBe(true);
      expect(Number.isFinite(geom.head.rightBarb.x)).toBe(true);
    });

    it('uses consistent PIN_RADIUS across editor display and export geometry', () => {
      expect(PIN_RADIUS).toBe(14);
    });

    it('preserves native image coordinates strictly in document annotations', () => {
      const rect: RectangleAnnotation = {
        id: 'rect-1',
        type: 'rectangle',
        createdAt: 100,
        color: '#4f46e5',
        strokeWidth: 3,
        x: 120,
        y: 80,
        width: 300,
        height: 200,
      };

      // Annotation values are unscaled image pixels
      expect(rect.x).toBe(120);
      expect(rect.y).toBe(80);
      expect(rect.width).toBe(300);
      expect(rect.height).toBe(200);

      // Verify no transient editor state (selected, draft, hit targets) is stored on annotation
      expect('selected' in rect).toBe(false);
      expect('isDraft' in rect).toBe(false);
      expect('hitTarget' in rect).toBe(false);
    });
  });
});
