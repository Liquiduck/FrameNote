import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { IconLogo, IconSample, IconUpload } from '../common/Icons';

interface EmptyStateProps {
  onUploadFile: (file: File) => void;
  onTrySample: () => void;
  isLoading?: boolean;
}

export function EmptyState({
  onUploadFile,
  onTrySample,
  isLoading = false,
}: EmptyStateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const handleZoneKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={`fn-empty-state-wrapper ${isDragOver ? 'is-drag-over' : ''} ${isLoading ? 'is-loading' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      tabIndex={0}
      role="region"
      aria-label="Screenshot upload drop zone"
      onKeyDown={handleZoneKeyDown}
    >
      <div className="fn-empty-icon-box" aria-hidden="true">
        {isLoading ? (
          <span className="fn-loading-spinner" />
        ) : (
          <IconLogo width={28} height={28} />
        )}
      </div>

      <h1 className="fn-empty-title">Make screenshot feedback clear.</h1>
      <p className="fn-empty-text">Draw, comment, and export—all in your browser.</p>

      <div className="fn-empty-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="fn-hidden-file-input"
          onChange={handleFileChange}
          aria-label="Upload screenshot file"
        />

        <button
          type="button"
          className="fn-empty-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <IconUpload />
          <span>Upload Image</span>
        </button>

        <button
          type="button"
          className="fn-empty-sample-btn"
          onClick={onTrySample}
          disabled={isLoading}
        >
          <IconSample />
          <span>Try Sample Screenshot</span>
        </button>
      </div>

      <div className="fn-empty-hint">
        <span>Drag and drop a screenshot here (PNG, JPEG, or WebP up to 25 MB)</span>
      </div>

      {isLoading && (
        <div className="fn-sr-only" role="status" aria-live="polite">
          Decoding and loading screenshot image...
        </div>
      )}
    </div>
  );
}
