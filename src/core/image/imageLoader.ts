import type { LoadedImage } from '../../types/document';
import {
  validateFileMetadata,
  validateImageDimensions,
} from './imageConstants';

export class ImageLoadError extends Error {
  readonly code: string;

  constructor(message: string, code = 'DECODE_ERROR') {
    super(message);
    this.name = 'ImageLoadError';
    this.code = code;
  }
}

/**
 * Loads an image file locally in the browser, performs metadata and decoded-dimension
 * validation, and returns a LoadedImage with object URL tracking.
 */
export async function loadImageFromFile(file: File): Promise<LoadedImage> {
  // 1. Validate file format and size
  const metaError = validateFileMetadata(file);
  if (metaError) {
    throw new ImageLoadError(metaError.message, metaError.code);
  }

  // 2. Create local object URL
  const objectUrl = URL.createObjectURL(file);

  return new Promise<LoadedImage>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      // 3. Validate decoded dimensions
      const dimError = validateImageDimensions(width, height);
      if (dimError) {
        URL.revokeObjectURL(objectUrl);
        reject(new ImageLoadError(dimError.message, dimError.code));
        return;
      }

      resolve({
        src: objectUrl,
        objectUrl,
        name: file.name,
        width,
        height,
        sizeBytes: file.size,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new ImageLoadError(
          `Failed to decode image file "${file.name}". The file format may be invalid or corrupt.`,
          'DECODE_ERROR'
        )
      );
    };

    img.src = objectUrl;
  });
}

/**
 * Loads a bundled sample screenshot from a local asset URL.
 */
export async function loadImageFromUrl(
  url: string,
  name = 'Sample Landing Page.png'
): Promise<LoadedImage> {
  return new Promise<LoadedImage>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      const dimError = validateImageDimensions(width, height);
      if (dimError) {
        reject(new ImageLoadError(dimError.message, dimError.code));
        return;
      }

      resolve({
        src: url,
        name,
        width,
        height,
      });
    };

    img.onerror = () => {
      reject(
        new ImageLoadError(
          `Failed to load sample image from "${url}".`,
          'DECODE_ERROR'
        )
      );
    };

    img.src = url;
  });
}

/**
 * Safely revokes object URLs created for loaded images to prevent browser memory leaks.
 */
export function cleanupLoadedImage(image: LoadedImage | null | undefined): void {
  if (image?.objectUrl) {
    try {
      URL.revokeObjectURL(image.objectUrl);
    } catch {
      // Ignore cleanup error if already revoked
    }
  }
}
