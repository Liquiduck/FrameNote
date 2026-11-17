import type { Dimensions, Point } from './geometry';

export interface ViewportState {
  readonly zoom: number; // 1 = 100%, 0.5 = 50%, 2 = 200%
  readonly pan: Point; // Offset in viewport pixel coordinates
}

export interface ViewportBounds {
  readonly container: Dimensions;
  readonly image: Dimensions;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5.0;
export const ZOOM_STEP = 0.1;
