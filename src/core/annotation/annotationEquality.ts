import type { Annotation, ArrowAnnotation, PinAnnotation, RectangleAnnotation } from '../../types/annotation';

/**
 * Compares two annotations for structural and visual equality.
 * Used to avoid polluting history with no-op actions.
 */
export function areAnnotationsEqual(a: Annotation, b: Annotation): boolean {
  if (a === b) return true;
  if (
    a.id !== b.id ||
    a.type !== b.type ||
    a.color !== b.color ||
    a.strokeWidth !== b.strokeWidth
  ) {
    return false;
  }

  switch (a.type) {
    case 'rectangle': {
      const bRect = b as RectangleAnnotation;
      return (
        a.x === bRect.x &&
        a.y === bRect.y &&
        a.width === bRect.width &&
        a.height === bRect.height &&
        a.fill === bRect.fill
      );
    }

    case 'arrow': {
      const bArrow = b as ArrowAnnotation;
      return (
        a.start.x === bArrow.start.x &&
        a.start.y === bArrow.start.y &&
        a.end.x === bArrow.end.x &&
        a.end.y === bArrow.end.y
      );
    }

    case 'pin': {
      const bPin = b as PinAnnotation;
      return a.x === bPin.x && a.y === bPin.y && a.text === bPin.text;
    }

    default:
      return JSON.stringify(a) === JSON.stringify(b);
  }
}

/**
 * Deep equality check between two lists of annotations.
 */
export function areAnnotationListsEqual(
  listA: readonly Annotation[],
  listB: readonly Annotation[]
): boolean {
  if (listA === listB) return true;
  if (listA.length !== listB.length) return false;

  for (let i = 0; i < listA.length; i++) {
    const itemA = listA[i]!;
    const itemB = listB[i]!;
    if (!areAnnotationsEqual(itemA, itemB)) {
      return false;
    }
  }

  return true;
}
