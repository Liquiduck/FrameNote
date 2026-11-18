import type { Annotation } from '../../types/annotation';
import type { LoadedImage } from '../../types/document';
import { calculateArrowGeometry } from '../annotation/arrowGeometry';

export interface ExportOptions {
  readonly scale?: number; // 1 = 1x native resolution, 2 = 2x Retina
  readonly mimeType?: 'image/png' | 'image/jpeg';
  readonly quality?: number;
  readonly fileName?: string;
}

/**
 * Renders the base image and all annotations (defined in native image coordinates)
 * to an off-screen HTML5 canvas, and produces a high-fidelity PNG blob.
 * Selection indicators and hit targets are never rendered into the export.
 */
export async function renderDocumentToBlob(
  image: LoadedImage,
  annotations: readonly Annotation[],
  options: ExportOptions = {}
): Promise<Blob> {
  const scale = options.scale ?? 1;
  const mimeType = options.mimeType ?? 'image/png';
  const quality = options.quality ?? 0.95;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not obtain 2D rendering context for canvas export');
  }

  // Load image element safely
  const imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to load image element for export'));
    el.src = image.src;
  });

  ctx.save();
  ctx.scale(scale, scale);

  // 1. Draw base screenshot
  ctx.drawImage(imgElement, 0, 0, image.width, image.height);

  // 2. Render each annotation in native image coordinates
  for (const annotation of annotations) {
    renderAnnotationToCanvas(ctx, annotation);
  }

  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas failed to export image blob'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Triggers a browser download for the exported blob.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Canvas rendering for individual annotations in native image coordinates.
 */
function renderAnnotationToCanvas(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation
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

      // Solid Arrow Head using the shared geometry calculation
      ctx.beginPath();
      ctx.moveTo(geom.head.tip.x, geom.head.tip.y);
      ctx.lineTo(geom.head.leftBarb.x, geom.head.leftBarb.y);
      ctx.lineTo(geom.head.rightBarb.x, geom.head.rightBarb.y);
      ctx.closePath();
      ctx.fill();
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
      ctx.font = `600 ${annotation.fontSize}px sans-serif`;
      ctx.fillText(annotation.text, annotation.x, annotation.y);
      break;
    }

    case 'callout': {
      const radius = 14;
      ctx.beginPath();
      ctx.arc(annotation.x, annotation.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
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
