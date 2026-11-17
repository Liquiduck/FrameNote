import { useCallback, useEffect, useRef, useState } from 'react';
import type { LoadedImage } from '../types/document';
import {
  cleanupLoadedImage,
  loadImageFromFile,
  loadImageFromUrl,
} from '../core/image/imageLoader';

export function useImageLoader(onImageLoaded?: (image: LoadedImage) => void) {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store ref to image for unmount cleanup
  const imageRef = useRef<LoadedImage | null>(null);
  imageRef.current = image;

  useEffect(() => {
    return () => {
      cleanupLoadedImage(imageRef.current);
    };
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);
      try {
        const loaded = await loadImageFromFile(file);
        // Clean up previous image if it had an object URL
        cleanupLoadedImage(imageRef.current);
        setImage(loaded);
        onImageLoaded?.(loaded);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image');
      } finally {
        setIsLoading(false);
      }
    },
    [onImageLoaded]
  );

  const loadSample = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sample = await loadImageFromUrl('/sample-screenshot.png', 'Sample Analytics Dashboard.png');
      cleanupLoadedImage(imageRef.current);
      setImage(sample);
      onImageLoaded?.(sample);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample image');
    } finally {
      setIsLoading(false);
    }
  }, [onImageLoaded]);

  const clear = useCallback(() => {
    cleanupLoadedImage(imageRef.current);
    setImage(null);
    setError(null);
  }, []);

  return {
    image,
    isLoading,
    error,
    loadFile,
    loadSample,
    clear,
  };
}
