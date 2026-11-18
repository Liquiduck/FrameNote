/**
 * Maximum number of undo steps preserved in memory.
 * Caps heap usage while offering deep undo/redo capability.
 */
export const MAX_HISTORY_STEPS = 50;

/**
 * Immutable Undo/Redo History state manager.
 * Tracks past, present, and future states with a fixed capacity limit.
 * Guaranteed to never store heavy image blobs or volatile UI states.
 */
export interface HistoryState<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  readonly maxHistory: number;
}

export function createHistory<T>(initialPresent: T, maxHistory = MAX_HISTORY_STEPS): HistoryState<T> {
  return {
    past: [],
    present: initialPresent,
    future: [],
    maxHistory,
  };
}

export function canUndo<T>(state: HistoryState<T>): boolean {
  return state.past.length > 0;
}

export function canRedo<T>(state: HistoryState<T>): boolean {
  return state.future.length > 0;
}

/**
 * Pushes a new present state into history.
 * If nextPresent equals current present (via reference or comparator),
 * returns current state unchanged (no-op prevention).
 * Clears redo stack (future: []).
 */
export function pushHistory<T>(
  state: HistoryState<T>,
  nextPresent: T,
  isEqual?: (a: T, b: T) => boolean
): HistoryState<T> {
  const isSame = isEqual ? isEqual(state.present, nextPresent) : state.present === nextPresent;
  if (isSame) {
    return state;
  }

  const updatedPast = [...state.past, state.present];
  if (updatedPast.length > state.maxHistory) {
    updatedPast.shift();
  }

  return {
    past: updatedPast,
    present: nextPresent,
    future: [], // A new action after undo always clears redo history
    maxHistory: state.maxHistory,
  };
}

export function undoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (!canUndo(state)) {
    return state;
  }

  const previous = state.past[state.past.length - 1];
  if (previous === undefined) {
    return state;
  }

  const newPast = state.past.slice(0, state.past.length - 1);
  const newFuture = [state.present, ...state.future];

  return {
    past: newPast,
    present: previous,
    future: newFuture,
    maxHistory: state.maxHistory,
  };
}

export function redoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (!canRedo(state)) {
    return state;
  }

  const next = state.future[0];
  if (next === undefined) {
    return state;
  }

  const newPast = [...state.past, state.present];
  const newFuture = state.future.slice(1);

  return {
    past: newPast,
    present: next,
    future: newFuture,
    maxHistory: state.maxHistory,
  };
}

export function resetHistory<T>(initialPresent: T, maxHistory = MAX_HISTORY_STEPS): HistoryState<T> {
  return createHistory(initialPresent, maxHistory);
}
