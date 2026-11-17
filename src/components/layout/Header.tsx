import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import type { AnnotationDocument } from '../../types/document';
import { IconDownload, IconLogo, IconUpload } from '../common/Icons';

interface HeaderProps {
  document: AnnotationDocument;
  onUploadFile: (file: File) => void;
  onExport: () => void;
  isExporting?: boolean;
}

export function Header({
  document,
  onUploadFile,
  onExport,
  isExporting = false,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const hasImage = Boolean(document.image);

  return (
    <header className="fn-header">
      <div className="fn-header-left">
        <div className="fn-wordmark">
          <span className="fn-wordmark-icon" aria-hidden="true">
            <IconLogo />
          </span>
          <span>FrameNote</span>
        </div>

        {hasImage && (
          <span className="fn-doc-badge" title={document.image?.name}>
            {document.image?.name}
          </span>
        )}
      </div>

      <div className="fn-header-right">
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
          className="fn-btn-secondary"
          onClick={handleUploadClick}
          title="Upload new screenshot"
        >
          <IconUpload />
          <span>Upload</span>
        </button>

        <button
          type="button"
          className="fn-btn-primary"
          onClick={onExport}
          disabled={!hasImage || isExporting}
          title={hasImage ? 'Export annotated screenshot as PNG' : 'Upload an image first'}
        >
          <IconDownload />
          <span>{isExporting ? 'Exporting...' : 'Export PNG'}</span>
        </button>
      </div>
    </header>
  );
}
