import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, degrees } from 'pdf-lib';
import { 
  RotateCw, 
  Trash2, 
  Copy, 
  Download, 
  CheckSquare, 
  Square, 
  Undo2, 
  Layers, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  GripVertical
} from 'lucide-react';
import { LoadedPDF, OrganizerPageItem } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PageOrganizerProps {
  doc: LoadedPDF;
  onSaveModifiedDoc: (updatedDoc: LoadedPDF) => void;
  onOpenInViewer: () => void;
}

export default function PageOrganizer({ doc, onSaveModifiedDoc, onOpenInViewer }: PageOrganizerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<OrganizerPageItem[]>([]);
  const [originalPages, setOriginalPages] = useState<OrganizerPageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const canvasMapRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const renderedThumbnailsRef = useRef<Set<string>>(new Set());
  const activeRenderTasksRef = useRef<Map<string, any>>(new Map());

  // 1. Load Document and initialize Page List
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    renderedThumbnailsRef.current.clear();
    canvasMapRef.current.clear();

    // Cancel all running render tasks immediately
    activeRenderTasksRef.current.forEach((task) => {
      try { task.cancel(); } catch { /* ignore */ }
    });
    activeRenderTasksRef.current.clear();

    const loadingTask = pdfjsLib.getDocument(doc.blobUrl);
    loadingTask.promise.then((loadedPdf) => {
      if (isCancelled) {
        try { loadedPdf.destroy(); } catch { /* ignore */ }
        return;
      }
      setPdfDoc(loadedPdf);

      const initialPages: OrganizerPageItem[] = [];
      for (let i = 1; i <= loadedPdf.numPages; i++) {
        initialPages.push({
          id: `page-${i}`,
          originalPageNumber: i,
          rotation: 0,
          selected: false,
        });
      }

      setPages(initialPages);
      setOriginalPages(initialPages);
      setLoading(false);
    }).catch((err) => {
      if (!isCancelled) {
        console.error('Error loading PDF in organizer:', err);
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
      try { loadingTask.destroy(); } catch { /* ignore */ }
      activeRenderTasksRef.current.forEach((task) => {
        try { task.cancel(); } catch { /* ignore */ }
      });
      activeRenderTasksRef.current.clear();
    };
  }, [doc.blobUrl]);

  // Clean up PDF Document Proxy on unmount
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        try { pdfDoc.destroy(); } catch { /* ignore */ }
      }
      activeRenderTasksRef.current.forEach((task) => {
        try { task.cancel(); } catch { /* ignore */ }
      });
      activeRenderTasksRef.current.clear();
    };
  }, [pdfDoc]);

  // 2. High-Speed Lazy Thumbnail Rendering
  const renderThumbnail = useCallback(async (item: OrganizerPageItem) => {
    if (!pdfDoc) return;
    const canvas = canvasMapRef.current.get(item.id);
    if (!canvas) return;

    const renderKey = `${item.id}-${item.originalPageNumber}-${item.rotation}`;
    if (renderedThumbnailsRef.current.has(renderKey)) return;

    // Cancel existing render on this canvas if any
    if (activeRenderTasksRef.current.has(item.id)) {
      try {
        activeRenderTasksRef.current.get(item.id)?.cancel();
      } catch {
        /* ignore */
      }
      activeRenderTasksRef.current.delete(item.id);
    }

    try {
      const page = await pdfDoc.getPage(item.originalPageNumber);
      const targetWidth = 160; // Fast lightweight thumbnail
      const pageRotate = page.rotate || 0;
      const totalRotation = (pageRotate + item.rotation) % 360;
      const baseViewport = page.getViewport({ scale: 1.0, rotation: totalRotation });
      const scale = targetWidth / baseViewport.width;
      const viewport = page.getViewport({ scale, rotation: totalRotation });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas,
      };

      const task = page.render(renderContext);
      activeRenderTasksRef.current.set(item.id, task);
      await task.promise;
      
      activeRenderTasksRef.current.delete(item.id);
      renderedThumbnailsRef.current.add(renderKey);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(`Thumbnail render error page ${item.originalPageNumber}:`, err);
      }
      activeRenderTasksRef.current.delete(item.id);
    }
  }, [pdfDoc]);

  // 3. Lazy IntersectionObserver for Viewport Thumbnails
  useEffect(() => {
    if (!pdfDoc || pages.length === 0) return;

    // Pre-render the first 6 pages immediately so user sees them with 0ms delay
    const initialBatch = pages.slice(0, 6);
    initialBatch.forEach((p) => {
      renderThumbnail(p);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageId = entry.target.getAttribute('data-organizer-id');
            if (pageId) {
              const targetPage = pages.find((p) => p.id === pageId);
              if (targetPage) {
                renderThumbnail(targetPage);
              }
            }
          }
        });
      },
      {
        root: gridScrollRef.current,
        rootMargin: '300px 0px 300px 0px',
        threshold: 0.01,
      }
    );

    const pageElements = gridScrollRef.current?.querySelectorAll('[data-organizer-id]');
    pageElements?.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, pages, renderThumbnail]);

  // 4. Selection Handlers
  const togglePageSelection = useCallback((id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: false })));
  }, []);

  const selectedPages = pages.filter((p) => p.selected);
  const selectedCount = selectedPages.length;

  // 5. Per-Page & Batch Operations
  const handleRotatePage = useCallback((id: string) => {
    renderedThumbnailsRef.current.clear();
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );
  }, []);

  const handleRotateSelected = useCallback(() => {
    renderedThumbnailsRef.current.clear();
    setPages((prev) =>
      prev.map((p) =>
        p.selected || selectedCount === 0
          ? { ...p, rotation: (p.rotation + 90) % 360 }
          : p
      )
    );
  }, [selectedCount]);

  const handleDeletePage = useCallback((id: string) => {
    if (pages.length <= 1) {
      alert('Cannot delete all pages. A PDF must have at least one page.');
      return;
    }
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, [pages.length]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedCount === pages.length) {
      alert('Cannot delete all pages. A PDF must have at least one page.');
      return;
    }
    setPages((prev) => prev.filter((p) => !p.selected));
  }, [selectedCount, pages.length]);

  const handleDuplicatePage = useCallback((index: number) => {
    const target = pages[index];
    const newPage: OrganizerPageItem = {
      ...target,
      id: `page-${target.originalPageNumber}-${Date.now()}-${Math.random()}`,
      selected: false,
    };
    const updated = [...pages];
    updated.splice(index + 1, 0, newPage);
    setPages(updated);
  }, [pages]);

  const handleMovePage = useCallback((fromIndex: number, direction: 'left' | 'right') => {
    const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= pages.length) return;

    setPages((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, item);
      return updated;
    });
  }, [pages.length]);

  const handleReset = useCallback(() => {
    renderedThumbnailsRef.current.clear();
    setPages(originalPages);
  }, [originalPages]);

  // 6. Drag and Drop Reordering
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setPages((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(draggedIndex, 1);
      updated.splice(dropIndex, 0, movedItem);
      return updated;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex]);

  // 7. In-Memory PDF Compilation via pdf-lib
  const handleSaveAndExport = useCallback(async () => {
    if (pages.length === 0) return;
    setSaving(true);

    try {
      const arrayBuffer = await doc.file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const newDoc = await PDFDocument.create();

      for (const item of pages) {
        const [copiedPage] = await newDoc.copyPages(srcDoc, [item.originalPageNumber - 1]);
        const existingRot = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((existingRot + item.rotation) % 360));
        newDoc.addPage(copiedPage);
      }

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const formatSize = (bytes: number) =>
        bytes < 1024 * 1024
          ? (bytes / 1024).toFixed(1) + ' KB'
          : (bytes / (1024 * 1024)).toFixed(1) + ' MB';

      const updatedDoc: LoadedPDF = {
        id: `${Date.now()}-${doc.name}`,
        name: doc.name.replace(/\.pdf$/i, '') + '_Organized.pdf',
        size: formatSize(pdfBytes.length),
        rawSize: pdfBytes.length,
        blobUrl,
        file: new File([blob], doc.name, { type: 'application/pdf' }),
        loadedAt: new Date(),
      };

      onSaveModifiedDoc(updatedDoc);
      onOpenInViewer();
    } catch (err) {
      console.error('Error saving organized PDF:', err);
      alert('Failed to save document. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [pages, doc, onSaveModifiedDoc, onOpenInViewer]);

  // 8. Extract Selected Pages into Standalone PDF
  const handleExtractSelected = useCallback(async () => {
    const targets = selectedCount > 0 ? selectedPages : pages;
    if (targets.length === 0) return;

    setSaving(true);
    try {
      const arrayBuffer = await doc.file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const extractedDoc = await PDFDocument.create();

      for (const item of targets) {
        const [copiedPage] = await extractedDoc.copyPages(srcDoc, [item.originalPageNumber - 1]);
        const existingRot = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((existingRot + item.rotation) % 360));
        extractedDoc.addPage(copiedPage);
      }

      const pdfBytes = await extractedDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = doc.name.replace(/\.pdf$/i, '') + '_Extracted.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error extracting pages:', err);
      alert('Failed to extract selected pages.');
    } finally {
      setSaving(false);
    }
  }, [selectedCount, selectedPages, pages, doc]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col bg-background text-zinc-800 dark:text-zinc-200 overflow-hidden"
    >
      
      {/* 1. Control & Action Toolbar */}
      <div className="h-12 border-b border-border bg-surface dark:bg-surface px-4 sm:px-6 flex items-center justify-between gap-3 flex-shrink-0 z-10">
        
        {/* Left: Title & Selection Stats */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center flex-shrink-0 shadow-xs">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Page Organizer</h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-zinc-500">
                {pages.length} Pages
              </span>
            </div>
            <p className="text-[10px] font-mono text-zinc-400 truncate max-w-xs sm:max-w-md">
              {selectedCount > 0 ? `${selectedCount} pages selected` : 'Drag to reorder • Rotate & delete'}
            </p>
          </div>
        </div>

        {/* Center: Selection Controls & Batch Actions */}
        <div className="flex items-center gap-1.5 bg-surface dark:bg-card border border-border rounded-xl p-1 shadow-sm">
          {selectedCount === pages.length ? (
            <button
              onClick={handleDeselectAll}
              title="Deselect All"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-card dark:hover:bg-surface transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] hidden sm:inline">Deselect</span>
            </button>
          ) : (
            <button
              onClick={handleSelectAll}
              title="Select All Pages"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-card dark:hover:bg-surface transition-colors"
            >
              <Square className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-[11px] hidden sm:inline">Select All</span>
            </button>
          )}

          <div className="w-[1px] h-4 bg-border" />

          {/* Batch Rotate */}
          <button
            onClick={handleRotateSelected}
            title={selectedCount > 0 ? "Rotate Selected Pages" : "Rotate All Pages"}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-card dark:hover:bg-surface transition-colors"
          >
            <RotateCw className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
            <span className="text-[11px] hidden md:inline">Rotate 90°</span>
          </button>

          {/* Batch Delete */}
          {selectedCount > 0 && (
            <button
              onClick={handleDeleteSelected}
              title="Delete Selected Pages"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-[11px] hidden md:inline">Delete ({selectedCount})</span>
            </button>
          )}

          {/* Extract Selected */}
          {selectedCount > 0 && (
            <button
              onClick={handleExtractSelected}
              title="Extract Selected Pages into New PDF"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="text-[11px] hidden md:inline">Extract</span>
            </button>
          )}

          <div className="w-[1px] h-4 bg-border" />

          {/* Reset Changes */}
          <button
            onClick={handleReset}
            title="Reset to Original Layout"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:bg-card dark:hover:bg-surface transition-colors"
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span className="text-[11px] hidden lg:inline">Reset</span>
          </button>
        </div>

        {/* Right: Save & Export Modified PDF */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenInViewer}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-card dark:hover:bg-surface text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors shadow-sm"
          >
            Preview Viewer
          </button>

          <button
            onClick={handleSaveAndExport}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span>Compiling...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Save & Apply</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* 2. Responsive Visual Page Grid Area */}
      <div 
        ref={gridScrollRef}
        className="flex-1 overflow-auto p-6 sm:p-8 bg-background overscroll-contain"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="text-xs font-mono text-zinc-400">Loading page thumbnails...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 max-w-7xl mx-auto">
            {pages.map((item, index) => {
              const isDraggingThis = draggedIndex === index;
              const isOverThis = dragOverIndex === index;

              return (
                <div
                  key={item.id}
                  data-organizer-id={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(index, e)}
                  onDrop={() => handleDrop(index)}
                  onClick={() => togglePageSelection(item.id)}
                  className={`group relative flex flex-col rounded-xl p-3 border transition-all cursor-pointer bg-card shadow-sm select-none ${
                    item.selected
                      ? 'border-accent ring-2 ring-accent/30 bg-accent/[0.03]'
                      : 'border-border hover:border-zinc-400 dark:hover:border-zinc-600'
                  } ${isDraggingThis ? 'opacity-40 scale-95 border-dashed border-accent' : ''} ${
                    isOverThis && !isDraggingThis ? 'border-accent scale-105 shadow-xl' : ''
                  }`}
                >
                  {/* Top Card Header: Checkbox & Page Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePageSelection(item.id);
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <div className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                        item.selected 
                          ? 'bg-accent border-accent text-white' 
                          : 'border-border bg-surface text-transparent hover:border-zinc-400'
                      }`}>
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                        {index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.rotation > 0 && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {item.rotation}°
                        </span>
                      )}
                      <GripVertical className="h-3.5 w-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
                    </div>
                  </div>

                  {/* Thumbnail Canvas Container */}
                  <div className="w-full aspect-[1/1.414] rounded-lg bg-white border border-black/5 dark:border-white/10 shadow-sm flex items-center justify-center overflow-hidden relative">
                    <canvas
                      ref={(el) => {
                        if (el) canvasMapRef.current.set(item.id, el);
                        else canvasMapRef.current.delete(item.id);
                      }}
                      className="max-w-full max-h-full block object-contain"
                    />

                    {/* Original Source Reference */}
                    <span className="absolute bottom-1 right-1 text-[8px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-white border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      Src #{item.originalPageNumber}
                    </span>
                  </div>

                  {/* Bottom Hover Action Strip */}
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2.5 pt-2 border-t border-border flex items-center justify-between gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                  >
                    {/* Move Left */}
                    <button
                      onClick={() => handleMovePage(index, 'left')}
                      disabled={index === 0}
                      title="Move Left"
                      className="h-6 w-6 rounded flex items-center justify-center hover:bg-surface text-zinc-500 disabled:opacity-20 transition-colors"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>

                    {/* Rotate 90 */}
                    <button
                      onClick={() => handleRotatePage(item.id)}
                      title="Rotate Page 90°"
                      className="h-6 w-6 rounded flex items-center justify-center hover:bg-surface text-zinc-600 dark:text-zinc-300 transition-colors"
                    >
                      <RotateCw className="h-3 w-3" />
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicatePage(index)}
                      title="Duplicate Page"
                      className="h-6 w-6 rounded flex items-center justify-center hover:bg-surface text-zinc-600 dark:text-zinc-300 transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeletePage(item.id)}
                      title="Delete Page"
                      className="h-6 w-6 rounded flex items-center justify-center hover:bg-rose-500/10 text-rose-500 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>

                    {/* Move Right */}
                    <button
                      onClick={() => handleMovePage(index, 'right')}
                      disabled={index === pages.length - 1}
                      title="Move Right"
                      className="h-6 w-6 rounded flex items-center justify-center hover:bg-surface text-zinc-500 disabled:opacity-20 transition-colors"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
