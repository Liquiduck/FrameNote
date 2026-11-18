import type { Annotation } from '../../types/annotation';
import type { LoadedImage } from '../../types/document';
import { calculateArrowGeometry } from '../annotation/arrowGeometry';
import { getAllPins, getPinDisplayNumber, PIN_RADIUS } from '../annotation/pinGeometry';
import { MAX_IMAGE_DIMENSION, MAX_IMAGE_PIXELS } from '../image/imageConstants';
import {
  computeAppendixLayout,
  type AppendixCardLayout,
  type AppendixLayout,
  type TextMeasureFn,
} from './appendixLayout';

export interface ExportOptions {
  readonly scale?: number; // 1 = 1x native resolution
  readonly mimeType?: 'image/png' | 'image/jpeg';
  readonly quality?: number;
  readonly fileName?: string;
  readonly includeAppendix?: boolean;
}

export interface ExportDimensionCheck {
  readonly width: number;
  readonly height: number;
  readonly totalPixels: number;
  readonly appendixHeight: number;
  readonly willExceedLimit: boolean;
  readonly reason?: string;
}

/**
 * Computes a sanitized and descriptive filename for the downloaded PNG.
 * Example: "dashboard-annotated.png" or "dashboard-annotated-with-notes.png".
 */
export function getExportFilename(
  originalName: string | undefined,
  includeAppendix = false
): string {
  const baseName = originalName
    ? originalName.replace(/\.[^/.]+$/, '').trim()
    : 'framenote';

  const cleanBase = baseName.length > 0 ? baseName : 'framenote';
  const suffix = includeAppendix ? '-annotated-with-notes.png' : '-annotated.png';
  return `${cleanBase}${suffix}`;
}

/**
 * Pre-checks whether exporting the document with or without the appendix
 * exceeds the documented canvas dimension or total pixel limits.
 */
export function checkExportDimensions(
  image: LoadedImage,
  annotations: readonly Annotation[],
  includeAppendix = false,
  measureText?: TextMeasureFn
): ExportDimensionCheck {
  const width = image.width;
  let appendixHeight = 0;

  if (includeAppendix) {
    const pins = getAllPins(annotations);
    if (pins.length > 0) {
      const layout = computeAppendixLayout(width, pins, annotations, measureText);
      appendixHeight = layout.totalHeight;
    }
  }

  const height = image.height + appendixHeight;
  const totalPixels = width * height;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return {
      width,
      height,
      totalPixels,
      appendixHeight,
      willExceedLimit: true,
      reason: `Dimensions (${width} × ${height} px) exceed maximum limit of ${MAX_IMAGE_DIMENSION} px.`,
    };
  }

  if (totalPixels > MAX_IMAGE_PIXELS) {
    return {
      width,
      height,
      totalPixels,
      appendixHeight,
      willExceedLimit: true,
      reason: `Total resolution (${(totalPixels / 1_000_000).toFixed(1)} MP) exceeds maximum limit of ${MAX_IMAGE_PIXELS / 1_000_000} MP.`,
    };
  }

  return {
    width,
    height,
    totalPixels,
    appendixHeight,
    willExceedLimit: false,
  };
}

/**
 * Renders the base image and all annotations (defined in native image coordinates)
 * to an off-screen HTML5 canvas, and produces a high-fidelity PNG blob.
 * Selection indicators, handles, drafts, and hit targets are strictly excluded.
 */
export async function renderDocumentToBlob(
  image: LoadedImage,
  annotations: readonly Annotation[],
  options: ExportOptions = {}
): Promise<Blob> {
  const scale = options.scale ?? 1;
  const mimeType = options.mimeType ?? 'image/png';
  const quality = options.quality ?? 0.95;
  const includeAppendix = Boolean(options.includeAppendix);

  // 1. Compute Appendix layout if requested
  const pins = getAllPins(annotations);
  const shouldRenderAppendix = includeAppendix && pins.length > 0;

  // Use a temporary context to measure text accurately with the real canvas font engine
  let measureText: TextMeasureFn | undefined;
  try {
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    if (measureCtx) {
      measureCtx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      measureText = (text: string) => measureCtx.measureText(text).width;
    }
  } catch {
    // Falls back to defaultTextMeasure
  }

  const appendixLayout: AppendixLayout | null = shouldRenderAppendix
    ? computeAppendixLayout(image.width, pins, annotations, measureText)
    : null;

  const appendixHeight = appendixLayout?.totalHeight ?? 0;
  const targetWidth = image.width;
  const targetHeight = image.height + appendixHeight;

  // 2. Validate bounds before canvas buffer allocation
  const check = checkExportDimensions(image, annotations, shouldRenderAppendix, measureText);
  if (check.willExceedLimit) {
    throw new Error(`Export rejected: ${check.reason}`);
  }

  // 3. Allocate canvas
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(targetWidth * scale);
  canvas.height = Math.round(targetHeight * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not allocate 2D rendering context for canvas export');
  }

  // 4. Load native image element safely
  const imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to decode image element for export'));
    el.src = image.src;
  });

  ctx.save();
  ctx.scale(scale, scale);

  // 5. Draw base screenshot at native unscaled dimensions
  ctx.drawImage(imgElement, 0, 0, image.width, image.height);

  // 6. Render each annotation in document order using original image-space coordinates
  for (const annotation of annotations) {
    renderAnnotationToCanvas(ctx, annotation, annotations);
  }

  // 7. Render Comments Appendix (if applicable)
  if (appendixLayout && appendixLayout.cards.length > 0) {
    renderAppendixToCanvas(ctx, appendixLayout, image.height);
  }

  ctx.restore();

  // 8. Encode to PNG Blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas failed to export image blob (browser memory may be exhausted)'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Triggers a browser download for the exported blob and safely cleans up the temporary URL.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up object URL safely after download initiates
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore
    }
  }, 1000);
}

