import { useCallback, useState } from 'react';
import type { Annotation, AnnotationTool, CommentMessage } from '../types/annotation';
import type { AnnotationDocument, LoadedImage } from '../types/document';
import {
  INITIAL_DOCUMENT,
  documentReducer,
  type DocumentAction,
} from '../core/document/documentReducer';
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

export function useAnnotationDocument() {
  const [history, setHistory] = useState<HistoryState<AnnotationDocument>>(() =>
    createHistory(INITIAL_DOCUMENT)
  );

  const document = history.present;

  const dispatch = useCallback((action: DocumentAction, trackHistory = true) => {
    setHistory((prev) => {
      const nextPresent = documentReducer(prev.present, action);
      if (nextPresent === prev.present) return prev;

      if (!trackHistory) {
        return { ...prev, present: nextPresent };
      }

      // Actions like SELECT_ANNOTATION or SET_ACTIVE_TOOL don't need undo/redo steps
      const isTransient =
        action.type === 'SELECT_ANNOTATION' || action.type === 'SET_ACTIVE_TOOL';

      if (isTransient) {
        return { ...prev, present: nextPresent };
      }

      return pushHistory(prev, nextPresent);
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => undoHistory(prev));
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => redoHistory(prev));
  }, []);

  const setImage = useCallback(
    (image: LoadedImage) => {
      const nextDoc = documentReducer(INITIAL_DOCUMENT, {
        type: 'SET_IMAGE',
        payload: image,
      });
      setHistory(resetHistory(nextDoc));
    },
    []
  );

  const clearImage = useCallback(() => {
    setHistory(resetHistory(INITIAL_DOCUMENT));
  }, []);

  const setTitle = useCallback(
    (title: string) => {
      dispatch({ type: 'SET_TITLE', payload: title }, false);
    },
    [dispatch]
  );

  const setActiveTool = useCallback(
    (tool: AnnotationTool) => {
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool }, false);
    },
    [dispatch]
  );

  const selectAnnotation = useCallback(
    (id: string | null) => {
      dispatch({ type: 'SELECT_ANNOTATION', payload: id }, false);
    },
    [dispatch]
  );

  const addAnnotation = useCallback(
    (annotation: Annotation) => {
      dispatch({ type: 'ADD_ANNOTATION', payload: annotation }, true);
    },
    [dispatch]
  );

  const updateAnnotation = useCallback(
    (annotation: Annotation) => {
      dispatch({ type: 'UPDATE_ANNOTATION', payload: annotation }, true);
    },
    [dispatch]
  );

  const deleteAnnotation = useCallback(
    (id: string) => {
      dispatch({ type: 'DELETE_ANNOTATION', payload: id }, true);
    },
    [dispatch]
  );

  const addComment = useCallback(
    (annotationId: string, message: CommentMessage) => {
      dispatch({ type: 'ADD_COMMENT', payload: { annotationId, message } }, true);
    },
    [dispatch]
  );

  const resolveComment = useCallback(
    (threadId: string) => {
      dispatch({ type: 'RESOLVE_COMMENT', payload: threadId }, true);
    },
    [dispatch]
  );

  return {
    document,
    canUndo: checkCanUndo(history),
    canRedo: checkCanRedo(history),
    historyCount: history.past.length,
    undo,
    redo,
    setImage,
    clearImage,
    setTitle,
    setActiveTool,
    selectAnnotation,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    addComment,
    resolveComment,
  };
}
