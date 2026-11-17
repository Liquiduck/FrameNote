/**
 * Documented limits and supported formats for local image loading in FrameNote.
 * All image operations occur strictly client-side in the browser.
 */

export const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'] as const;

/**
 * Maximum file size allowed for upload: 25 Megabytes.
 * Prevents browser memory exhaustion and UI stalls when decoding large raw image files.
 */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Maximum single dimension (width or height) in pixels: 8,192 px.
 * Ensures the decoded bitmap fits comfortably within HTML5 Canvas and GPU texture limits across modern browsers.
 */
export const MAX_IMAGE_DIMENSION = 8192;

/**
 * Minimum single dimension (width or height) in pixels: 10 px.
 * Protects against zero-dimension or degenerate image assets.
 */
export const MIN_IMAGE_DIMENSION = 10;

/**
 * Maximum total pixel count (width * height): 40 Megapixels (e.g., 8,000 × 5,000 px).
 * Prevents allocating excessively massive uncompressed RGBA canvas buffers.
 */
export const MAX_IMAGE_PIXELS = 40_000_000;

export interface FileValidationError {
  readonly code:
    | 'UNSUPPORTED_TYPE'
    | 'SVG_NOT_SUPPORTED'
    | 'FILE_TOO_LARGE'
    | 'DIMENSION_TOO_LARGE'
    | 'DIMENSION_TOO_SMALL'
    | 'PIXELS_EXCEEDED'
    | 'DECODE_ERROR';
  readonly message: string;
}

/**
 * Validates file MIME type, extension, and file size before attempting browser decode.
 */
export function validateFileMetadata(file: File): FileValidationError | null {
  const lowerName = file.name.toLowerCase();
  const lowerType = file.type.toLowerCase();

  // Explicit check for SVG files (unsupported in v1)
  if (lowerType === 'image/svg+xml' || lowerName.endsWith('.svg')) {
    return {
      code: 'SVG_NOT_SUPPORTED',
      message:
        'SVG files are not supported in version 1. Please upload a raster screenshot (PNG, JPEG, or WebP).',
    };
  }

  // Validate MIME type or file extension fallback
  const hasSupportedMime = SUPPORTED_MIME_TYPES.includes(lowerType as SupportedMimeType);
  const hasSupportedExt = SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!hasSupportedMime && !hasSupportedExt) {
    const detected = lowerType || (lowerName.includes('.') ? lowerName.split('.').pop() : 'unknown');
    return {
      code: 'UNSUPPORTED_TYPE',
      message: `Unsupported file format "${detected}". Supported formats: PNG, JPEG, and WebP.`,
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const maxMb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      code: 'FILE_TOO_LARGE',
      message: `File size (${sizeMb} MB) exceeds the maximum limit of ${maxMb} MB.`,
    };
  }

  return null;
}

/**
 * Validates decoded image pixel dimensions.
 */
export function validateImageDimensions(
  width: number,
  height: number
): FileValidationError | null {
  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    return {
      code: 'DIMENSION_TOO_SMALL',
      message: `Image dimensions (${width} × ${height} px) are too small. Minimum required dimension is ${MIN_IMAGE_DIMENSION} px.`,
    };
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return {
      code: 'DIMENSION_TOO_LARGE',
      message: `Image dimensions (${width} × ${height} px) exceed the maximum supported dimension of ${MAX_IMAGE_DIMENSION} px.`,
    };
  }

  if (width * height > MAX_IMAGE_PIXELS) {
    const mp = (width * height / 1_000_000).toFixed(1);
    const maxMp = (MAX_IMAGE_PIXELS / 1_000_000).toFixed(0);
    return {
      code: 'PIXELS_EXCEEDED',
      message: `Image resolution (${width} × ${height} = ${mp} MP) exceeds the maximum allowed resolution of ${maxMp} MP.`,
    };
  }

  return null;
}