/**
 * Canvas rendering for individual annotations in native image coordinates.
 */
function renderAnnotationToCanvas(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  allAnnotations: readonly Annotation[]
): void {
  ctx.save();
  ctx.strokeStyle = annotation.color;
  ctx.fillStyle = annotation.color;
  ctx.lineWidth = annotation.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (annotation.type) {
    case 'rectangle': {
      if (annotation.fill && annotation.fill !== 'transparent') {
        ctx.fillStyle = annotation.fill;
        ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
      }
      ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
      break;
    }

    case 'arrow': {
      const geom = calculateArrowGeometry(annotation.start, annotation.end, annotation.strokeWidth);

      // Shaft
      ctx.beginPath();
      ctx.moveTo(geom.start.x, geom.start.y);
      ctx.lineTo(geom.end.x, geom.end.y);
      ctx.stroke();

      // Solid arrowhead using shared geometry helper
      ctx.beginPath();
      ctx.moveTo(geom.head.tip.x, geom.head.tip.y);
      ctx.lineTo(geom.head.leftBarb.x, geom.head.leftBarb.y);
      ctx.lineTo(geom.head.rightBarb.x, geom.head.rightBarb.y);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'pin': {
      const pinNumber = getPinDisplayNumber(annotation.id, allAnnotations);
      const radius = PIN_RADIUS;

      // Outer circle
      ctx.beginPath();
      ctx.arc(annotation.x, annotation.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = annotation.color;
      ctx.fill();

      // White boundary stroke for contrast against any screenshot background
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Number text centered in white
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pinNumber.toString(), annotation.x, annotation.y);
      break;
    }

    case 'pen': {
      if (annotation.points.length < 2) break;
      ctx.beginPath();
      const first = annotation.points[0]!;
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < annotation.points.length; i++) {
        const pt = annotation.points[i]!;
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      break;
    }

    case 'text': {
      ctx.font = `600 ${annotation.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(annotation.text, annotation.x, annotation.y);
      break;
    }

    case 'callout': {
      const radius = PIN_RADIUS;
      ctx.beginPath();
      ctx.arc(annotation.x, annotation.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = annotation.color;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(annotation.index.toString(), annotation.x, annotation.y);
      break;
    }

    case 'blur': {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
      break;
    }
  }

  ctx.restore();
}

/**
 * Renders the formatted comments appendix beneath the screenshot image.
 */
function renderAppendixToCanvas(
  ctx: CanvasRenderingContext2D,
  layout: AppendixLayout,
  imageHeight: number
): void {
  ctx.save();

  // 1. Appendix Background Surface (warm off-white matching FrameNote tokens)
  ctx.fillStyle = '#f8f6f0';
  ctx.fillRect(0, imageHeight, layout.totalWidth, layout.totalHeight);

  // 2. Top Divider Line separating screenshot from appendix
  ctx.strokeStyle = '#dad4c7';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, imageHeight + 0.5);
  ctx.lineTo(layout.totalWidth, imageHeight + 0.5);
  ctx.stroke();

  // 3. Appendix Header Title & Subtitle
  const headerBaseY = imageHeight;
  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(layout.header.title, 32, headerBaseY + layout.header.titleY);

  ctx.fillStyle = '#71717a';
  ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(layout.header.subtitle, 32, headerBaseY + layout.header.subtitleY);

  // 4. Render Each Comment Card
  for (const card of layout.cards) {
    renderCommentCard(ctx, card, headerBaseY);
  }

  ctx.restore();
}

/**
 * Draws an individual comment card inside the appendix.
 */
function renderCommentCard(
  ctx: CanvasRenderingContext2D,
  card: AppendixCardLayout,
  offsetY: number
): void {
  const cardY = offsetY + card.y;

  // Card Background
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, card.x, cardY, card.width, card.height, 8);
  ctx.fill();

  // Card Border
  ctx.strokeStyle = '#eae6dc';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, card.x + 0.5, cardY + 0.5, card.width - 1, card.height - 1, 8);
  ctx.stroke();

  // Numbered Badge Circle
  const badgeY = offsetY + card.badge.y;
  ctx.beginPath();
  ctx.arc(card.badge.x, badgeY, card.badge.radius, 0, Math.PI * 2);
  ctx.fillStyle = card.badge.color;
  ctx.fill();

  // White text in badge
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.badge.numberStr, card.badge.x, badgeY);

  // Title
  ctx.fillStyle = '#18181b';
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(card.title.text, card.title.x, offsetY + card.title.y);

  // Text Lines
  ctx.fillStyle = '#27272a';
  ctx.font = '400 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  for (const line of card.lines) {
    ctx.fillText(line.text, line.x, offsetY + line.y);
  }
}

/**
 * Helper to draw a rounded rectangle on Canvas with backward compatibility.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
