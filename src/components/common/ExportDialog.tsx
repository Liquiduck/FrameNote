import { useEffect, useRef, useState } from 'react';
import type { AnnotationDocument } from '../../types/document';
import { getAllPins } from '../../core/annotation/pinGeometry';
import { checkExportDimensions, getExportFilename } from '../../core/export/exportPipeline';
import { IconDownload } from './Icons';

interface ExportDialogProps {
  isOpen: boolean;
  document: AnnotationDocument;
  isExporting: boolean;
  onExport: (includeAppendix: boolean) => Promise<void>;
  onClose: () => void;
}

export function ExportDialog({
  isOpen,
  document,
  isExporting,
  onExport,
  onClose,
}: ExportDialogProps) {
  const image = document.image;
  const pins = getAllPins(document.annotations);
  const hasPins = pins.length > 0;

  // Pre-check dimensions for appendix safety limit
  const appendixCheck = image
    ? checkExportDimensions(image, document.annotations, true)
    : null;

  const isAppendixBlockedByLimit = Boolean(appendixCheck?.willExceedLimit);

  // Default to with-appendix if comments exist and limit is not exceeded
  const [includeAppendix, setIncludeAppendix] = useState(hasPins && !isAppendixBlockedByLimit);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Sync state when dialog opens or pins change
  useEffect(() => {
    if (isOpen) {
      if (hasPins && !isAppendixBlockedByLimit) {
        setIncludeAppendix(true);
      } else {
        setIncludeAppendix(false);
      }
    }
  }, [isOpen, hasPins, isAppendixBlockedByLimit]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, onClose]);

  if (!isOpen || !image) return null;

  const filename = getExportFilename(image.name, includeAppendix);
  const targetWidth = image.width;
  const targetHeight = includeAppendix && appendixCheck
    ? appendixCheck.height
    : image.height;

  const handleConfirmExport = async () => {
    if (isExporting) return;
    await onExport(includeAppendix);
  };

  return (
    <div className="fn-modal-backdrop" onClick={isExporting ? undefined : onClose} role="presentation">
      <div
        ref={dialogRef}
        className="fn-modal-card fn-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fn-export-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fn-export-dialog-header">
          <h2 id="fn-export-dialog-title" className="fn-modal-title">
            Export Annotated Screenshot
          </h2>
          <p className="fn-modal-desc">
            Choose how you would like to export your annotated document as a PNG image.
          </p>
        </div>

        {/* Warning if appendix exceeds limits */}
        {isAppendixBlockedByLimit && hasPins && (
          <div className="fn-export-warning" role="alert">
            <span className="fn-export-warning-icon">⚠️</span>
            <div className="fn-export-warning-text">
              <strong>Appendix exceeds canvas size limit</strong>
              <p>
                {appendixCheck?.reason} Exporting annotated image only is available to ensure safe browser rendering.
              </p>
            </div>
          </div>
        )}

        {/* Export Options Radio Group */}
        <div className="fn-export-options" role="radiogroup" aria-label="Export format options">
          {/* Option 1: Image only */}
          <label
            className={`fn-export-option-card ${!includeAppendix ? 'is-selected' : ''}`}
            onClick={() => setIncludeAppendix(false)}
          >
            <input
              type="radio"
              name="export-format"
              checked={!includeAppendix}
              onChange={() => setIncludeAppendix(false)}
              disabled={isExporting}
            />
            <div className="fn-export-option-content">
              <span className="fn-export-option-title">Annotated image only</span>
              <span className="fn-export-option-desc">
                Native screenshot ({image.width} × {image.height} px) with shapes, arrows, and pin markers.
              </span>
            </div>
          </label>

          {/* Option 2: Image with Comments Appendix */}
          <label
            className={`fn-export-option-card ${includeAppendix ? 'is-selected' : ''} ${
              !hasPins || isAppendixBlockedByLimit ? 'is-disabled' : ''
            }`}
            onClick={() => {
              if (hasPins && !isAppendixBlockedByLimit && !isExporting) {
                setIncludeAppendix(true);
              }
            }}
          >
            <input
              type="radio"
              name="export-format"
              checked={includeAppendix}
              onChange={() => {
                if (hasPins && !isAppendixBlockedByLimit) {
                  setIncludeAppendix(true);
                }
              }}
              disabled={!hasPins || isAppendixBlockedByLimit || isExporting}
            />
            <div className="fn-export-option-content">
              <span className="fn-export-option-title">
                Annotated image with comments appendix
              </span>
              <span className="fn-export-option-desc">
                {hasPins ? (
                  isAppendixBlockedByLimit ? (
                    'Disabled (exceeds browser canvas dimension/pixel limit)'
                  ) : (
                    `Appends ${pins.length} numbered feedback ${
                      pins.length === 1 ? 'note' : 'notes'
                    } beneath the screenshot (${targetWidth} × ${targetHeight} px).`
                  )
                ) : (
                  'No comments yet. Drop comment pins on the screenshot to enable.'
                )}
              </span>
            </div>
          </label>
        </div>

        {/* File Details Summary */}
        <div className="fn-export-summary">
          <div className="fn-export-summary-row">
            <span className="fn-export-summary-label">Target file:</span>
            <span className="fn-export-summary-val fn-status-mono">{filename}</span>
          </div>
          <div className="fn-export-summary-row">
            <span className="fn-export-summary-label">Dimensions:</span>
            <span className="fn-export-summary-val fn-status-mono">
              {targetWidth} × {targetHeight} px
            </span>
          </div>
        </div>

        {/* Dialog Actions */}
        <div className="fn-modal-actions">
          <button
            type="button"
            className="fn-btn-secondary"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="fn-btn-primary"
            onClick={handleConfirmExport}
            disabled={isExporting}
          >
            <IconDownload />
            <span>{isExporting ? 'Generating PNG...' : 'Export & Download'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
