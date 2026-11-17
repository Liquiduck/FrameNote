import { useRef, type ChangeEvent } from 'react';
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  return (
    <div className="fn-empty-state-wrapper">
      <div className="fn-empty-icon-box" aria-hidden="true">
        <IconLogo width={28} height={28} />
      </div>

      <h1 className="fn-empty-title">Make screenshot feedback clear.</h1>
      <p className="fn-empty-text">Draw, comment, and export—all in your browser.</p>

      <div className="fn-empty-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="fn-hidden-file-input"
          onChange={handleFileChange}
          aria-label="Upload screenshot"
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
    </div>
  );
}
