import { useCallback, useEffect, useState } from 'react';
import type { Dimensions } from './types/geometry';
import { useAnnotationDocument } from './hooks/useAnnotationDocument';
import { useImageLoader } from './hooks/useImageLoader';
import { useViewport } from './hooks/useViewport';
import { downloadBlob, renderDocumentToBlob } from './core/export/exportPipeline';
import { Header } from './components/layout/Header';
import { CommentsSidebar } from './components/layout/CommentsSidebar';
import { StatusBar } from './components/layout/StatusBar';
import { Workspace } from './components/canvas/Workspace';

export function App() {
  const [isExporting, setIsExporting] = useState(false);

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
    (loadedImg: Parameters<typeof setImage>[0]) => {
      setImage(loadedImg);
    },
    [setImage]
  );

  const {
    isLoading,
    loadFile,
    loadSample,
  } = useImageLoader(handleImageLoaded);

  const handleFitToScreen = useCallback(
    (containerDims: Dimensions) => {
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
      // Don't intercept if user is typing in an input or textarea
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
      {/* Top Header */}
      <Header
        document={document}
        onUploadFile={loadFile}
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
          onUploadFile={loadFile}
          onTrySample={loadSample}
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
            fitToScreen(document.image, {
              width: window.innerWidth - 280,
              height: window.innerHeight - 88,
            });
          }
        }}
      />
    </div>
  );
}

export default App;
