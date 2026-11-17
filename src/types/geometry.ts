/**
 * Geometric primitives and branded coordinate types to ensure
 * strict separation between Screen and Image coordinates.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * ScreenPoint represents coordinates in viewport/CSS pixel space.
 */
export interface ScreenPoint {
  readonly kind: 'screen';
  readonly x: number;
  readonly y: number;
}

/**
 * ImagePoint represents coordinates relative to the original unscaled image pixels.
 * All persistent annotation geometries MUST be saved in ImagePoint coordinates.
 */
export interface ImagePoint {
  readonly kind: 'image';
  readonly x: number;
  readonly y: number;
}
