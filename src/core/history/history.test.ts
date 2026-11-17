import { describe, expect, it } from 'vitest';
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redoHistory,
  resetHistory,
  undoHistory,
} from './history';

describe('Undo/Redo History state manager', () => {
  it('initializes with empty past and future', () => {
    const history = createHistory('step0');
    expect(history.present).toBe('step0');
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it('pushes new states and clears redo future', () => {
    let history = createHistory('step0');
    history = pushHistory(history, 'step1');
    history = pushHistory(history, 'step2');

    expect(history.present).toBe('step2');
    expect(history.past).toEqual(['step0', 'step1']);
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);
  });

  it('undoes and redoes correctly', () => {
    let history = createHistory('step0');
    history = pushHistory(history, 'step1');
    history = pushHistory(history, 'step2');

    // Undo step2 -> step1
    history = undoHistory(history);
    expect(history.present).toBe('step1');
    expect(history.future).toEqual(['step2']);
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(true);

    // Undo step1 -> step0
    history = undoHistory(history);
    expect(history.present).toBe('step0');
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(true);

    // Redo step0 -> step1
    history = redoHistory(history);
    expect(history.present).toBe('step1');
    expect(canUndo(history)).toBe(true);

    // Redo step1 -> step2
    history = redoHistory(history);
    expect(history.present).toBe('step2');
    expect(canRedo(history)).toBe(false);
  });

  it('truncates redo history if a new state is pushed after undo', () => {
    let history = createHistory('step0');
    history = pushHistory(history, 'step1');
    history = pushHistory(history, 'step2');

    // Undo to step1
    history = undoHistory(history);
    expect(history.present).toBe('step1');

    // Push new branch 'step1-alt'
    history = pushHistory(history, 'step1-alt');
    expect(history.present).toBe('step1-alt');
    expect(history.future).toEqual([]);
    expect(canRedo(history)).toBe(false);
  });

  it('enforces maxHistory limit', () => {
    let history = createHistory(0, 3);
    history = pushHistory(history, 1);
    history = pushHistory(history, 2);
    history = pushHistory(history, 3);
    history = pushHistory(history, 4);

    expect(history.past.length).toBe(3);
    expect(history.past).toEqual([1, 2, 3]);
    expect(history.present).toBe(4);
  });

  it('resets cleanly to initial state', () => {
    let history = createHistory('initial');
    history = pushHistory(history, 'next');
    history = resetHistory('brand-new');

    expect(history.present).toBe('brand-new');
    expect(history.past).toEqual([]);
    expect(history.future).toEqual([]);
  });
});
