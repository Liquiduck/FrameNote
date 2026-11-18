import { describe, expect, it } from 'vitest';
import {
  computeAppendixLayout,
  wrapTextLines,
  type TextMeasureFn,
} from './appendixLayout';
import type { PinAnnotation, RectangleAnnotation } from '../../types/annotation';

describe('appendixLayout', () => {
  // Simple deterministic monospace-style measurer: 1 char = 10 px
  const mockMeasure: TextMeasureFn = (text: string) => text.length * 10;

  describe('wrapTextLines', () => {
    it('returns empty array for empty or whitespace text', () => {
      expect(wrapTextLines('', 200, mockMeasure)).toEqual([]);
      expect(wrapTextLines('   \n  ', 200, mockMeasure)).toEqual([]);
    });

    it('keeps short text on a single line when within maxWidth', () => {
      const text = 'Hello world';
      // 11 chars * 10 = 110 px <= 200 px
      const lines = wrapTextLines(text, 200, mockMeasure);
      expect(lines).toEqual(['Hello world']);
    });

    it('wraps multiple words at space boundaries when exceeding maxWidth', () => {
      const text = 'One two three four five six';
      // maxWidth 120 px allows up to 12 chars
      const lines = wrapTextLines(text, 120, mockMeasure);
      expect(lines).toEqual([
        'One two',
        'three four',
        'five six',
      ]);
    });

    it('preserves explicit newline breaks', () => {
      const text = 'First line\nSecond line\n\nFourth line';
      const lines = wrapTextLines(text, 300, mockMeasure);
      expect(lines).toEqual([
        'First line',
        'Second line',
        '',
        'Fourth line',
      ]);
    });

    it('breaks long unbroken strings character-by-character to prevent overflow', () => {
      const longUrl = 'https://example.com/very/long/unbroken/path/that/cannot/be/split/normally';
      // maxWidth 100 px = 10 chars per chunk
      const lines = wrapTextLines(longUrl, 100, mockMeasure);
      expect(lines.length).toBeGreaterThan(1);
      for (const line of lines) {
        expect(mockMeasure(line)).toBeLessThanOrEqual(100);
      }
      expect(lines.join('')).toBe(longUrl);
    });
  });

  describe('computeAppendixLayout', () => {
    const pins: PinAnnotation[] = [
      {
        id: 'pin-1',
        type: 'pin',
        createdAt: 1000,
        color: '#ef4444',
        strokeWidth: 2,
        x: 150,
        y: 200,
        text: 'Fix contrast on this button',
      },
      {
        id: 'pin-2',
        type: 'pin',
        createdAt: 2000,
        color: '#3b82f6',
        strokeWidth: 2,
        x: 400,
        y: 350,
        text: 'Align header navigation items with the logo',
      },
    ];

    it('returns zero height and empty cards when there are no pins', () => {
      const layout = computeAppendixLayout(1200, [], [], mockMeasure);
      expect(layout.totalHeight).toBe(0);
      expect(layout.cards).toHaveLength(0);
      expect(layout.totalWidth).toBe(1200);
    });

    it('computes layout dimensions matching image width', () => {
      const layout = computeAppendixLayout(1000, pins, pins, mockMeasure);
      expect(layout.totalWidth).toBe(1000);
      expect(layout.totalHeight).toBeGreaterThan(100);
      expect(layout.cards).toHaveLength(2);
    });

    it('derives sequential display numbers matching sidebar numbering', () => {
      const layout = computeAppendixLayout(1000, pins, pins, mockMeasure);
      expect(layout.cards[0]?.pinNumber).toBe(1);
      expect(layout.cards[0]?.badge.numberStr).toBe('1');
      expect(layout.cards[0]?.title.text).toBe('Feedback #1');

      expect(layout.cards[1]?.pinNumber).toBe(2);
      expect(layout.cards[1]?.badge.numberStr).toBe('2');
      expect(layout.cards[1]?.title.text).toBe('Feedback #2');
    });

    it('derives consistent numbering even when other shape annotations precede pins', () => {
      const rect: RectangleAnnotation = {
        id: 'rect-1',
        type: 'rectangle',
        createdAt: 500,
        color: '#4f46e5',
        strokeWidth: 2,
        x: 10,
        y: 10,
        width: 100,
        height: 100,
      };

      const allAnnotations = [rect, ...pins];
      const layout = computeAppendixLayout(1000, pins, allAnnotations, mockMeasure);

      expect(layout.cards[0]?.pinNumber).toBe(1);
      expect(layout.cards[1]?.pinNumber).toBe(2);
    });

    it('positions comment cards sequentially without vertical overlap', () => {
      const layout = computeAppendixLayout(800, pins, pins, mockMeasure);
      const card0 = layout.cards[0]!;
      const card1 = layout.cards[1]!;

      // Card 1 top must be below Card 0 bottom
      expect(card1.y).toBeGreaterThanOrEqual(card0.y + card0.height);
      // Total height must enclose all cards plus padding
      expect(layout.totalHeight).toBeGreaterThanOrEqual(card1.y + card1.height);
    });

    it('handles empty pin text with placeholder note', () => {
      const emptyPin: PinAnnotation = {
        id: 'pin-empty',
        type: 'pin',
        createdAt: 3000,
        color: '#10b981',
        strokeWidth: 2,
        x: 100,
        y: 100,
        text: '',
      };

      const layout = computeAppendixLayout(800, [emptyPin], [emptyPin], mockMeasure);
      expect(layout.cards[0]?.lines).toHaveLength(1);
      expect(layout.cards[0]?.lines[0]?.text).toContain('No comment text');
    });
  });
});
