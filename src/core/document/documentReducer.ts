import type { Annotation, AnnotationTool, CommentMessage, CommentThread } from '../../types/annotation';
import type { AnnotationDocument, LoadedImage } from '../../types/document';

export const INITIAL_DOCUMENT: AnnotationDocument = {
  id: 'doc-initial',
  title: 'Untitled Screenshot',
  image: null,
  annotations: [],
  comments: [],
  selectedAnnotationId: null,
  activeTool: 'select',
};

export type DocumentAction =
  | { type: 'SET_IMAGE'; payload: LoadedImage }
  | { type: 'CLEAR_IMAGE' }
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_ACTIVE_TOOL'; payload: AnnotationTool }
  | { type: 'SELECT_ANNOTATION'; payload: string | null }
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'UPDATE_ANNOTATION'; payload: Annotation }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'ADD_COMMENT'; payload: { annotationId: string; message: CommentMessage } }
  | { type: 'RESOLVE_COMMENT'; payload: string };

export function documentReducer(
  state: AnnotationDocument,
  action: DocumentAction
): AnnotationDocument {
  switch (action.type) {
    case 'SET_IMAGE': {
      return {
        ...state,
        id: `doc-${Date.now()}`,
        title: action.payload.name.replace(/\.[^/.]+$/, ''),
        image: action.payload,
        annotations: [],
        comments: [],
        selectedAnnotationId: null,
      };
    }

    case 'CLEAR_IMAGE': {
      return INITIAL_DOCUMENT;
    }

    case 'SET_TITLE': {
      return {
        ...state,
        title: action.payload.trim() || 'Untitled Screenshot',
      };
    }

    case 'SET_ACTIVE_TOOL': {
      return {
        ...state,
        activeTool: action.payload,
        // Deselect if switching away from select tool
        selectedAnnotationId: action.payload === 'select' ? state.selectedAnnotationId : null,
      };
    }

    case 'SELECT_ANNOTATION': {
      return {
        ...state,
        selectedAnnotationId: action.payload,
      };
    }

    case 'ADD_ANNOTATION': {
      return {
        ...state,
        annotations: [...state.annotations, action.payload],
        selectedAnnotationId: action.payload.id,
      };
    }

    case 'UPDATE_ANNOTATION': {
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    }

    case 'DELETE_ANNOTATION': {
      return {
        ...state,
        annotations: state.annotations.filter((a) => a.id !== action.payload),
        comments: state.comments.filter((c) => c.annotationId !== action.payload),
        selectedAnnotationId:
          state.selectedAnnotationId === action.payload ? null : state.selectedAnnotationId,
      };
    }

    case 'ADD_COMMENT': {
      const { annotationId, message } = action.payload;
      const existingThreadIndex = state.comments.findIndex(
        (c) => c.annotationId === annotationId
      );

      let updatedComments: CommentThread[];
      if (existingThreadIndex >= 0) {
        const existing = state.comments[existingThreadIndex]!;
        const updatedThread: CommentThread = {
          ...existing,
          messages: [...existing.messages, message],
        };
        updatedComments = [
          ...state.comments.slice(0, existingThreadIndex),
          updatedThread,
          ...state.comments.slice(existingThreadIndex + 1),
        ];
      } else {
        const newThread: CommentThread = {
          id: `comment-${Date.now()}`,
          annotationId,
          messages: [message],
          resolved: false,
        };
        updatedComments = [...state.comments, newThread];
      }

      return {
        ...state,
        comments: updatedComments,
      };
    }

    case 'RESOLVE_COMMENT': {
      return {
        ...state,
        comments: state.comments.map((c) =>
          c.id === action.payload ? { ...c, resolved: !c.resolved } : c
        ),
      };
    }

    default:
      return state;
  }
}
