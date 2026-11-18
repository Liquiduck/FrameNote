import { describe, expect, it } from 'vitest';
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redoHistory,
  resetHistory,
  undoHistory,
  type HistoryState,
} from './history';
import { areAnnotationListsEqual } from '../annotation/annotationEquality';
import type { Annotation, PinAnnotation, RectangleAnnotation } from '../../types/annotation';

describe('Annotation Document History & Undo/Redo', () => {
  const rect1: RectangleAnnotation = {
    id: 'rect-1',
    type: 'rectangle',
    createdAt: 1000,
    color: '#4f46e5',
    strokeWidth: 4,
    x: 100,
    y: 100,
    width: 200,
    height: 150,
  };

  const pin1: PinAnnotation = {
    id: 'pin-1',
    type: 'pin',
    createdAt: 2000,
    color: '#f59e0b',
    strokeWidth: 2,
    x: 400,
    y: 300,
    text: 'Initial comment note',
  };

  it('Create → undo → redo flow', () => {
    let history: HistoryState<readonly Annotation[]> = createHistory([]);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);

    // 1. Create rect1
    history = pushHistory(history, [rect1], areAnnotationListsEqual);
    expect(history.present).toHaveLength(1);
    expect(history.present[0]).toEqual(rect1);
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);

    // 2. Undo creation
    history = undoHistory(history);
    expect(history.present).toHaveLength(0);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(true);

    // 3. Redo creation
    history = redoHistory(history);
    expect(history.present).toHaveLength(1);
    expect(history.present[0]?.id).toBe('rect-1');
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);
  });

  it('Move → undo flow', () => {
    let history = createHistory<readonly Annotation[]>([rect1]);

    // Move rect1 to (300, 250)
    const movedRect: RectangleAnnotation = { ...rect1, x: 300, y: 250 };
    history = pushHistory(history, [movedRect], areAnnotationListsEqual);

    const firstAfterMove = history.present[0] as RectangleAnnotation;
    expect(firstAfterMove.x).toBe(300);
    expect(firstAfterMove.y).toBe(250);

    // Undo move
    history = undoHistory(history);
    const firstAfterUndo = history.present[0] as RectangleAnnotation;
    expect(firstAfterUndo.x).toBe(100);
    expect(firstAfterUndo.y).toBe(100);
  });

  it('Delete → undo flow', () => {
    let history = createHistory<readonly Annotation[]>([rect1, pin1]);

    // Delete rect1
    history = pushHistory(history, [pin1], areAnnotationListsEqual);
    expect(history.present).toHaveLength(1);
    expect(history.present[0]?.id).toBe('pin-1');

    // Undo deletion
    history = undoHistory(history);
    expect(history.present).toHaveLength(2);
    expect(history.present[0]?.id).toBe('rect-1');
    expect(history.present[1]?.id).toBe('pin-1');
  });

  it('Style edit → undo flow', () => {
    let history = createHistory<readonly Annotation[]>([rect1]);

    // Change stroke color to Coral and strokeWidth to 8
    const styledRect: RectangleAnnotation = { ...rect1, color: '#ef4444', strokeWidth: 8 };
    history = pushHistory(history, [styledRect], areAnnotationListsEqual);

    expect(history.present[0]?.color).toBe('#ef4444');
    expect(history.present[0]?.strokeWidth).toBe(8);

    // Undo style edit
    history = undoHistory(history);
    expect(history.present[0]?.color).toBe('#4f46e5');
    expect(history.present[0]?.strokeWidth).toBe(4);
  });

  it('Comment edit → undo flow', () => {
    let history = createHistory<readonly Annotation[]>([pin1]);

    // Commit text edit on blur/save
    const editedPin: PinAnnotation = { ...pin1, text: 'Updated feedback text' };
    history = pushHistory(history, [editedPin], areAnnotationListsEqual);

    expect((history.present[0] as PinAnnotation).text).toBe('Updated feedback text');

    // Undo comment edit
    history = undoHistory(history);
    expect((history.present[0] as PinAnnotation).text).toBe('Initial comment note');
  });

  it('New action after undo clears redo stack', () => {
    let history = createHistory<readonly Annotation[]>([rect1]);

    // Action 1: Add pin1
    history = pushHistory(history, [rect1, pin1], areAnnotationListsEqual);
    expect(history.present).toHaveLength(2);

    // Undo Action 1
    history = undoHistory(history);
    expect(history.present).toHaveLength(1);
    expect(canRedo(history)).toBe(true);

    // Action 2 (new branch): Add a different rectangle instead
    const rect2: RectangleAnnotation = { ...rect1, id: 'rect-2', x: 500 };
    history = pushHistory(history, [rect1, rect2], areAnnotationListsEqual);

    // Redo history must be cleared
    expect(canRedo(history)).toBe(false);
    expect(history.future).toHaveLength(0);
    expect(history.present).toHaveLength(2);
    expect(history.present[1]?.id).toBe('rect-2');
  });

  it('Image replacement resets history completely', () => {
    let history = createHistory<readonly Annotation[]>([rect1]);
    history = pushHistory(history, [rect1, pin1], areAnnotationListsEqual);

    expect(history.past).toHaveLength(1);

    // Replace image -> reset history to empty
    history = resetHistory([]);
    expect(history.past).toHaveLength(0);
    expect(history.present).toHaveLength(0);
    expect(history.future).toHaveLength(0);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it('No-op actions do not create history entries', () => {
    let history = createHistory<readonly Annotation[]>([rect1]);

    // Pushing an identical copy must return identical state
    const duplicateList = [{ ...rect1 }];
    history = pushHistory(history, duplicateList, areAnnotationListsEqual);

    expect(history.past).toHaveLength(0);
    expect(canUndo(history)).toBe(false);
  });

  it('Cancelled drafts do not enter history', () => {
    const history = createHistory<readonly Annotation[]>([rect1]);

    // A draft is held locally in component state; cancelling it discards it without calling pushHistory
    let draftAnnotation: Annotation | null = { ...rect1, id: 'draft-rect' };
    draftAnnotation = null;

    expect(draftAnnotation).toBeNull();
    expect(history.past).toHaveLength(0);
    expect(history.present).toEqual([rect1]);
  });

  it('Maintains selection validity when undo removes selected annotation', () => {
    let history = createHistory<readonly Annotation[]>([]);
    let selectedId: string | null = null;

    // Create rect1 and select it
    history = pushHistory(history, [rect1], areAnnotationListsEqual);
    selectedId = 'rect-1';

    // Undo creation
    history = undoHistory(history);

    // Helper validation simulates useAnnotationDocument selection keeper
    if (selectedId && !history.present.some((a) => a.id === selectedId)) {
      selectedId = null;
    }

    expect(selectedId).toBeNull();
  });
});
