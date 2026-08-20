import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  Download, 
  Printer, 
  X,
  FileText,
  Minus,
  Plus
} from 'lucide-react';
import { LoadedPDF } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PDFViewerProps {
  doc: LoadedPDF;
  onClose?: () => void;
}

interface PageInfo {
  pageNum: number;
  width: number;
  height: number;
}

export default function PDFViewer({ doc, onClose }: PDFViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderedPagesRef = useRef<Set<string>>(new Set());
  const activeRenderTasksRef = useRef<Map<number, any>>(new Map());

  // 1. Load PDF Document & Pre-calculate Page Geometry
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    renderedPagesRef.current.clear();

    const loadingTask = pdfjsLib.getDocument(doc.blobUrl);
    loadingTask.promise.then(async (loadedPdf) => {
      if (isCancelled) return;
      setPdfDoc(loadedPdf);

      const pageList: PageInfo[] = [];
      for (let i = 1; i <= loadedPdf.numPages; i++) {
        try {
          const page = await loadedPdf.getPage(i);
          const vp = page.getViewport({ scale: 1.0, rotation: 0 });
          pageList.push({
            pageNum: i,
            width: vp.width,
            height: vp.height,
          });
        } catch {
          pageList.push({ pageNum: i, width: 612, height: 792 });
        }
      }

      if (!isCancelled) {
        setPages(pageList);
        setCurrentPage(1);
        setLoading(false);
      }
    }).catch((err) => {
      console.error('Error loading PDF:', err);
      if (!isCancelled) setLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [doc.blobUrl]);

  // 2. Render Page at Crisp High-DPI Vector Buffer (Retina Buffer for sharp scaling)
  const renderCanvasPage = useCallback(async (pageNum: number, rot: number) => {
    if (!pdfDoc) return;
    const canvas = canvasMapRef.current.get(pageNum);
    if (!canvas) return;

    const renderKey = `${pageNum}-${rot}`;
    if (renderedPagesRef.current.has(renderKey)) return;

    // Cancel existing render if any
    if (activeRenderTasksRef.current.has(pageNum)) {
      try {
        activeRenderTasksRef.current.get(pageNum)?.cancel();
      } catch {
        // ignore
      }
      activeRenderTasksRef.current.delete(pageNum);
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const pixelRatio = Math.max(window.devicePixelRatio || 1, 2);
      const baseRenderScale = 1.5 * pixelRatio;
      const viewport = page.getViewport({ scale: baseRenderScale, rotation: rot });

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
      activeRenderTasksRef.current.set(pageNum, task);
      await task.promise;
      
      activeRenderTasksRef.current.delete(pageNum);
      renderedPagesRef.current.add(renderKey);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(`Page render error ${pageNum}:`, err);
      }
      activeRenderTasksRef.current.delete(pageNum);
    }
  }, [pdfDoc]);

  // 3. Lazy Viewport Rendering via IntersectionObserver
  useEffect(() => {
    if (!pdfDoc || pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page') || '1', 10);
            renderCanvasPage(pageNum, rotation);
          }
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '400px 0px 400px 0px',
        threshold: 0.01,
      }
    );

    const pageElements = scrollContainerRef.current?.querySelectorAll('[data-page]');
    pageElements?.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, pages, rotation, renderCanvasPage]);

  // Rotation triggers buffer invalidation
  useEffect(() => {
    renderedPagesRef.current.clear();
    pages.forEach((p) => {
      renderCanvasPage(p.pageNum, rotation);
    });
  }, [rotation, pages, renderCanvasPage]);

  // 4. Ctrl + Mouse Wheel (and Pinch-to-Zoom) Listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Logarithmic zoom factor for natural feel
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        setScale((prev) => {
          const next = Math.min(Math.max(prev * factor, 0.4), 2.5);
          return parseFloat(next.toFixed(2));
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // 5. Scroll to Specific Page Helper
  const scrollToPage = useCallback((pageNum: number) => {
    const targetEl = scrollContainerRef.current?.querySelector(`[data-page="${pageNum}"]`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
    }
  }, []);

  // 6. Keyboard Navigation: Arrow Keys (Left/Right, Up/Down), PageUp/Down, Home/End
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a text field
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text'))) {
        return;
      }

      const total = pages.length || 1;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentPage((prev) => {
          const next = Math.min(prev + 1, total);
          scrollToPage(next);
          return next;
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentPage((prev) => {
          const prevPage = Math.max(prev - 1, 1);
          scrollToPage(prevPage);
          return prevPage;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentPage(1);
        scrollToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentPage(total);
        scrollToPage(total);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages.length, scrollToPage]);

  // 7. Zoom Controls
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(parseFloat((prev + 0.1).toFixed(2)), 2.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(parseFloat((prev - 0.1).toFixed(2)), 0.4));
  }, []);

  const handleZoomReset = useCallback(() => {
    setScale(1.0);
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setScale(parseFloat(e.target.value) / 100);
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const handlePrint = useCallback(() => {
    const printWindow = window.open(doc.blobUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
      printWindow.print();
    }
  }, [doc.blobUrl]);

  const handleDownload = useCallback(() => {
    const a = document.createElement('a');
    a.href = doc.blobUrl;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [doc.blobUrl, doc.name]);

  // Scroll tracking to update current page number
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const pageElements = container.querySelectorAll<HTMLDivElement>('[data-page]');
    const containerTop = container.scrollTop;

    for (let i = 0; i < pageElements.length; i++) {
      const el = pageElements[i];
      if (el.offsetTop + el.offsetHeight / 2 > containerTop) {
        const pageNum = parseInt(el.getAttribute('data-page') || '1', 10);
        setCurrentPage(pageNum);
        break;
      }
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full flex flex-col bg-background text-zinc-800 dark:text-zinc-200 overflow-hidden relative select-none ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* 1. Integrated App Toolbar */}
      <div className="h-12 border-b border-border bg-surface/70 dark:bg-surface/50 backdrop-blur-md px-4 flex items-center justify-between gap-4 flex-shrink-0 z-10">
        
        {/* Left: Document details & Page Navigation */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px] sm:max-w-xs md:max-w-sm">
              {doc.name}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-border hidden sm:block" />

          {/* Page Navigator */}
          <div className="flex items-center gap-1 bg-surface dark:bg-card border border-border rounded-lg px-1 py-0.5 text-xs font-mono">
            <button
              onClick={() => scrollToPage(Math.max(currentPage - 1, 1))}
              disabled={currentPage <= 1}
              className="h-6 w-6 rounded flex items-center justify-center hover:bg-card dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
              title="Previous Page (← or ↑)"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-1 text-[11px] font-medium">
              {currentPage} / {pages.length || 1}
            </span>
            <button
              onClick={() => scrollToPage(Math.min(currentPage + 1, pages.length))}
              disabled={currentPage >= pages.length}
              className="h-6 w-6 rounded flex items-center justify-center hover:bg-card dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors"
              title="Next Page (→ or ↓)"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Actions (Rotate, Print, Download, Fullscreen, Close) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleRotate}
            title="Rotate 90° Clockwise"
            className="h-8 w-8 rounded-lg border border-border hover:bg-card dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors shadow-sm"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handlePrint}
            title="Print Document"
            className="h-8 w-8 rounded-lg border border-border hover:bg-card dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleDownload}
            title="Download Document"
            className="h-8 w-8 rounded-lg border border-border hover:bg-card dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="h-8 w-8 rounded-lg border border-border hover:bg-card dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors shadow-sm"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close Document (Esc)"
              className="h-8 px-2.5 rounded-lg bg-surface dark:bg-zinc-800 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 flex items-center gap-1 text-xs font-semibold transition-all border border-border"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Close</span>
            </button>
          )}
        </div>

      </div>

      {/* 2. PDF Viewport Scroll Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 w-full h-full overflow-auto bg-background p-6 sm:p-10 flex flex-col items-center"
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="text-xs font-mono text-zinc-400">Loading document...</p>
          </div>
        ) : (
          /* GPU-Accelerated Zoom Stage (Single hardware composited transformation matrix) */
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              willChange: 'transform',
            }}
            className="flex flex-col items-center gap-8 transition-transform duration-75 ease-out"
          >
            {pages.map((p) => {
              const isRotated90or270 = rotation === 90 || rotation === 270;
              const displayWidth = isRotated90or270 ? p.height : p.width;
              const displayHeight = isRotated90or270 ? p.width : p.height;

              return (
                <div
                  key={p.pageNum}
                  data-page={p.pageNum}
                  style={{
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
                  }}
                  className="relative bg-white rounded-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-black/5 dark:border-white/10 overflow-hidden flex-shrink-0"
                >
                  <canvas
                    ref={(el) => {
                      if (el) canvasMapRef.current.set(p.pageNum, el);
                      else canvasMapRef.current.delete(p.pageNum);
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                    className="block"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Floating Glassmorphic Zoom Slider (120fps Real-Time Hardware Accelerated) */}
      <div className="absolute bottom-6 right-6 z-30 flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-surface/95 dark:bg-card/95 border border-border shadow-[0_10px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_14px_45px_rgba(0,0,0,0.6)] backdrop-blur-md text-zinc-800 dark:text-zinc-200 select-none transition-all hover:border-zinc-400 dark:hover:border-zinc-600">
        
        {/* Zoom Out Button */}
        <button
          onClick={handleZoomOut}
          disabled={scale <= 0.4}
          title="Zoom Out (-)"
          className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-card dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors text-zinc-600 dark:text-zinc-300 active:scale-95"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        {/* Realtime Range Slider */}
        <input
          type="range"
          min="40"
          max="250"
          step="1"
          value={Math.round(scale * 100)}
          onChange={handleSliderChange}
          className="w-28 sm:w-36 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
          title={`Zoom: ${Math.round(scale * 100)}%`}
        />

        {/* Zoom In Button */}
        <button
          onClick={handleZoomIn}
          disabled={scale >= 2.5}
          title="Zoom In (+)"
          className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-card dark:hover:bg-zinc-800 disabled:opacity-30 transition-colors text-zinc-600 dark:text-zinc-300 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-border mx-0.5" />

        {/* Clickable Zoom Percentage Reset Pill */}
        <button
          onClick={handleZoomReset}
          title="Reset to 100%"
          className="px-2 py-0.5 rounded-md hover:bg-card dark:hover:bg-zinc-800 text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300 transition-colors active:scale-95"
        >
          {Math.round(scale * 100)}%
        </button>
      </div>

    </div>
  );
}
