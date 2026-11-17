import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dimensions } from './types/geometry';
import type { LoadedImage } from './types/document';
import { useAnnotationDocument } from './hooks/useAnnotationDocument';
import { useImageLoader } from './hooks/useImageLoader';
import { useViewport } from './hooks/useViewport';
import { downloadBlob, renderDocumentToBlob } from './core/export/exportPipeline';
import { Header } from './components/layout/Header';
import { CommentsSidebar } from './components/layout/CommentsSidebar';
import { StatusBar } from './components/layout/StatusBar';
import { Workspace } from './components/canvas/Workspace';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { NotificationBanner } from './components/common/NotificationBanner';

type PendingLoadAction =
  | { type: 'file'; file: File }
  | { type: 'sample' };

export function App() {
  const [isExporting, setIsExporting] = useState(false);
  const [pendingLoad, setPendingLoad] = useState<PendingLoadAction | null>(null);
  const workspaceDimsRef = useRef<Dimensions>({ width: 800, height: 600 });

  const {
    document,
    canUndo,
    canRedo,
    undo,
    redo,
    setImage,
    selectAnnotation,
  } = useAnnotationDocument();

  const {
    viewport,
    isPanning,
    startPanning,
    updatePanning,
    stopPanning,
    fitToScreen,
    resetZoom,
    zoomIn,
    zoomOut,
    handleWheel,
  } = useViewport();

  const handleImageLoaded = useCallback(
    (loadedImg: LoadedImage) => {
      // Replacing image resets document state, selection, and history
      setImage(loadedImg);
      // Reset viewport to fit newly loaded image within workspace
      if (workspaceDimsRef.current.width > 0 && workspaceDimsRef.current.height > 0) {
        fitToScreen(loadedImg, workspaceDimsRef.current);
      }
    },
    [setImage, fitToScreen]
  );

  const {
    isLoading,
    error,
    loadFile,
    loadSample,
    clearError,
  } = useImageLoader({ onImageLoaded: handleImageLoaded });

  // Safe wrapper for file loading that asks for confirmation if annotations would be discarded
  const requestLoadFile = useCallback(
    (file: File) => {
      clearError();
      if (document.annotations.length > 0) {
        setPendingLoad({ type: 'file', file });
      } else {
        loadFile(file);
      }
    },
    [document.annotations.length, loadFile, clearError]
  );

  // Safe wrapper for sample loading
  const requestLoadSample = useCallback(() => {
    clearError();
    if (document.annotations.length > 0) {
      setPendingLoad({ type: 'sample' });
    } else {
      loadSample();
    }
  }, [document.annotations.length, loadSample, clearError]);

  const handleConfirmReplace = useCallback(() => {
    if (!pendingLoad) return;
    const action = pendingLoad;
    setPendingLoad(null);

    if (action.type === 'file') {
      loadFile(action.file);
    } else if (action.type === 'sample') {
      loadSample();
    }
  }, [pendingLoad, loadFile, loadSample]);

  const handleCancelReplace = useCallback(() => {
    setPendingLoad(null);
  }, []);

  const handleFitToScreen = useCallback(
    (containerDims: Dimensions) => {
      workspaceDimsRef.current = containerDims;
      if (document.image) {
        fitToScreen(document.image, containerDims);
      }
    },
    [document.image, fitToScreen]
  );

  const handleExport = useCallback(async () => {
    if (!document.image) return;

    try {
      setIsExporting(true);
      const blob = await renderDocumentToBlob(
        document.image,
        document.annotations,
        { scale: 1, mimeType: 'image/png' }
      );
      const fileName = `${document.title || 'framenote-export'}.png`;
      downloadBlob(blob, fileName);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [document]);

  // Global Keyboard Shortcuts (Undo, Redo, Zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canUndo) undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        if (canRedo) redo();
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, zoomIn, zoomOut, resetZoom]);

  return (
    <div className="fn-app-shell">
      {/* Accessible Error / Notification Banner */}
      <NotificationBanner
        message={error}
        onDismiss={clearError}
      />

      {/* Top Header */}
      <Header
        document={document}
        onUploadFile={requestLoadFile}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Main Studio Body: Workspace + Comments Sidebar */}
      <div className="fn-body">
        <Workspace
          document={document}
          viewport={viewport}
          isPanning={isPanning}
          onStartPanning={startPanning}
          onUpdatePanning={updatePanning}
          onStopPanning={stopPanning}
          onWheel={handleWheel}
          onUploadFile={requestLoadFile}
          onTrySample={requestLoadSample}
          onSelectAnnotation={selectAnnotation}
          onFitToScreen={handleFitToScreen}
          isLoading={isLoading}
        />

        <CommentsSidebar
          document={document}
          onSelectAnnotation={selectAnnotation}
        />
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        document={document}
        viewport={viewport}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onFitToScreen={() => {
          if (document.image) {
            fitToScreen(document.image, workspaceDimsRef.current);
          }
        }}
      />

      {/* Confirmation Modal when replacing screenshot with existing annotations */}
      <ConfirmDialog
        isOpen={pendingLoad !== null}
        title="Replace current screenshot?"
        message="Loading a new screenshot will discard your current annotations, comments, and undo history."
        confirmLabel="Replace Screenshot"
        cancelLabel="Keep Current"
        onConfirm={handleConfirmReplace}
        onCancel={handleCancelReplace}
      />
    </div>
  );
}

export default App;
