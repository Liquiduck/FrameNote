import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dimensions } from './types/geometry';
import type { LoadedImage } from './types/document';
import type { Annotation } from './types/annotation';
import { useAnnotationDocument } from './hooks/useAnnotationDocument';
import { useImageLoader } from './hooks/useImageLoader';
import { useViewport } from './hooks/useViewport';
import { downloadBlob, getExportFilename, renderDocumentToBlob } from './core/export/exportPipeline';
import { Header } from './components/layout/Header';
import { CommentsSidebar } from './components/layout/CommentsSidebar';
import { StatusBar } from './components/layout/StatusBar';
import { Workspace } from './components/canvas/Workspace';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { ExportDialog } from './components/common/ExportDialog';
import { NotificationBanner } from './components/common/NotificationBanner';

type PendingLoadAction =
  | { type: 'file'; file: File }
  | { type: 'sample' };

export function App() {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [pendingLoad, setPendingLoad] = useState<PendingLoadAction | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth > 900 : true
  );
  const workspaceDimsRef = useRef<Dimensions>({ width: 800, height: 600 });

  const {
    document,
    canUndo,
    canRedo,
    undo,
    redo,
    setImage,
    setActiveTool,
    setActiveColor,
    setActiveStrokeWidth,
    selectAnnotation,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
  } = useAnnotationDocument();

  const {
    viewport,
    isPanning,
    startPanning,
    updatePanning,
    stopPanning,
    fitToScreen,
    actualSize,
    zoomIn,
    zoomOut,
    handleWheel,
  } = useViewport();

  const handleImageLoaded = useCallback(
    (loadedImg: LoadedImage) => {
      setImage(loadedImg);
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

  const handleCommitAnnotation = useCallback(
    (annotation: Annotation) => {
      addAnnotation(annotation);
    },
    [addAnnotation]
  );

  // Style change handlers that apply to selected annotation if present, or set future defaults
  const handleSelectColor = useCallback(
    (color: string) => {
      setActiveColor(color);
      if (document.selectedAnnotationId) {
        const selected = document.annotations.find((a) => a.id === document.selectedAnnotationId);
        if (selected) {
          updateAnnotation({ ...selected, color });
        }
      }
    },
    [document.annotations, document.selectedAnnotationId, setActiveColor, updateAnnotation]
  );

  const handleSelectStrokeWidth = useCallback(
    (strokeWidth: number) => {
      setActiveStrokeWidth(strokeWidth);
      if (document.selectedAnnotationId) {
        const selected = document.annotations.find((a) => a.id === document.selectedAnnotationId);
        if (selected) {
          updateAnnotation({ ...selected, strokeWidth });
        }
      }
    },
    [document.annotations, document.selectedAnnotationId, setActiveStrokeWidth, updateAnnotation]
  );

  const handleOpenExportDialog = useCallback(() => {
    if (!document.image) return;
    setExportError(null);
    setIsExportDialogOpen(true);
  }, [document.image]);

  const handleExecuteExport = useCallback(async (includeAppendix: boolean) => {
    if (!document.image || isExporting) return;

    // Capture stable snapshot at export start to prevent concurrent edit drift
    const imageSnapshot = document.image;
    const annotationsSnapshot = [...document.annotations];

    try {
      setIsExporting(true);
      setExportError(null);

      const blob = await renderDocumentToBlob(
        imageSnapshot,
        annotationsSnapshot,
        { scale: 1, mimeType: 'image/png', includeAppendix }
      );

      const fileName = getExportFilename(imageSnapshot.name, includeAppendix);
      downloadBlob(blob, fileName);
      setIsExportDialogOpen(false);
    } catch (err) {
      console.error('Export failed:', err);
      setExportError(err instanceof Error ? err.message : 'Export failed. The image may be too large.');
    } finally {
      setIsExporting(false);
    }
  }, [document, isExporting]);

  const handleZoomInCentered = useCallback(() => {
    zoomIn(workspaceDimsRef.current, document.image || undefined);
  }, [zoomIn, document.image]);

  const handleZoomOutCentered = useCallback(() => {
    zoomOut(workspaceDimsRef.current, document.image || undefined);
  }, [zoomOut, document.image]);

  const handleActualSizeCentered = useCallback(() => {
    if (document.image) {
      actualSize(document.image, workspaceDimsRef.current);
    }
  }, [actualSize, document.image]);

  // Global Keyboard Shortcuts (Undo, Redo, Zoom, Tool switching, Deletion, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')
      ) {
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
        handleZoomInCentered();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOutCentered();
      } else if (e.key === '0') {
        e.preventDefault();
        handleActualSizeCentered();
      } else if (e.key.toLowerCase() === 'v') {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('hand');
      } else if (e.key.toLowerCase() === 'r') {
        setActiveTool('rectangle');
      } else if (e.key.toLowerCase() === 'a') {
        setActiveTool('arrow');
      } else if (e.key.toLowerCase() === 'c') {
        setActiveTool('pin');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.selectedAnnotationId) {
          e.preventDefault();
          deleteAnnotation(document.selectedAnnotationId);
        }
      } else if (e.key === 'Escape') {
        if (document.selectedAnnotationId) {
          e.preventDefault();
          selectAnnotation(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    canUndo,
    canRedo,
    undo,
    redo,
    handleZoomInCentered,
    handleZoomOutCentered,
    handleActualSizeCentered,
    setActiveTool,
    selectAnnotation,
    document.selectedAnnotationId,
    deleteAnnotation,
  ]);

  return (
    <div className="fn-app-shell">
      {/* Accessible Error / Notification Banner */}
      <NotificationBanner
        message={error || exportError}
        onDismiss={() => {
          clearError();
          setExportError(null);
        }}
      />

      {/* Top Header */}
      <Header
        document={document}
        onUploadFile={requestLoadFile}
        onExport={handleOpenExportDialog}
        isExporting={isExporting}
        isCommentsOpen={isCommentsOpen}
        onToggleComments={() => setIsCommentsOpen((prev) => !prev)}
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
          onSelectTool={setActiveTool}
          onSelectColor={handleSelectColor}
          onSelectStrokeWidth={handleSelectStrokeWidth}
          onSelectAnnotation={selectAnnotation}
          onCommitAnnotation={handleCommitAnnotation}
          onUpdateAnnotation={updateAnnotation}
          onFitToScreen={handleFitToScreen}
          isLoading={isLoading}
        />

        <CommentsSidebar
          document={document}
          isOpen={isCommentsOpen}
          onClose={() => setIsCommentsOpen(false)}
          onSelectAnnotation={selectAnnotation}
          onUpdateAnnotation={updateAnnotation}
          onDeleteAnnotation={deleteAnnotation}
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
        onZoomIn={handleZoomInCentered}
        onZoomOut={handleZoomOutCentered}
        onActualSize={handleActualSizeCentered}
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

      {/* Export Options Modal Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        document={document}
        isExporting={isExporting}
        onExport={handleExecuteExport}
        onClose={() => setIsExportDialogOpen(false)}
      />
    </div>
  );
}

export default App;
