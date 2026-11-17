import { useCallback, useEffect, useRef, useState } from 'react';
import type { LoadedImage } from '../types/document';
import {
  cleanupLoadedImage,
  loadImageFromFile,
  loadImageFromUrl,
} from '../core/image/imageLoader';

interface UseImageLoaderOptions {
  onImageLoaded?: (image: LoadedImage) => void;
}

export function useImageLoader(options: UseImageLoaderOptions = {}) {
  const { onImageLoaded } = options;
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracks active upload request to prevent race conditions from stale uploads
  const latestRequestIdRef = useRef<number>(0);

  // Store current image ref for unmount cleanup
  const imageRef = useRef<LoadedImage | null>(null);
  imageRef.current = image;

  useEffect(() => {
    return () => {
      cleanupLoadedImage(imageRef.current);
    };
  }, []);

  const loadFile = useCallback(
    async (file: File): Promise<LoadedImage | null> => {
      const requestId = ++latestRequestIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const loaded = await loadImageFromFile(file);

        // Check if a newer upload was initiated while this one was decoding
        if (requestId !== latestRequestIdRef.current) {
          cleanupLoadedImage(loaded);
          return null;
        }

        cleanupLoadedImage(imageRef.current);
        setImage(loaded);
        onImageLoaded?.(loaded);
        return loaded;
      } catch (err) {
        if (requestId === latestRequestIdRef.current) {
          const message = err instanceof Error ? err.message : 'Failed to load image file';
          setError(message);
        }
        return null;
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [onImageLoaded]
  );

  const loadSample = useCallback(
    async (url = '/sample-screenshot.png'): Promise<LoadedImage | null> => {
      const requestId = ++latestRequestIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const sample = await loadImageFromUrl(url, 'Sample Landing Page.png');

        if (requestId !== latestRequestIdRef.current) {
          return null;
        }

        cleanupLoadedImage(imageRef.current);
        setImage(sample);
        onImageLoaded?.(sample);
        return sample;
      } catch (err) {
        if (requestId === latestRequestIdRef.current) {
          const message = err instanceof Error ? err.message : 'Failed to load sample image';
          setError(message);
        }
        return null;
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [onImageLoaded]
  );

  const clearImage = useCallback(() => {
    latestRequestIdRef.current++;
    cleanupLoadedImage(imageRef.current);
    setImage(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    image,
    isLoading,
    error,
    loadFile,
    loadSample,
    clearImage,
    clearError,
  };
}
