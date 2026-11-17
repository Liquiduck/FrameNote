import { describe, expect, it } from 'vitest';
import {
  INITIAL_DOCUMENT,
  documentReducer,
} from './documentReducer';
import type { RectangleAnnotation } from '../../types/annotation';
import type { LoadedImage } from '../../types/document';

describe('documentReducer', () => {
  const sampleImage: LoadedImage = {
    src: 'blob:http://localhost/mock-uuid',
    name: 'dashboard-preview.png',
    width: 1200,
    height: 800,
    sizeBytes: 1048576,
  };

  const sampleRect: RectangleAnnotation = {
    id: 'rect-1',
    type: 'rectangle',
    createdAt: Date.now(),
    color: '#4f46e5',
    strokeWidth: 2,
    x: 100,
    y: 150,
    width: 300,
    height: 200,
  };

  it('sets image and initializes document title', () => {
    const state = documentReducer(INITIAL_DOCUMENT, {
      type: 'SET_IMAGE',
      payload: sampleImage,
    });

    expect(state.image).toEqual(sampleImage);
    expect(state.title).toBe('dashboard-preview');
    expect(state.annotations).toHaveLength(0);
    expect(state.comments).toHaveLength(0);
  });

  it('adds and selects annotations', () => {
    let state = documentReducer(INITIAL_DOCUMENT, {
      type: 'SET_IMAGE',
      payload: sampleImage,
    });

    state = documentReducer(state, {
      type: 'ADD_ANNOTATION',
      payload: sampleRect,
    });

    expect(state.annotations).toHaveLength(1);
    expect(state.annotations[0]).toEqual(sampleRect);
    expect(state.selectedAnnotationId).toBe('rect-1');
  });

  it('deletes an annotation and deselects it', () => {
    let state = documentReducer(INITIAL_DOCUMENT, {
      type: 'SET_IMAGE',
      payload: sampleImage,
    });

    state = documentReducer(state, {
      type: 'ADD_ANNOTATION',
      payload: sampleRect,
    });

    state = documentReducer(state, {
      type: 'DELETE_ANNOTATION',
      payload: 'rect-1',
    });

    expect(state.annotations).toHaveLength(0);
    expect(state.selectedAnnotationId).toBeNull();
  });

  it('adds comments to annotation threads', () => {
    let state = documentReducer(INITIAL_DOCUMENT, {
      type: 'SET_IMAGE',
      payload: sampleImage,
    });

    state = documentReducer(state, {
      type: 'ADD_COMMENT',
      payload: {
        annotationId: 'rect-1',
        message: {
          id: 'msg-1',
          author: 'Alex',
          content: 'Increase button contrast here',
          timestamp: Date.now(),
        },
      },
    });

    expect(state.comments).toHaveLength(1);
    expect(state.comments[0]?.annotationId).toBe('rect-1');
    expect(state.comments[0]?.messages[0]?.content).toBe('Increase button contrast here');
  });

  it('updates active tool, color, and stroke width', () => {
    let state = documentReducer(INITIAL_DOCUMENT, {
      type: 'SET_ACTIVE_TOOL',
      payload: 'rectangle',
    });
    expect(state.activeTool).toBe('rectangle');

    state = documentReducer(state, {
      type: 'SET_ACTIVE_COLOR',
      payload: '#ef4444',
    });
    expect(state.activeColor).toBe('#ef4444');

    state = documentReducer(state, {
      type: 'SET_ACTIVE_STROKE_WIDTH',
      payload: 8,
    });
    expect(state.activeStrokeWidth).toBe(8);
  });
});
