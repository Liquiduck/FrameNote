import { describe, expect, it } from 'vitest';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGE_DIMENSION,
  MIN_IMAGE_DIMENSION,
  validateFileMetadata,
  validateImageDimensions,
} from './imageConstants';

describe('imageConstants & Validation', () => {
  it('accepts valid PNG, JPEG, and WebP files within size limits', () => {
    const pngFile = new File(['mock-data'], 'screenshot.png', { type: 'image/png' });
    const jpegFile = new File(['mock-data'], 'photo.jpg', { type: 'image/jpeg' });
    const webpFile = new File(['mock-data'], 'graphic.webp', { type: 'image/webp' });

    expect(validateFileMetadata(pngFile)).toBeNull();
    expect(validateFileMetadata(jpegFile)).toBeNull();
    expect(validateFileMetadata(webpFile)).toBeNull();
  });

  it('explicitly rejects SVG files with clear v1 guidance', () => {
    const svgFile = new File(['<svg></svg>'], 'diagram.svg', { type: 'image/svg+xml' });
    const result = validateFileMetadata(svgFile);

    expect(result).not.toBeNull();
    expect(result?.code).toBe('SVG_NOT_SUPPORTED');
    expect(result?.message).toContain('SVG files are not supported in version 1');
  });

  it('rejects files by extension if MIME type is generic application/octet-stream', () => {
    const svgByName = new File(['content'], 'vector.svg', { type: '' });
    expect(validateFileMetadata(svgByName)?.code).toBe('SVG_NOT_SUPPORTED');

    const pngByName = new File(['content'], 'capture.png', { type: '' });
    expect(validateFileMetadata(pngByName)).toBeNull();
  });

  it('rejects unsupported file formats like GIF, BMP, and PDF', () => {
    const gifFile = new File(['data'], 'anim.gif', { type: 'image/gif' });
    const pdfFile = new File(['data'], 'doc.pdf', { type: 'application/pdf' });

    expect(validateFileMetadata(gifFile)?.code).toBe('UNSUPPORTED_TYPE');
    expect(validateFileMetadata(pdfFile)?.code).toBe('UNSUPPORTED_TYPE');
  });

  it('rejects files exceeding 25 MB limit', () => {
    const largeFile = new File([''], 'huge.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: MAX_FILE_SIZE_BYTES + 1024 });

    const result = validateFileMetadata(largeFile);
    expect(result).not.toBeNull();
    expect(result?.code).toBe('FILE_TOO_LARGE');
    expect(result?.message).toContain('exceeds the maximum limit of 25 MB');
  });

  it('validates decoded image dimensions properly', () => {
    // Normal screenshot dimensions
    expect(validateImageDimensions(1920, 1080)).toBeNull();
    expect(validateImageDimensions(1200, 800)).toBeNull();

    // Degenerate small dimensions
    const smallResult = validateImageDimensions(MIN_IMAGE_DIMENSION - 1, 100);
    expect(smallResult?.code).toBe('DIMENSION_TOO_SMALL');

    // Excessively large single dimension
    const largeResult = validateImageDimensions(MAX_IMAGE_DIMENSION + 1, 1000);
    expect(largeResult?.code).toBe('DIMENSION_TOO_LARGE');

    // Total pixel overload (8000 x 6000 = 48 MP > 40 MP, but single dimensions <= 8192)
    const pixelResult = validateImageDimensions(8000, 6000);
    expect(pixelResult?.code).toBe('PIXELS_EXCEEDED');
  });
});
