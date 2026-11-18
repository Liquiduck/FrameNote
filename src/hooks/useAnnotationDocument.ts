import { useCallback, useState } from 'react';
import type { Annotation, AnnotationTool, CommentMessage } from '../types/annotation';
import type { AnnotationDocument, LoadedImage } from '../types/document';
import {
  canRedo as checkCanRedo,
  canUndo as checkCanUndo,
  createHistory,
  pushHistory,
  redoHistory,
  resetHistory,
  undoHistory,
  type HistoryState,
} from '../core/history/history';
import { areAnnotationListsEqual } from '../core/annotation/annotationEquality';
import { ANNOTATION_COLORS, STROKE_WIDTH_PRESETS } from '../core/annotation/rectangleGeometry';

export function useAnnotationDocument() {
  // History tracks ONLY annotations (never image blobs, tool choice, or selection)
  const [annotationsHistory, setAnnotationsHistory] = useState<HistoryState<readonly Annotation[]>>(() =>
    createHistory([])
  );

  // Document metadata and image reference (held once, outside history entries)
  const [image, setImageState] = useState<LoadedImage | null>(null);
  const [title, setTitleState] = useState<string>('Untitled Screenshot');

  // Interactive UI state (excluded from history)
  const [activeTool, setActiveToolState] = useState<AnnotationTool>('rectangle');
  const [activeColor, setActiveColorState] = useState<string>(ANNOTATION_COLORS[0].value);
  const [activeStrokeWidth, setActiveStrokeWidthState] = useState<number>(STROKE_WIDTH_PRESETS[1].value);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Keep selection valid: if an annotation was removed by undo/redo, clear selection
  const validateSelectionAgainst = useCallback((nextAnnotations: readonly Annotation[]) => {
    setSelectedAnnotationId((prevSelectedId) => {
      if (prevSelectedId && !nextAnnotations.some((a) => a.id === prevSelectedId)) {
        return null;
      }
      return prevSelectedId;
    });
  }, []);

  const undo = useCallback(() => {
    setAnnotationsHistory((prev) => {
      if (!checkCanUndo(prev)) return prev;
      const next = undoHistory(prev);
      validateSelectionAgainst(next.present);
      return next;
    });
  }, [validateSelectionAgainst]);

  const redo = useCallback(() => {
    setAnnotationsHistory((prev) => {
      if (!checkCanRedo(prev)) return prev;
      const next = redoHistory(prev);
      validateSelectionAgainst(next.present);
      return next;
    });
  }, [validateSelectionAgainst]);

  const setImage = useCallback((newImage: LoadedImage) => {
    setImageState(newImage);
    setTitleState(newImage.name.replace(/\.[^/.]+$/, ''));
    // Replacing an image resets annotations, selection, and history
    setAnnotationsHistory(resetHistory([]));
    setSelectedAnnotationId(null);
    setActiveToolState('rectangle');
  }, []);

  const clearImage = useCallback(() => {
    setImageState(null);
    setTitleState('Untitled Screenshot');
    setAnnotationsHistory(resetHistory([]));
    setSelectedAnnotationId(null);
    setActiveToolState('rectangle');
  }, []);

  const setTitle = useCallback((newTitle: string) => {
    setTitleState(newTitle.trim() || 'Untitled Screenshot');
  }, []);

  const setActiveTool = useCallback((tool: AnnotationTool) => {
    setActiveToolState(tool);
    // If switching away from select, deselect current annotation
    if (tool !== 'select') {
      setSelectedAnnotationId(null);
    }
  }, []);

  const setActiveColor = useCallback((color: string) => {
    setActiveColorState(color);
  }, []);

  const setActiveStrokeWidth = useCallback((strokeWidth: number) => {
    setActiveStrokeWidthState(strokeWidth);
  }, []);

  const selectAnnotation = useCallback((id: string | null) => {
    setSelectedAnnotationId(id);
  }, []);

  const addAnnotation = useCallback((annotation: Annotation) => {
    setAnnotationsHistory((prev) => {
      const nextPresent = [...prev.present, annotation];
      return pushHistory(prev, nextPresent, areAnnotationListsEqual);
    });
    setSelectedAnnotationId(annotation.id);
  }, []);

  const updateAnnotation = useCallback((annotation: Annotation) => {
    setAnnotationsHistory((prev) => {
      const nextPresent = prev.present.map((a) => (a.id === annotation.id ? annotation : a));
      return pushHistory(prev, nextPresent, areAnnotationListsEqual);
    });
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotationsHistory((prev) => {
      const nextPresent = prev.present.filter((a) => a.id !== id);
      return pushHistory(prev, nextPresent, areAnnotationListsEqual);
    });
    setSelectedAnnotationId((prevSelectedId) => (prevSelectedId === id ? null : prevSelectedId));
  }, []);

  // For compatibility with legacy comment thread calls
  const addComment = useCallback((_annotationId: string, _message: CommentMessage) => {
    // Pin annotations store comment text directly
  }, []);

  const resolveComment = useCallback((_threadId: string) => {
    // Pin annotations store comment text directly
  }, []);

  const document: AnnotationDocument = {
    id: `doc-${image?.name ?? 'initial'}`,
    title,
    image,
    annotations: annotationsHistory.present,
    comments: [],
    selectedAnnotationId,
    activeTool,
    activeColor,
    activeStrokeWidth,
  };

  return {
    document,
    canUndo: checkCanUndo(annotationsHistory),
    canRedo: checkCanRedo(annotationsHistory),
    historyCount: annotationsHistory.past.length,
    undo,
    redo,
    setImage,
    clearImage,
    setTitle,
    setActiveTool,
    setActiveColor,
    setActiveStrokeWidth,
    selectAnnotation,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    addComment,
    resolveComment,
  };
}
