import type { Point } from './geometry';

export type AnnotationTool =
  | 'select'
  | 'rectangle'
  | 'arrow'
  | 'pin'
  | 'pen'
  | 'text'
  | 'callout'
  | 'blur';

export interface BaseAnnotation {
  readonly id: string;
  readonly createdAt: number;
  readonly color: string;
  readonly strokeWidth: number;
  readonly commentId?: string;
}

export interface RectangleAnnotation extends BaseAnnotation {
  readonly type: 'rectangle';
  // Expressed in original image coordinates
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill?: string;
}

export interface ArrowAnnotation extends BaseAnnotation {
  readonly type: 'arrow';
  // Expressed in original image coordinates
  readonly start: Point;
  readonly end: Point;
}

export interface PinAnnotation extends BaseAnnotation {
  readonly type: 'pin';
  // Center coordinates in original image space
  readonly x: number;
  readonly y: number;
  // Comment text attached directly to the pin
  readonly text: string;
}

export interface PenAnnotation extends BaseAnnotation {
  readonly type: 'pen';
  // Series of points in original image coordinates
  readonly points: readonly Point[];
}

export interface TextAnnotation extends BaseAnnotation {
  readonly type: 'text';
  // Position in original image coordinates
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly fontSize: number;
}

export interface CalloutAnnotation extends BaseAnnotation {
  readonly type: 'callout';
  // Position in original image coordinates
  readonly x: number;
  readonly y: number;
  readonly index: number; // e.g. 1, 2, 3 badge
  readonly label?: string;
}

export interface BlurAnnotation extends BaseAnnotation {
  readonly type: 'blur';
  // Rectangular blur/mosaic region in original image coordinates
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type Annotation =
  | RectangleAnnotation
  | ArrowAnnotation
  | PinAnnotation
  | PenAnnotation
  | TextAnnotation
  | CalloutAnnotation
  | BlurAnnotation;

export interface CommentMessage {
  readonly id: string;
  readonly author: string;
  readonly content: string;
  readonly timestamp: number;
}

export interface CommentThread {
  readonly id: string;
  readonly annotationId: string;
  readonly messages: readonly CommentMessage[];
  readonly resolved: boolean;
}
