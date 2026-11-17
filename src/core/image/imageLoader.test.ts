import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLoadedImage } from './imageLoader';
import type { LoadedImage } from '../../types/document';

describe('imageLoader lifecycle & cleanup', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:http://localhost/mock-uuid'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('revokes object URL when cleanupLoadedImage is called with a loaded image', () => {
    const loaded: LoadedImage = {
      src: 'blob:http://localhost/mock-uuid',
      objectUrl: 'blob:http://localhost/mock-uuid',
      name: 'test.png',
      width: 1200,
      height: 800,
    };

    cleanupLoadedImage(loaded);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-uuid');
  });

  it('does not attempt revocation if image has no objectUrl (e.g. bundled static asset)', () => {
    const staticSample: LoadedImage = {
      src: '/sample-screenshot.png',
      name: 'Sample.png',
      width: 1200,
      height: 800,
    };

    cleanupLoadedImage(staticSample);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('safely handles null and undefined arguments', () => {
    expect(() => cleanupLoadedImage(null)).not.toThrow();
    expect(() => cleanupLoadedImage(undefined)).not.toThrow();
  });
});
