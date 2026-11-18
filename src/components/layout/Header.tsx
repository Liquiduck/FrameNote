import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import type { AnnotationDocument } from '../../types/document';
import { getAllPins } from '../../core/annotation/pinGeometry';
import { IconComment, IconDownload, IconLogo, IconUpload } from '../common/Icons';

interface HeaderProps {
  document: AnnotationDocument;
  onUploadFile: (file: File) => void;
  onExport: () => void;
  isExporting?: boolean;
  isCommentsOpen?: boolean;
  onToggleComments?: () => void;
}

export function Header({
  document,
  onUploadFile,
  onExport,
  isExporting = false,
  isCommentsOpen = true,
  onToggleComments,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pinCount = getAllPins(document.annotations).length;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      // Reset input value so re-selecting same file triggers change event
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

        {hasImage && document.image && (
          <span
            className="fn-doc-badge"
            title={`${document.image.name} (${document.image.width} × ${document.image.height} px)`}
          >
            {document.image.name}
          </span>
        )}
      </div>

      <div className="fn-header-right">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="fn-hidden-file-input"
          onChange={handleFileChange}
          aria-label="Upload screenshot"
        />

        {/* Toggle Comments Sidebar / Drawer */}
        {onToggleComments && (
          <button
            type="button"
            className={`fn-btn-secondary fn-comments-toggle-btn ${
              isCommentsOpen ? 'is-active' : ''
            }`}
            onClick={onToggleComments}
            title={isCommentsOpen ? 'Hide comments panel' : 'Show comments panel'}
            aria-label={isCommentsOpen ? 'Hide comments panel' : 'Show comments panel'}
            aria-expanded={isCommentsOpen}
          >
            <IconComment />
            <span>Comments</span>
            {pinCount > 0 && (
              <span className="fn-header-badge" aria-hidden="true">
                {pinCount}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          className="fn-btn-secondary"
          onClick={handleUploadClick}
          title="Upload new screenshot (PNG, JPEG, WebP)"
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
