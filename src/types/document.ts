import type { Annotation, AnnotationTool, CommentThread } from './annotation';

export interface LoadedImage {
  readonly src: string;
  readonly objectUrl?: string; // Stored to ensure proper URL.revokeObjectURL cleanup
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes?: number;
}

export interface AnnotationDocument {
  readonly id: string;
  readonly title: string;
  readonly image: LoadedImage | null;
  readonly annotations: readonly Annotation[];
  readonly comments: readonly CommentThread[];
  readonly selectedAnnotationId: string | null;
  readonly activeTool: AnnotationTool;
}
