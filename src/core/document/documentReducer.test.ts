import { describe, expect, it } from 'vitest';
import {
  INITIAL_DOCUMENT,
  documentReducer,
} from './documentReducer';
import type { ArrowAnnotation, PinAnnotation, RectangleAnnotation } from '../../types/annotation';
import type { LoadedImage } from '../../types/document';
import { getPinDisplayNumber } from '../annotation/pinGeometry';

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

  const sampleArrow: ArrowAnnotation = {
    id: 'arrow-1',
    type: 'arrow',
    createdAt: Date.now() + 10,
    color: '#ef4444',
    strokeWidth: 4,
    start: { x: 50, y: 50 },
    end: { x: 200, y: 200 },
  };

  const samplePin: PinAnnotation = {
    id: 'pin-1',
    type: 'pin',
    createdAt: Date.now() + 20,
    color: '#f59e0b',
    strokeWidth: 2,
    x: 250,
    y: 300,
    text: 'Check logo padding',
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

  it('deletes only the targeted annotation and retains others', () => {
    let state = documentReducer(INITIAL_DOCUMENT, {
      type: 'SET_IMAGE',
      payload: sampleImage,
    });

    state = documentReducer(state, {
      type: 'ADD_ANNOTATION',
      payload: sampleRect,
    });
    state = documentReducer(state, {
      type: 'ADD_ANNOTATION',
      payload: sampleArrow,
    });

    expect(state.annotations).toHaveLength(2);
    expect(state.selectedAnnotationId).toBe('arrow-1');

    state = documentReducer(state, {
      type: 'DELETE_ANNOTATION',
      payload: 'rect-1',
    });

    expect(state.annotations).toHaveLength(1);
    expect(state.annotations[0]?.id).toBe('arrow-1');
    expect(state.selectedAnnotationId).toBe('arrow-1');
  });

  it('updates pin comment text and preserves stable ID', () => {
    let state = documentReducer(INITIAL_DOCUMENT, {
      type: 'SET_IMAGE',
      payload: sampleImage,
    });

    state = documentReducer(state, {
      type: 'ADD_ANNOTATION',
      payload: samplePin,
    });

    const updatedPin: PinAnnotation = {
      ...samplePin,
      text: 'Revised: update padding to 24px',
    };

    state = documentReducer(state, {
      type: 'UPDATE_ANNOTATION',
      payload: updatedPin,
    });

    expect(state.annotations).toHaveLength(1);
    const pin = state.annotations[0] as PinAnnotation;
    expect(pin.id).toBe('pin-1');
    expect(pin.text).toBe('Revised: update padding to 24px');
  });

  it('renumbers multiple pins after one is deleted', () => {
    let state = documentReducer(INITIAL_DOCUMENT, {
      type: 'SET_IMAGE',
      payload: sampleImage,
    });

    const pin1: PinAnnotation = { ...samplePin, id: 'pin-1' };
    const pin2: PinAnnotation = { ...samplePin, id: 'pin-2', x: 400 };
    const pin3: PinAnnotation = { ...samplePin, id: 'pin-3', x: 600 };

    state = documentReducer(state, { type: 'ADD_ANNOTATION', payload: pin1 });
    state = documentReducer(state, { type: 'ADD_ANNOTATION', payload: pin2 });
    state = documentReducer(state, { type: 'ADD_ANNOTATION', payload: pin3 });

    expect(getPinDisplayNumber('pin-1', state.annotations)).toBe(1);
    expect(getPinDisplayNumber('pin-2', state.annotations)).toBe(2);
    expect(getPinDisplayNumber('pin-3', state.annotations)).toBe(3);

    // Delete pin-2
    state = documentReducer(state, { type: 'DELETE_ANNOTATION', payload: 'pin-2' });

    expect(state.annotations).toHaveLength(2);
    // pin-1 stays #1
    expect(getPinDisplayNumber('pin-1', state.annotations)).toBe(1);
    // pin-3 dynamically becomes #2
    expect(getPinDisplayNumber('pin-3', state.annotations)).toBe(2);
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
