import type { Annotation, PinAnnotation } from '../../types/annotation';
import { getPinDisplayNumber } from '../annotation/pinGeometry';

export interface AppendixTextLine {
  readonly text: string;
  readonly x: number;
  readonly y: number;
}

export interface AppendixCardLayout {
  readonly pin: PinAnnotation;
  readonly pinNumber: number;
  readonly x: number;
  readonly y: number; // Y position relative to start of appendix
  readonly width: number;
  readonly height: number;
  readonly badge: {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly color: string;
    readonly numberStr: string;
  };
  readonly title: {
    readonly text: string;
    readonly x: number;
    readonly y: number;
  };
  readonly lines: readonly AppendixTextLine[];
}

export interface AppendixLayout {
  readonly totalWidth: number;
  readonly totalHeight: number;
  readonly header: {
    readonly title: string;
    readonly subtitle: string;
    readonly titleY: number;
    readonly subtitleY: number;
  };
  readonly cards: readonly AppendixCardLayout[];
}

export type TextMeasureFn = (text: string, font?: string) => number;

/**
 * Default fallback text measurer (approx. 7.5px per character for ~13px sans-serif).
 * Used when running outside a full browser DOM/canvas environment.
 */
export const defaultTextMeasure: TextMeasureFn = (text: string) => text.length * 7.5;

/**
 * Wraps arbitrary text into lines based on maximum allowed pixel width.
 * Handles explicit newlines, word wrapping at spaces, and character-breaking for long unbroken strings.
 */
export function wrapTextLines(
  text: string,
  maxWidth: number,
  measureText: TextMeasureFn = defaultTextMeasure
): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const safeMaxWidth = Math.max(maxWidth, 40);
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (trimmed.length === 0) {
      lines.push('');
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (measureText(candidate) <= safeMaxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }

        // Check if the single word alone exceeds the available line width
        if (measureText(word) <= safeMaxWidth) {
          currentLine = word;
        } else {
          // Break unbroken long string character-by-character
          let chunk = '';
          for (const char of word) {
            if (measureText(chunk + char) <= safeMaxWidth) {
              chunk += char;
            } else {
              if (chunk) lines.push(chunk);
              chunk = char;
            }
          }
          currentLine = chunk;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Computes deterministic pixel layout for the comments appendix beneath an image.
 * Must be executed before allocating the final canvas buffer.
 */
export function computeAppendixLayout(
  imageWidth: number,
  pins: readonly PinAnnotation[],
  allAnnotations: readonly Annotation[],
  measureText: TextMeasureFn = defaultTextMeasure
): AppendixLayout {
  if (pins.length === 0 || imageWidth <= 0) {
    return {
      totalWidth: imageWidth,
      totalHeight: 0,
      header: {
        title: '',
        subtitle: '',
        titleY: 0,
        subtitleY: 0,
      },
      cards: [],
    };
  }

  // Padding & margins scaled proportionally to image width
  const paddingX = Math.max(20, Math.min(48, Math.round(imageWidth * 0.04)));
  const contentWidth = Math.max(imageWidth - paddingX * 2, 100);

  // Appendix Header
  const headerTopPadding = 24;
  const headerTitleY = headerTopPadding + 16;
  const headerSubtitleY = headerTitleY + 18;
  const headerHeight = 72;

  let currentY = headerHeight;
  const cardGap = 12;
  const badgeRadius = 12;
  const cardInternalPaddingX = 16;
  const cardInternalPaddingY = 14;
  const badgeToTextGap = 12;
  const lineHeight = 20;

  const textStartX = paddingX + cardInternalPaddingX + badgeRadius * 2 + badgeToTextGap;
  const textMaxWidth = Math.max(
    contentWidth - (cardInternalPaddingX * 2 + badgeRadius * 2 + badgeToTextGap),
    60
  );

  const cards: AppendixCardLayout[] = [];

  for (const pin of pins) {
    const pinNumber = getPinDisplayNumber(pin.id, allAnnotations);
    const rawText = pin.text.trim();
    const displayText = rawText.length > 0 ? rawText : '(No comment text provided)';
    const isMutedFallback = rawText.length === 0;

    const wrappedLines = wrapTextLines(displayText, textMaxWidth, measureText);
    const lineCount = Math.max(wrappedLines.length, 1);

    const titleHeight = 18;
    const titleToBodyGap = 6;
    const bodyHeight = lineCount * lineHeight;
    const cardContentHeight = titleHeight + titleToBodyGap + bodyHeight;
    const cardHeight = Math.max(
      cardContentHeight + cardInternalPaddingY * 2,
      badgeRadius * 2 + cardInternalPaddingY * 2
    );

    const cardY = currentY;
    const cardX = paddingX;

    const badgeX = cardX + cardInternalPaddingX + badgeRadius;
    const badgeY = cardY + cardInternalPaddingY + badgeRadius;

    const titleX = textStartX;
    const titleY = cardY + cardInternalPaddingY + 12;

    const lineObjects: AppendixTextLine[] = wrappedLines.map((line, idx) => ({
      text: line,
      x: textStartX,
      y: titleY + titleToBodyGap + 14 + idx * lineHeight,
    }));

    cards.push({
      pin,
      pinNumber,
      x: cardX,
      y: cardY,
      width: contentWidth,
      height: cardHeight,
      badge: {
        x: badgeX,
        y: badgeY,
        radius: badgeRadius,
        color: pin.color,
        numberStr: pinNumber.toString(),
      },
      title: {
        text: `Feedback #${pinNumber}`,
        x: titleX,
        y: titleY,
      },
      lines: isMutedFallback
        ? [{ text: '(No comment text entered)', x: textStartX, y: titleY + titleToBodyGap + 14 }]
        : lineObjects,
    });

    currentY += cardHeight + cardGap;
  }

  const bottomPadding = 24;
  const totalHeight = currentY - cardGap + bottomPadding;

  return {
    totalWidth: imageWidth,
    totalHeight,
    header: {
      title: 'Feedback & Comments',
      subtitle: `${pins.length} ${pins.length === 1 ? 'note' : 'notes'} on this screenshot`,
      titleY: headerTitleY,
      subtitleY: headerSubtitleY,
    },
    cards,
  };
}
