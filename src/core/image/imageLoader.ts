import type { LoadedImage } from '../../types/document';

/**
 * Loads an image file locally in the browser, calculates original dimensions,
 * and maintains track of object URLs for leak-free cleanup.
 */
export async function loadImageFromFile(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`Invalid file type "${file.type}". Please upload an image file (PNG, JPEG, WebP, etc.).`);
  }

  const objectUrl = URL.createObjectURL(file);

  return new Promise<LoadedImage>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        src: objectUrl,
        objectUrl,
        name: file.name,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        sizeBytes: file.size,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image file "${file.name}". The file may be corrupted.`));
    };

    img.src = objectUrl;
  });
}

/**
 * Loads an image from a static asset URL (e.g. sample screenshot)
 * without creating a redundant object URL that needs revocation.
 */
export async function loadImageFromUrl(url: string, name = 'sample-screenshot.png'): Promise<LoadedImage> {
  return new Promise<LoadedImage>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        src: url,
        name,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };

    img.onerror = () => {
      reject(new Error(`Failed to load asset image at "${url}".`));
    };

    img.src = url;
  });
}

/**
 * Safely revokes object URLs created for loaded images to prevent browser memory leaks.
 */
export function cleanupLoadedImage(image: LoadedImage | null): void {
  if (image?.objectUrl) {
    try {
      URL.revokeObjectURL(image.objectUrl);
    } catch {
      // Ignore cleanup error if already revoked
    }
  }
}
