import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Search,
  BookOpen,
  Columns,
  Eye,
  ChevronDown,
  PanelLeftOpen,
  GraduationCap
} from 'lucide-react';
import { 
  LoadedPDF, 
  PageLayoutMode, 
  NavSidebarTab, 
  PDFOutlineNode, 
  PDFBookmark, 
  PDFAttachment, 
  SearchMatch, 
  MultiDocSearchResult,
  PDFAnnotation,
  AnnotationToolType
} from '../types';
import SearchOverlay from './viewer/SearchOverlay';
import ViewerNavSidebar from './viewer/ViewerNavSidebar';
import TextReflowView from './viewer/TextReflowView';
import FloatingAnnotationToolbar from './viewer/FloatingAnnotationToolbar';
import AnnotationLayer from './viewer/AnnotationLayer';
import StickyNoteModal from './viewer/StickyNoteModal';
import DocumentTabBar from './viewer/DocumentTabBar';
import MinimalStudyBar from './viewer/MinimalStudyBar';
import PomodoroTimer from './viewer/PomodoroTimer';
import { exportToXFDF, exportToJSON, downloadFile, bakeAnnotationsToPDF } from '../utils/annotationExporter';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// In-memory document and text index cache across tabs (0ms tab switching & instant multi-doc search)
export const globalDocProxyCache = new Map<string, pdfjsLib.PDFDocumentProxy>();
export const globalTextIndexCache = new Map<string, PageTextData[]>();

interface PDFViewerProps {
  doc: LoadedPDF;
  allDocs?: LoadedPDF[];
  onClose?: () => void;
  onSelectDoc?: (doc: LoadedPDF) => void;
  onCloseDoc?: (docId: string, e?: React.MouseEvent) => void;
  onNewTab?: () => void;
  onOpenDocument?: () => void;
  onOpenOrganizer?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onReturnToCover?: () => void;
  initialPage?: number;
  initialScale?: number;
  initialRotation?: number;
  initialAnnotations?: PDFAnnotation[];
  onSaveSessionState?: (state: { page: number; scale: number; rotation: number; annotations: PDFAnnotation[] }) => void;
}

interface PageInfo {
  pageNum: number;
  width: number;
  height: number;
}

interface PageTextData {
  pageNum: number;
  text: string;
}

export default function PDFViewer({ 
  doc, 
  allDocs = [], 
  onClose, 
  onSelectDoc,
  onCloseDoc,
  onNewTab,
  onOpenDocument,
  onOpenOrganizer,
  darkMode,
  onToggleDarkMode,
  onReturnToCover,
  initialPage,
  initialScale,
  initialRotation,
  initialAnnotations,
  onSaveSessionState,
}: PDFViewerProps) {
  // Core Document State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(() => initialPage || 1);
  const [scale, setScale] = useState<number>(() => initialScale || 1.0);
  const [rotation, setRotation] = useState<number>(() => initialRotation || 0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isBakingAnnotations, setIsBakingAnnotations] = useState<boolean>(false);

  // 1. Page Layout Controls
  const [layoutMode, setLayoutMode] = useState<PageLayoutMode>('continuous');
  const [facingCoverPage, setFacingCoverPage] = useState<boolean>(true);
  const [showLayoutMenu, setShowLayoutMenu] = useState<boolean>(false);

  // 2. Display & Readability Modes
  const [focusMode, setFocusMode] = useState<boolean>(false); // Zen / background dimming mode
  const [isReflowOpen, setIsReflowOpen] = useState<boolean>(false);
  const [isStudyMode, setIsStudyMode] = useState<boolean>(false);
  const [studyTint, setStudyTint] = useState<'default' | 'sepia' | 'dark'>('default');
  const [isStudyBarPinned, setIsStudyBarPinned] = useState<boolean>(true);
  const [isStudyBarHovered, setIsStudyBarHovered] = useState<boolean>(false);

  // 3. Navigation Panes (Left Drawer)
  const [isNavSidebarOpen, setIsNavSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pdflow_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleNavSidebar = useCallback((openState?: boolean | ((prev: boolean) => boolean)) => {
    setIsNavSidebarOpen((prev) => {
      const next = typeof openState === 'function' 
        ? openState(prev) 
        : typeof openState === 'boolean' 
          ? openState 
          : !prev;
      try {
        localStorage.setItem('pdflow_sidebar_open', String(next));
      } catch {}
      return next;
    });
  }, []);
  const [navSidebarTab, setNavSidebarTab] = useState<NavSidebarTab>('thumbnails');
  const [outline, setOutline] = useState<PDFOutlineNode[]>([]);
  const [attachments, setAttachments] = useState<PDFAttachment[]>([]);
  const [bookmarks, setBookmarks] = useState<PDFBookmark[]>([]);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const programmaticScrollTimeoutRef = useRef<any>(null);

  // 4. Search & Indexing Engine
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCaseSensitive, setIsCaseSensitive] = useState<boolean>(false);
  const [isWholeWord, setIsWholeWord] = useState<boolean>(false);
  const [isRegex, setIsRegex] = useState<boolean>(false);
  const [isMultiDocSearch, setIsMultiDocSearch] = useState<boolean>(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const [inDocMatches, setInDocMatches] = useState<SearchMatch[]>([]);
  const [multiDocResults, setMultiDocResults] = useState<MultiDocSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // 5. Markup, Annotation & Drawing Suite
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);
  const [activeAnnotationTool, setActiveAnnotationTool] = useState<AnnotationToolType>('select');
  const [activeColor, setActiveColor] = useState<string>('#f59e0b');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [undoStack, setUndoStack] = useState<PDFAnnotation[][]>([]);
  const [redoStack, setRedoStack] = useState<PDFAnnotation[][]>([]);
  const [activeStickyModalAnnId, setActiveStickyModalAnnId] = useState<string | null>(null);

  // Derive active modal annotation directly from annotations state
  const activeStickyModalAnn = useMemo(() => {
    return annotations.find((a) => a.id === activeStickyModalAnnId) || null;
  }, [annotations, activeStickyModalAnnId]);

  // Extracted Page Texts for Search & Reflow
  const [pagesText, setPagesText] = useState<PageTextData[]>([]);

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const textLayerMapRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderedPagesRef = useRef<Set<string>>(new Set());
  const activeRenderTasksRef = useRef<Map<number, any>>(new Map());
  const activeTextTasksRef = useRef<Map<number, any>>(new Map());

  // Load Annotations & Bookmarks
  useEffect(() => {
    if (initialAnnotations && initialAnnotations.length > 0) {
      setAnnotations(initialAnnotations);
    } else {
      try {
        const savedAnn = localStorage.getItem(`pdf_annotations_${doc.name}`);
        if (savedAnn) {
          const parsed = JSON.parse(savedAnn);
          setAnnotations(parsed.map((a: any) => ({ ...a, createdAt: new Date(a.createdAt) })));
        } else {
          setAnnotations([]);
        }
      } catch {
        setAnnotations([]);
      }
    }

    try {
      const savedBm = localStorage.getItem(`pdf_bookmarks_${doc.name}`);
      if (savedBm) {
        const parsedBm = JSON.parse(savedBm);
        setBookmarks(parsedBm.map((b: any) => ({ ...b, createdAt: new Date(b.createdAt) })));
      } else {
        setBookmarks([]);
      }
    } catch {
      setBookmarks([]);
    }
  }, [doc.name, initialAnnotations]);

  // Session state sync ref to preserve current tab state when switching
  const sessionSyncRef = useRef({ page: currentPage, scale, rotation, annotations });
  useEffect(() => {
    sessionSyncRef.current = { page: currentPage, scale, rotation, annotations };
  }, [currentPage, scale, rotation, annotations]);

  useEffect(() => {
    return () => {
      onSaveSessionState?.(sessionSyncRef.current);
    };
  }, [onSaveSessionState]);

  // Persist Annotations Helper
  const persistAnnotations = useCallback((newAnnotations: PDFAnnotation[]) => {
    try {
      localStorage.setItem(`pdf_annotations_${doc.name}`, JSON.stringify(newAnnotations));
    } catch {}
  }, [doc.name]);

  // Add Annotation
  const handleAddAnnotation = useCallback((newAnn: PDFAnnotation) => {
    setUndoStack((prev) => [...prev, annotations]);
    setRedoStack([]);
    const updated = [...annotations, newAnn];
    setAnnotations(updated);
    persistAnnotations(updated);
  }, [annotations, persistAnnotations]);

  // Update Annotation
  const handleUpdateAnnotation = useCallback((updatedAnn: PDFAnnotation) => {
    setUndoStack((prev) => [...prev, annotations]);
    const updated = annotations.map((a) => (a.id === updatedAnn.id ? updatedAnn : a));
    setAnnotations(updated);
    persistAnnotations(updated);
  }, [annotations, persistAnnotations]);

  // Delete Annotation
  const handleDeleteAnnotation = useCallback((id: string) => {
    setUndoStack((prev) => [...prev, annotations]);
    const updated = annotations.filter((a) => a.id !== id);
    setAnnotations(updated);
    persistAnnotations(updated);
    if (activeStickyModalAnnId === id) {
      setActiveStickyModalAnnId(null);
    }
  }, [annotations, persistAnnotations, activeStickyModalAnnId]);

  // Clear Annotations on Current Page
  const handleClearPageAnnotations = useCallback(() => {
    const pageAnns = annotations.filter((a) => a.pageNum === currentPage);
    if (pageAnns.length === 0) return;

    setUndoStack((prev) => [...prev, annotations]);
    const updated = annotations.filter((a) => a.pageNum !== currentPage);
    setAnnotations(updated);
    persistAnnotations(updated);
  }, [annotations, currentPage, persistAnnotations]);

  // Undo Annotation
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, annotations]);
    setUndoStack((prev) => prev.slice(0, -1));
    setAnnotations(previous);
    persistAnnotations(previous);
  }, [undoStack, annotations, persistAnnotations]);

  // Redo Annotation
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, annotations]);
    setRedoStack((prev) => prev.slice(0, -1));
    setAnnotations(next);
    persistAnnotations(next);
  }, [redoStack, annotations, persistAnnotations]);

  // Export XFDF
  const handleExportXFDF = useCallback(() => {
    const xfdfString = exportToXFDF(annotations, doc.name);
    downloadFile(xfdfString, `${doc.name.replace(/\.[^/.]+$/, '')}_annotations.xfdf`, 'application/vnd.adobe.xfdf');
  }, [annotations, doc.name]);

  // Export JSON
  const handleExportJSON = useCallback(() => {
    const jsonString = exportToJSON(annotations, doc.name);
    downloadFile(jsonString, `${doc.name.replace(/\.[^/.]+$/, '')}_annotations.json`, 'application/json');
  }, [annotations, doc.name]);

  // Save Bookmarks to localStorage
  const handleAddBookmark = useCallback((pageNumber: number, title: string, color: string) => {
    const newBm: PDFBookmark = {
      id: `${Date.now()}-${pageNumber}`,
      docId: doc.id,
      pageNumber,
      title,
      color,
      createdAt: new Date(),
    };
    setBookmarks((prev) => {
      const updated = [newBm, ...prev];
      try {
        localStorage.setItem(`pdf_bookmarks_${doc.name}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [doc.id, doc.name]);

  const handleRemoveBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      try {
        localStorage.setItem(`pdf_bookmarks_${doc.name}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [doc.name]);

  // 1. Load PDF Document, Outline, Attachments & Extract Page Texts (with Global Proxy & Text Caching)
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    renderedPagesRef.current.clear();

    activeRenderTasksRef.current.forEach((task) => {
      try { task.cancel(); } catch {}
    });
    activeRenderTasksRef.current.clear();
    canvasMapRef.current.clear();

    const initializeDocument = async (loadedPdf: pdfjsLib.PDFDocumentProxy) => {
      if (isCancelled) return;
      setPdfDoc(loadedPdf);

      // Fast-path: If text index is already in memory, use it immediately
      if (globalTextIndexCache.has(doc.id)) {
        setPagesText(globalTextIndexCache.get(doc.id)!);
      }

      // Step A: Fast Page 1 display - get Page 1 geometry with intrinsic rotation
      const pageList: PageInfo[] = [];
      try {
        const firstPage = await loadedPdf.getPage(1);
        const firstRot = firstPage.rotate || 0;
        const firstVp = firstPage.getViewport({ scale: 1.0, rotation: firstRot });
        for (let i = 1; i <= loadedPdf.numPages; i++) {
          pageList.push({
            pageNum: i,
            width: firstVp.width,
            height: firstVp.height,
          });
        }
      } catch {
        for (let i = 1; i <= loadedPdf.numPages; i++) {
          pageList.push({ pageNum: i, width: 612, height: 792 });
        }
      }

      if (isCancelled) return;
      setPages([...pageList]);
      setLoading(false);

      if (initialPage && initialPage > 1) {
        setTimeout(() => {
          scrollToPage(initialPage);
        }, 100);
      }

      // Step B: Asynchronous background extraction of full geometry, text index, outline & attachments
      const textList: PageTextData[] = [];
      for (let i = 1; i <= loadedPdf.numPages; i++) {
        if (isCancelled) return;
        try {
          const page = await loadedPdf.getPage(i);
          const pageRot = page.rotate || 0;
          const vp = page.getViewport({ scale: 1.0, rotation: pageRot });
          pageList[i - 1] = { pageNum: i, width: vp.width, height: vp.height };

          if (!globalTextIndexCache.has(doc.id)) {
            const textContent = await page.getTextContent();
            const pageString = textContent.items.map((item: any) => item.str).join(' ');
            textList.push({ pageNum: i, text: pageString });
          }
        } catch {
          if (!globalTextIndexCache.has(doc.id)) {
            textList.push({ pageNum: i, text: '' });
          }
        }
      }

      if (!isCancelled) {
        setPages([...pageList]);
        if (!globalTextIndexCache.has(doc.id)) {
          globalTextIndexCache.set(doc.id, textList);
          setPagesText(textList);
        }
      }

      // Extract Outline
      try {
        const rawOutline = await loadedPdf.getOutline();
        if (rawOutline && rawOutline.length > 0 && !isCancelled) {
          const parseOutlineNodes = (items: any[]): PDFOutlineNode[] => {
            return items.map((item) => ({
              title: item.title,
              dest: item.dest,
              items: item.items ? parseOutlineNodes(item.items) : [],
            }));
          };
          setOutline(parseOutlineNodes(rawOutline));
        } else if (!isCancelled) {
          setOutline([]);
        }
      } catch {
        if (!isCancelled) setOutline([]);
      }

      // Extract Attachments
      try {
        const rawAttachments = await loadedPdf.getAttachments();
        if (rawAttachments && !isCancelled) {
          const attList: PDFAttachment[] = [];
          for (const key of Object.keys(rawAttachments)) {
            const att = rawAttachments[key];
            const sizeInKb = (att.content.length / 1024).toFixed(1) + ' KB';
            attList.push({
              filename: att.filename || key,
              size: sizeInKb,
              rawSize: att.content.length,
              content: att.content,
            });
          }
          setAttachments(attList);
        } else if (!isCancelled) {
          setAttachments([]);
        }
      } catch {
        if (!isCancelled) setAttachments([]);
      }
    };

    // Check if proxy already exists in memory and is active
    const cachedProxy = globalDocProxyCache.get(doc.blobUrl);
    if (cachedProxy && !(cachedProxy as any).destroyed) {
      initializeDocument(cachedProxy);
    } else {
      const loadingTask = pdfjsLib.getDocument({
        url: doc.blobUrl,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@5.6.205/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.6.205/standard_fonts/',
        enableXfa: true,
      });

      loadingTask.promise
        .then((loadedPdf) => {
          if (isCancelled) {
            try { loadedPdf.destroy(); } catch {}
            return;
          }
          globalDocProxyCache.set(doc.blobUrl, loadedPdf);
          initializeDocument(loadedPdf);
        })
        .catch((err) => {
          if (!isCancelled) {
            console.error('Error loading PDF:', err);
            setLoading(false);
          }
        });
    }

    return () => {
      isCancelled = true;
      activeRenderTasksRef.current.forEach((task) => {
        try { task.cancel(); } catch {}
      });
      activeRenderTasksRef.current.clear();
    };
  }, [doc.blobUrl]);

  // 2. High-DPI Page & Text Layer Rendering Engine
  const renderCanvasPage = useCallback(async (pageNum: number, rot: number, currentScale: number) => {
    if (!pdfDoc) return;
    const canvas = canvasMapRef.current.get(pageNum);
    if (!canvas) return;

    const renderKey = `${pageNum}-${rot}-${currentScale}`;
    if (renderedPagesRef.current.has(renderKey)) return;

    if (activeRenderTasksRef.current.has(pageNum)) {
      try {
        activeRenderTasksRef.current.get(pageNum)?.cancel();
      } catch {}
      activeRenderTasksRef.current.delete(pageNum);
    }

    if (activeTextTasksRef.current.has(pageNum)) {
      try {
        activeTextTasksRef.current.get(pageNum)?.cancel();
      } catch {}
      activeTextTasksRef.current.delete(pageNum);
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const outputScale = window.devicePixelRatio || 1;
      const pageRotate = page.rotate || 0;
      const totalRotation = (pageRotate + rot) % 360;
      const viewport = page.getViewport({ scale: currentScale, rotation: totalRotation });

      const scaledWidth = Math.floor(viewport.width * outputScale);
      const scaledHeight = Math.floor(viewport.height * outputScale);

      // Double-buffered rendering via offscreen canvas: avoids blanking the existing screen
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = scaledWidth;
      offscreenCanvas.height = scaledHeight;
      const offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });
      if (!offscreenCtx) return;

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      const renderContext = {
        canvasContext: offscreenCtx,
        transform: transform,
        viewport: viewport,
        canvas: offscreenCanvas,
      };

      const task = page.render(renderContext);
      activeRenderTasksRef.current.set(pageNum, task);
      await task.promise;
      
      activeRenderTasksRef.current.delete(pageNum);

      // Instantly paint the completed high-res frame to visible canvas with zero flicker
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.drawImage(offscreenCanvas, 0, 0);
      }
      renderedPagesRef.current.add(renderKey);

      // Render Official PDF.js Text Selection Layer
      const textContainer = textLayerMapRef.current.get(pageNum);
      if (textContainer) {
        textContainer.innerHTML = '';
        const textViewport = page.getViewport({ scale: currentScale, rotation: totalRotation });
        textContainer.style.width = `${Math.floor(textViewport.width)}px`;
        textContainer.style.height = `${Math.floor(textViewport.height)}px`;
        textContainer.style.setProperty('--scale-factor', `${currentScale}`);
        textContainer.style.setProperty('--total-scale-factor', `${currentScale}`);

        const textContent = await page.getTextContent();
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textContainer,
          viewport: textViewport,
        });

        activeTextTasksRef.current.set(pageNum, textLayer);
        await textLayer.render();
        activeTextTasksRef.current.delete(pageNum);
      }
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(`Page render error on page ${pageNum}:`, err);
      }
      activeRenderTasksRef.current.delete(pageNum);
      activeTextTasksRef.current.delete(pageNum);
    }
  }, [pdfDoc]);

  // Virtual GPU Canvas Discarding: Reclaims GPU VRAM for offscreen pages
  const unloadCanvasPage = useCallback((pageNum: number) => {
    if (activeRenderTasksRef.current.has(pageNum)) {
      try { activeRenderTasksRef.current.get(pageNum)?.cancel(); } catch {}
      activeRenderTasksRef.current.delete(pageNum);
    }
    if (activeTextTasksRef.current.has(pageNum)) {
      try { activeTextTasksRef.current.get(pageNum)?.cancel(); } catch {}
      activeTextTasksRef.current.delete(pageNum);
    }

    // Clear DOM textLayer to release memory
    const textContainer = textLayerMapRef.current.get(pageNum);
    if (textContainer) {
      textContainer.innerHTML = '';
    }

    // Free canvas GPU buffer
    const canvas = canvasMapRef.current.get(pageNum);
    if (canvas && canvas.width > 1) {
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, 1, 1);
    }

    // Unmark page so it renders cleanly when scrolled back
    Array.from(renderedPagesRef.current).forEach((key) => {
      if (key.startsWith(`${pageNum}-`)) {
        renderedPagesRef.current.delete(key);
      }
    });
  }, []);

  // 3. Lazy Viewport Rendering via IntersectionObserver with Virtual GPU Discarding
  useEffect(() => {
    if (!pdfDoc || pages.length === 0) return;

    // Render Page 1 immediately
    renderCanvasPage(1, rotation, scale);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.getAttribute('data-page') || '1', 10);
          if (entry.isIntersecting) {
            renderCanvasPage(pageNum, rotation, scale);
          } else {
            // Virtual Page Recycling: Reclaim GPU memory when scrolled >1200px away
            const rootBounds = entry.rootBounds;
            if (rootBounds) {
              const distanceAbove = rootBounds.top - entry.boundingClientRect.bottom;
              const distanceBelow = entry.boundingClientRect.top - rootBounds.bottom;
              if (distanceAbove > 1200 || distanceBelow > 1200) {
                unloadCanvasPage(pageNum);
              }
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '600px 0px 600px 0px',
        threshold: 0.02,
      }
    );

    const pageElements = scrollContainerRef.current?.querySelectorAll('[data-page]');
    pageElements?.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, pages, layoutMode, rotation, scale, renderCanvasPage, unloadCanvasPage]);

  // Re-render visible pages on scale / rotation change (debounced for smooth zooming)
  useEffect(() => {
    renderedPagesRef.current.clear();
    const timer = setTimeout(() => {
      pages.forEach((p) => {
        const el = scrollContainerRef.current?.querySelector(`[data-page="${p.pageNum}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight + 600 && rect.bottom > -600) {
            renderCanvasPage(p.pageNum, rotation, scale);
          }
        }
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [scale, rotation, pages, renderCanvasPage]);

  // 4. Zoom Controls & Wheel Listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        setScale((prev) => {
          const next = Math.min(Math.max(prev * factor, 0.4), 2.5);
          return parseFloat(next.toFixed(2));
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // 5. Scroll / Page Navigation Helper (Centers the selected page in the viewport)
  const scrollToPage = useCallback((pageNum: number) => {
    isProgrammaticScrollRef.current = true;
    setCurrentPage(pageNum);

    if (programmaticScrollTimeoutRef.current) {
      clearTimeout(programmaticScrollTimeoutRef.current);
    }
    programmaticScrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 600);

    const container = scrollContainerRef.current;
    if (!container) return;
    const targetEl = container.querySelector(`[data-page="${pageNum}"]`) as HTMLElement | null;
    if (targetEl) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      let scrollTop: number;
      if (targetRect.height < containerRect.height) {
        // Center vertically if page fits within container height
        scrollTop = container.scrollTop + (targetRect.top - containerRect.top) - (containerRect.height - targetRect.height) / 2;
      } else {
        // Align top with comfortable margin if page is taller than container
        scrollTop = container.scrollTop + (targetRect.top - containerRect.top) - 32;
      }

      let scrollLeft: number;
      if (targetRect.width < containerRect.width) {
        scrollLeft = container.scrollLeft + (targetRect.left - containerRect.left) - (containerRect.width - targetRect.width) / 2;
      } else {
        scrollLeft = container.scrollLeft + (targetRect.left - containerRect.left) - 16;
      }

      container.scrollTo({
        top: Math.max(0, Math.round(scrollTop)),
        left: Math.max(0, Math.round(scrollLeft)),
        behavior: 'smooth',
      });
    }
  }, []);

  // 5b. Active Page Detection during Viewport Scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || pages.length === 0) return;

    let timeoutId: any = null;
    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (isProgrammaticScrollRef.current) return;
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;

        let closestPage = 1;
        let minDistance = Infinity;

        pages.forEach((p) => {
          const el = container.querySelector(`[data-page="${p.pageNum}"]`);
          if (el) {
            const rect = el.getBoundingClientRect();
            const pageCenter = rect.top + rect.height / 2;
            const distance = Math.abs(pageCenter - containerCenter);
            if (distance < minDistance) {
              minDistance = distance;
              closestPage = p.pageNum;
            }
          }
        });

        setCurrentPage((prev) => (prev !== closestPage ? closestPage : prev));
      }, 50);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pages]);

  // TOC Outline destination resolver
  const handleNavigateToDest = useCallback(async (dest: any, pageNumber?: number) => {
    if (pageNumber && pageNumber >= 1 && pageNumber <= pages.length) {
      scrollToPage(pageNumber);
      return;
    }

    if (!pdfDoc || !dest) return;

    try {
      let explicitDest = dest;
      if (typeof dest === 'string') {
        explicitDest = await pdfDoc.getDestination(dest);
      }

      if (Array.isArray(explicitDest) && explicitDest.length > 0) {
        const pageIndex = await pdfDoc.getPageIndex(explicitDest[0]);
        const targetPage = pageIndex + 1;
        scrollToPage(targetPage);
      }
    } catch (err) {
      console.warn('Could not resolve destination:', err);
    }
  }, [pdfDoc, pages.length, scrollToPage]);

  // Download Attachment Helper
  const handleDownloadAttachment = useCallback((att: PDFAttachment) => {
    const blob = new Blob([att.content as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // 6. Search Engine (In-Document & Multi-Document with Regex / Case / Word matching)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setInDocMatches([]);
      setMultiDocResults([]);
      setCurrentMatchIndex(0);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        let pattern: RegExp;
        const flags = isCaseSensitive ? 'g' : 'gi';

        if (isRegex) {
          pattern = new RegExp(searchQuery, flags);
        } else if (isWholeWord) {
          const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          pattern = new RegExp(`\\b${escaped}\\b`, flags);
        } else {
          const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          pattern = new RegExp(escaped, flags);
        }

        // Search in Current Document
        const currentMatches: SearchMatch[] = [];
        pagesText.forEach(({ pageNum, text }) => {
          if (!text) return;
          let match;
          let localIdx = 0;
          while ((match = pattern.exec(text)) !== null) {
            const start = Math.max(0, match.index - 35);
            const end = Math.min(text.length, match.index + match[0].length + 35);
            const snippet = `...${text.slice(start, end).trim()}...`;
            currentMatches.push({
              pageNum,
              matchIndex: localIdx++,
              textSnippet: snippet,
              startIndex: match.index,
              endIndex: match.index + match[0].length,
            });
            if (currentMatches.length > 500) break; // performance cap
          }
        });

        setInDocMatches(currentMatches);
        if (currentMatches.length > 0) {
          setCurrentMatchIndex(0);
          scrollToPage(currentMatches[0].pageNum);
        }

        // Multi-Document Search (if enabled)
        if (isMultiDocSearch && allDocs.length > 0) {
          const multiResults: MultiDocSearchResult[] = [];
          for (const otherDoc of allDocs) {
            if (otherDoc.id === doc.id) {
              if (currentMatches.length > 0) {
                multiResults.push({
                  docId: doc.id,
                  docName: doc.name,
                  matches: currentMatches,
                });
              }
              continue;
            }

            // High-Performance In-Memory Search Cache
            let otherText = globalTextIndexCache.get(otherDoc.id);
            if (!otherText) {
              try {
                let otherPdf = globalDocProxyCache.get(otherDoc.blobUrl);
                if (!otherPdf) {
                  otherPdf = await pdfjsLib.getDocument(otherDoc.blobUrl).promise;
                  globalDocProxyCache.set(otherDoc.blobUrl, otherPdf);
                }
                const extractedText: PageTextData[] = [];
                for (let i = 1; i <= otherPdf.numPages; i++) {
                  const p = await otherPdf.getPage(i);
                  const tc = await p.getTextContent();
                  const str = tc.items.map((it: any) => it.str).join(' ');
                  extractedText.push({ pageNum: i, text: str });
                }
                otherText = extractedText;
                globalTextIndexCache.set(otherDoc.id, extractedText);
              } catch (err) {
                console.warn('Error reading text for search:', otherDoc.name, err);
              }
            }

            if (otherText && otherText.length > 0) {
              const otherMatches: SearchMatch[] = [];
              otherText.forEach(({ pageNum, text: str }) => {
                if (!str) return;
                let match;
                let lIdx = 0;
                while ((match = pattern.exec(str)) !== null) {
                  const start = Math.max(0, match.index - 35);
                  const end = Math.min(str.length, match.index + match[0].length + 35);
                  otherMatches.push({
                    pageNum,
                    matchIndex: lIdx++,
                    textSnippet: `...${str.slice(start, end).trim()}...`,
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                  });
                  if (otherMatches.length > 300) break;
                }
              });

              if (otherMatches.length > 0) {
                multiResults.push({
                  docId: otherDoc.id,
                  docName: otherDoc.name,
                  matches: otherMatches,
                });
              }
            }
          }
          setMultiDocResults(multiResults);
        }
      } catch (err) {
        console.warn('Search execution error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [searchQuery, isCaseSensitive, isWholeWord, isRegex, isMultiDocSearch, pagesText, allDocs, doc.id, doc.name, scrollToPage]);

  // Match Navigation
  const handleNextMatch = useCallback(() => {
    if (inDocMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % inDocMatches.length;
    setCurrentMatchIndex(nextIdx);
    scrollToPage(inDocMatches[nextIdx].pageNum);
  }, [inDocMatches, currentMatchIndex, scrollToPage]);

  const handlePrevMatch = useCallback(() => {
    if (inDocMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + inDocMatches.length) % inDocMatches.length;
    setCurrentMatchIndex(prevIdx);
    scrollToPage(inDocMatches[prevIdx].pageNum);
  }, [inDocMatches, currentMatchIndex, scrollToPage]);

  // Zoom Helpers
  const handleZoomIn = () => setScale((prev) => Math.min(parseFloat((prev + 0.1).toFixed(2)), 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(parseFloat((prev - 0.1).toFixed(2)), 0.4));
  const handleZoomReset = () => setScale(1.0);
  const handleFitWidth = () => {
    if (!scrollContainerRef.current || pages.length === 0) return;
    const containerW = scrollContainerRef.current.clientWidth - 80;
    const pageW = pages[0].width;
    setScale(parseFloat(Math.min(2.5, Math.max(0.4, containerW / pageW)).toFixed(2)));
  };
  const handleFitPage = () => {
    if (!scrollContainerRef.current || pages.length === 0) return;
    const containerH = scrollContainerRef.current.clientHeight - 80;
    const pageH = pages[0].height;
    setScale(parseFloat(Math.min(2.5, Math.max(0.4, containerH / pageH)).toFixed(2)));
  };

  // Rotation Helpers
  const handleRotateCW = () => setRotation((prev) => (prev + 90) % 360);

  // Fullscreen & Minimal Study Mode
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        setIsStudyMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleStudyMode = useCallback(() => {
    if (!containerRef.current) return;
    if (!isStudyMode) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsStudyMode(true);
      setIsFullscreen(true);
      setIsNavSidebarOpen(false); // Clean canvas for studying
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsStudyMode(false);
      setIsFullscreen(false);
    }
  }, [isStudyMode]);

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
      setIsStudyMode(false);
    }
  };

  const tintStyle = useMemo(() => {
    if (!isStudyMode || studyTint === 'default') return {};
    if (studyTint === 'sepia') {
      return {
        filter: 'sepia(0.35) contrast(0.95)',
        backgroundColor: '#f5f0e6',
      };
    }
    if (studyTint === 'dark') {
      return {
        filter: 'invert(0.92) hue-rotate(180deg) contrast(0.95)',
        backgroundColor: '#121214',
      };
    }
    return {};
  }, [isStudyMode, studyTint]);

  // Keyboard Shortcuts (Esc closes open overlays/menus without closing PDF, ⌘Z undo, ⌘⇧Z redo, ⌘F search, ⌘B sidebar, Zen mode, Rotations)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text'))) {
        if (e.key === 'Escape') {
          target.blur();
          setIsSearchOpen(false);
          setIsReflowOpen(false);
          setActiveStickyModalAnnId(null);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (activeStickyModalAnnId) {
          setActiveStickyModalAnnId(null);
          e.preventDefault();
        } else if (isSearchOpen) {
          setIsSearchOpen(false);
          e.preventDefault();
        } else if (isReflowOpen) {
          setIsReflowOpen(false);
          e.preventDefault();
        } else if (showLayoutMenu) {
          setShowLayoutMenu(false);
          e.preventDefault();
        } else if (isNavSidebarOpen) {
          toggleNavSidebar(false);
          e.preventDefault();
        } else if (activeAnnotationTool !== 'select') {
          setActiveAnnotationTool('select');
          e.preventDefault();
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleNavSidebar();
      } else if (e.ctrlKey && e.key === 'Tab') {
        // Switch between open tabs
        e.preventDefault();
        if (allDocs && allDocs.length > 1 && onSelectDoc) {
          const currentIndex = allDocs.findIndex((d) => d.id === doc.id);
          if (currentIndex !== -1) {
            let nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
            if (nextIndex >= allDocs.length) nextIndex = 0;
            if (nextIndex < 0) nextIndex = allDocs.length - 1;
            onSelectDoc(allDocs[nextIndex]);
          }
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'w' || e.key === 'W')) {
        // Close active tab
        e.preventDefault();
        if (onCloseDoc) {
          onCloseDoc(doc.id);
        } else if (onClose) {
          onClose();
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 't' || e.key === 'T')) {
        // Open new tab
        e.preventDefault();
        if (onNewTab) {
          onNewTab();
        } else if (onOpenDocument) {
          onOpenDocument();
        }
      } else if (isStudyMode && (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ')) {
        e.preventDefault();
        scrollToPage(Math.min(pages.length, currentPage + 1));
      } else if (isStudyMode && (e.key === 'ArrowLeft' || e.key === 'PageUp')) {
        e.preventDefault();
        scrollToPage(Math.max(1, currentPage - 1));
      } else if (isStudyMode && (e.key === 'w' || e.key === 'W')) {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          handleFitWidth();
        }
      } else if (isStudyMode && (e.key === 'p' || e.key === 'P')) {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          handleFitPage();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          handleToggleStudyMode();
        }
      } else if (e.key === 'v' || e.key === 'V') {
        if (!e.ctrlKey && !e.metaKey) setActiveAnnotationTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        if (!e.ctrlKey && !e.metaKey) setActiveAnnotationTool('highlight');
      } else if (e.key === 'p' || e.key === 'P') {
        if (!e.ctrlKey && !e.metaKey) setActiveAnnotationTool('pen');
      } else if (e.key === 't' || e.key === 'T') {
        if (!e.ctrlKey && !e.metaKey) setActiveAnnotationTool('textbox');
      } else if (e.key === 'n' || e.key === 'N') {
        if (!e.ctrlKey && !e.metaKey) setActiveAnnotationTool('sticky-note');
      } else if (e.key === 'm' || e.key === 'M') {
        if (!e.ctrlKey && !e.metaKey) setActiveAnnotationTool('voice-note');
      } else if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setRotation((prev) => (prev + 90) % 360);
        }
      } else if (e.key === 'z' || e.key === 'Z') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setFocusMode((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSearchOpen, 
    isReflowOpen, 
    showLayoutMenu, 
    isNavSidebarOpen, 
    activeStickyModalAnn, 
    activeAnnotationTool, 
    handleUndo, 
    handleRedo,
    allDocs,
    doc.id,
    onSelectDoc,
    onCloseDoc,
    onClose,
    onNewTab,
    onOpenDocument,
    isStudyMode,
    handleToggleStudyMode,
    handleFitWidth,
    handleFitPage,
    scrollToPage,
    currentPage,
    pages.length
  ]);

  // 7. Page Layout Groups Construction
  const layoutGroups = useMemo(() => {
    if (pages.length === 0) return [];

    if (layoutMode === 'single') {
      const active = pages.find((p) => p.pageNum === currentPage) || pages[0];
      return [[active]];
    }

    if (layoutMode === 'two-page') {
      const groups: PageInfo[][] = [];
      for (let i = 0; i < pages.length; i += 2) {
        const pair = [pages[i]];
        if (pages[i + 1]) pair.push(pages[i + 1]);
        groups.push(pair);
      }
      return groups;
    }

    if (layoutMode === 'facing-pages') {
      const groups: PageInfo[][] = [];
      if (facingCoverPage) {
        // Page 1 standalone as cover
        groups.push([pages[0]]);
        for (let i = 1; i < pages.length; i += 2) {
          const pair = [pages[i]];
          if (pages[i + 1]) pair.push(pages[i + 1]);
          groups.push(pair);
        }
      } else {
        for (let i = 0; i < pages.length; i += 2) {
          const pair = [pages[i]];
          if (pages[i + 1]) pair.push(pages[i + 1]);
          groups.push(pair);
        }
      }
      return groups;
    }

    // Default Continuous Scroll
    return pages.map((p) => [p]);
  }, [pages, layoutMode, facingCoverPage, currentPage]);

  // Print & Download
  const handlePrint = () => {
    const w = window.open(doc.blobUrl, '_blank');
    w?.focus();
    w?.print();
  };

  const handleExportAnnotatedPDF = async () => {
    if (annotations.length === 0) {
      handleDownload();
      return;
    }
    try {
      setIsBakingAnnotations(true);
      const arrayBuffer = await doc.file.arrayBuffer();
      const bakedBytes = await bakeAnnotationsToPDF(arrayBuffer, annotations);
      downloadFile(bakedBytes, `${doc.name.replace(/\.[^/.]+$/, '')}_annotated.pdf`, 'application/pdf');
    } catch (err) {
      console.error('Error baking annotations to PDF:', err);
      // Fallback
      handleDownload();
    } finally {
      setIsBakingAnnotations(false);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = doc.blobUrl;
    a.download = doc.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full flex flex-col bg-background text-zinc-800 dark:text-zinc-200 overflow-hidden relative ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Multi-Document Google Chrome-Style Tab Bar (Hidden in Study Mode) */}
      {!isStudyMode && allDocs && allDocs.length > 0 && onSelectDoc ? (
        <DocumentTabBar
          docs={allDocs}
          activeDocId={doc.id}
          onSelectDoc={onSelectDoc}
          onCloseDoc={onCloseDoc || ((_id) => onClose?.())}
          onNewTab={onNewTab || onOpenDocument || (() => {})}
        />
      ) : null}

      {/* Top Header: Either Minimal Fullscreen Study Bar OR Standard App Header */}
      {isStudyMode ? (
        <>
          {!isStudyBarPinned && (
            <div 
              onMouseEnter={() => setIsStudyBarHovered(true)}
              className="absolute top-0 inset-x-0 h-3 z-50 cursor-pointer"
            />
          )}
          <div 
            onMouseEnter={() => setIsStudyBarHovered(true)}
            onMouseLeave={() => setIsStudyBarHovered(false)}
            className={`w-full z-40 transition-transform duration-200 ${
              isStudyBarPinned || isStudyBarHovered 
                ? 'translate-y-0 relative' 
                : '-translate-y-full absolute top-0'
            }`}
          >
            <MinimalStudyBar
              currentPage={currentPage}
              totalPages={pages.length}
              onPageChange={scrollToPage}
              scale={scale}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onFitWidth={handleFitWidth}
              onFitPage={handleFitPage}
              onZoomReset={handleZoomReset}
              layoutMode={layoutMode}
              onToggleLayoutMode={() => setLayoutMode((m) => m === 'continuous' ? 'single' : 'continuous')}
              isSidebarOpen={isNavSidebarOpen}
              onToggleSidebar={() => toggleNavSidebar()}
              isSearchOpen={isSearchOpen}
              onToggleSearch={() => setIsSearchOpen((s) => !s)}
              studyTint={studyTint}
              onSelectStudyTint={setStudyTint}
              isPinned={isStudyBarPinned}
              onTogglePin={() => setIsStudyBarPinned((p) => !p)}
              onExitStudyMode={handleToggleStudyMode}
            />
          </div>
        </>
      ) : (
        <header className={`h-12 border-b border-border bg-surface/95 dark:bg-surface/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-3 flex-shrink-0 z-20 transition-opacity duration-300 select-none ${
          focusMode ? 'opacity-20 hover:opacity-100' : 'opacity-100'
        }`}>
        
        {/* Left: Navigation Drawer Toggle & Document details */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          

          {/* Document Title */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center flex-shrink-0 shadow-xs">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px] sm:max-w-xs md:max-w-sm">
              {doc.name}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-border hidden md:block" />

          {/* Page Navigator */}
          <div className="flex items-center gap-1 bg-surface dark:bg-card border border-border rounded-lg px-1 py-0.5 text-xs font-mono tabular-nums">
            <button
              type="button"
              onClick={() => scrollToPage(Math.max(currentPage - 1, 1))}
              disabled={currentPage <= 1}
              className="h-6 w-6 rounded flex items-center justify-center hover:bg-surface dark:hover:bg-surface disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-blue-500"
              title="Previous Page"
              aria-label="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="px-1 text-[11px] font-medium tabular-nums">
              {currentPage} / {pages.length || 1}
            </span>
            <button
              type="button"
              onClick={() => scrollToPage(Math.min(currentPage + 1, pages.length))}
              disabled={currentPage >= pages.length}
              className="h-6 w-6 rounded flex items-center justify-center hover:bg-surface dark:hover:bg-surface disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-blue-500"
              title="Next Page"
              aria-label="Next Page"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Center/Right: Feature Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          
          {/* 1. Page Layout Mode Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutMenu((prev) => !prev)}
              title="Page Layout Modes"
              className={`h-8 px-2.5 rounded-lg border flex items-center gap-1 text-xs font-medium transition-colors shadow-xs ${
                layoutMode !== 'continuous' ? 'bg-accent/10 border-accent text-accent font-semibold' : 'border-border hover:bg-surface'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden lg:inline capitalize">{layoutMode.replace('-', ' ')}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {showLayoutMenu && (
              <div 
                onClick={() => setShowLayoutMenu(false)}
                className="absolute top-10 right-0 z-50 w-52 p-1.5 rounded-xl bg-card border border-border shadow-xl backdrop-blur-md flex flex-col gap-1 text-xs animate-in fade-in"
              >
                <div className="px-2 py-1 text-[10px] font-mono text-zinc-400 uppercase font-semibold">Page Layout</div>
                <button
                  onClick={() => setLayoutMode('continuous')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${layoutMode === 'continuous' ? 'bg-accent text-white font-bold' : 'hover:bg-surface'}`}
                >
                  <span>Continuous Scroll</span>
                </button>
                <button
                  onClick={() => setLayoutMode('single')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${layoutMode === 'single' ? 'bg-accent text-white font-bold' : 'hover:bg-surface'}`}
                >
                  <span>Single Page View</span>
                </button>
                <button
                  onClick={() => setLayoutMode('two-page')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${layoutMode === 'two-page' ? 'bg-accent text-white font-bold' : 'hover:bg-surface'}`}
                >
                  <span>Two-Page Book View</span>
                </button>
                <button
                  onClick={() => setLayoutMode('facing-pages')}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${layoutMode === 'facing-pages' ? 'bg-accent text-white font-bold' : 'hover:bg-surface'}`}
                >
                  <span>Facing Pages</span>
                </button>

                {layoutMode === 'facing-pages' && (
                  <div className="pt-1 mt-1 border-t border-border px-2 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">Separate Cover</span>
                    <input 
                      type="checkbox" 
                      checked={facingCoverPage} 
                      onChange={(e) => setFacingCoverPage(e.target.checked)}
                      className="accent-accent cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Text Reflow Reader Mode Toggle */}
          <button
            onClick={() => setIsReflowOpen(true)}
            title="Text-Reflow Responsive Reader Mode"
            className="h-8 px-2.5 rounded-lg border border-border hover:bg-surface flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs"
          >
            <BookOpen className="h-3.5 w-3.5 text-accent" />
            <span className="hidden md:inline">Reflow</span>
          </button>

          {/* 3. Search Button [⌘F] */}
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            title="Find & Search (⌘F / Ctrl+F)"
            className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors shadow-xs ${
              isSearchOpen ? 'bg-accent text-white border-accent' : 'border-border hover:bg-surface text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
          </button>

          {/* 4. Focus / Dimming Mode Toggle [Z] */}
          <button
            onClick={() => setFocusMode((prev) => !prev)}
            title={focusMode ? 'Exit Zen Focus Mode [Z]' : 'Enter Zen Focus Mode (Dims UI) [Z]'}
            className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors shadow-xs ${
              focusMode ? 'bg-indigo-600 text-white border-indigo-600' : 'border-border hover:bg-surface text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          {/* 5. Rotate Action */}
          <button
            onClick={handleRotateCW}
            title="Rotate 90° Clockwise [R]"
            className="h-8 w-8 rounded-lg border border-border hover:bg-surface flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors shadow-xs"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>

          {/* Print & Download */}
          <button
            onClick={handlePrint}
            title="Print Document"
            className="h-8 w-8 rounded-lg border border-border hover:bg-surface flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors shadow-xs hidden sm:flex"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleDownload}
            disabled={isBakingAnnotations}
            title={isBakingAnnotations ? "Baking annotations into PDF..." : (annotations.length > 0 ? "Download PDF with Markups" : "Download PDF File")}
            className="h-8 px-2 rounded-lg border border-border hover:bg-surface flex items-center gap-1 text-zinc-600 dark:text-zinc-300 transition-colors shadow-xs hidden sm:flex disabled:opacity-50"
          >
            {isBakingAnnotations ? (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {annotations.length > 0 && !isBakingAnnotations ? (
              <span className="text-[10px] font-mono text-accent font-semibold">Save</span>
            ) : null}
          </button>

          {/* Continuous Pomodoro Study Timer (Shared across normal editor and study mode) */}
          <PomodoroTimer />

          <div className="h-4 w-[1px] bg-border mx-0.5 hidden sm:block" />

          {/* Minimal Fullscreen Study Mode Button */}
          <button
            type="button"
            onClick={handleToggleStudyMode}
            title="Minimal Study Mode [F] — Distraction-free full reading view"
            className="h-8 px-2.5 rounded-lg border border-border hover:bg-surface flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors shadow-xs"
          >
            <GraduationCap className="h-4 w-4 text-blue-500" />
            <span className="hidden xl:inline">Study Mode</span>
          </button>

          <button
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="h-8 w-8 rounded-lg border border-border hover:bg-surface flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors shadow-xs"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close Document"
              className="h-8 px-2.5 rounded-lg bg-surface dark:bg-card hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 flex items-center gap-1 text-xs font-semibold transition-all border border-border"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Close</span>
            </button>
          )}
        </div>

      </header>
      )}

      {/* 2. Floating Search Engine Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        isCaseSensitive={isCaseSensitive}
        onToggleCaseSensitive={() => setIsCaseSensitive((p) => !p)}
        isWholeWord={isWholeWord}
        onToggleWholeWord={() => setIsWholeWord((p) => !p)}
        isRegex={isRegex}
        onToggleRegex={() => setIsRegex((p) => !p)}
        isMultiDoc={isMultiDocSearch}
        onToggleMultiDoc={() => setIsMultiDocSearch((p) => !p)}
        currentMatchIndex={currentMatchIndex}
        totalMatches={inDocMatches.length}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
        isSearching={isSearching}
      />

      {/* 3. Main Split View: Left Navigation Drawer + Viewport Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Navigation Sidebar Drawer */}
        {isNavSidebarOpen ? (
          <ViewerNavSidebar
            isOpen={isNavSidebarOpen}
            onClose={() => toggleNavSidebar(false)}
            activeTab={navSidebarTab}
            onTabChange={setNavSidebarTab}
            docName={doc.name}
            docSize={doc.size}
            pdfDoc={pdfDoc}
            rotation={rotation}
            totalPages={pages.length}
            currentPage={currentPage}
            onPageSelect={scrollToPage}
            outline={outline}
            onNavigateToDest={handleNavigateToDest}
            bookmarks={bookmarks}
            onAddBookmark={handleAddBookmark}
            onRemoveBookmark={handleRemoveBookmark}
            annotations={annotations}
            onSelectAnnotation={(ann) => {
              scrollToPage(ann.pageNum);
              if (ann.type === 'sticky-note' || ann.type === 'voice-note') {
                setActiveStickyModalAnnId(ann.id);
              }
            }}
            onDeleteAnnotation={handleDeleteAnnotation}
            attachments={attachments}
            onDownloadAttachment={handleDownloadAttachment}
            searchQuery={searchQuery}
            inDocMatches={inDocMatches}
            multiDocResults={multiDocResults}
            isMultiDocSearch={isMultiDocSearch}
            onSelectMatch={(pNum, _, docId) => {
              if (docId && docId !== doc.id && onSelectDoc) {
                const targetDoc = allDocs.find((d) => d.id === docId);
                if (targetDoc) onSelectDoc(targetDoc);
              } else {
                scrollToPage(pNum);
              }
            }}
            onOpenOrganizer={onOpenOrganizer}
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
            onReturnToCover={onReturnToCover}
          />
        ) : (
          <div className="absolute top-3 left-3 z-30">
            <button
              type="button"
              onClick={() => toggleNavSidebar(true)}
              title="Show Sidebar (Ctrl+B)"
              aria-label="Show Pages Sidebar"
              className="h-8 px-2.5 rounded-lg border border-border bg-card/95 dark:bg-card/95 backdrop-blur shadow-md flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors cursor-pointer select-none"
            >
              <PanelLeftOpen className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span>Pages</span>
            </button>
          </div>
        )}

        {/* 4. Multi-Mode Responsive Document Viewport */}
        <div 
          ref={scrollContainerRef}
          tabIndex={0}
          className={`flex-1 w-full h-full overflow-y-auto overflow-x-auto py-8 px-4 flex flex-col items-center gap-8 focus:outline-none overscroll-contain bg-background transition-colors duration-200 ${
            layoutMode === 'single' ? 'justify-center min-h-full' : ''
          }`}
          style={{ 
            WebkitOverflowScrolling: 'touch',
            ...tintStyle
          }}
        >
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <p className="text-xs font-mono text-zinc-400">Rendering document...</p>
            </div>
          ) : (
            layoutGroups.map((group, groupIdx) => (
              <div 
                key={groupIdx} 
                className={`flex items-center justify-center gap-6 mx-auto flex-shrink-0 ${layoutMode === 'two-page' || layoutMode === 'facing-pages' ? 'flex-row' : 'flex-col'}`}
              >
                {group.map((p) => {
                  const isRotated90or270 = rotation === 90 || rotation === 270;
                  const baseW = isRotated90or270 ? p.height : p.width;
                  const baseH = isRotated90or270 ? p.width : p.height;
                  const displayWidth = Math.round(baseW * scale);
                  const displayHeight = Math.round(baseH * scale);

                  return (
                    <div
                      key={p.pageNum}
                      data-page={p.pageNum}
                      style={{
                        width: `${displayWidth}px`,
                        height: `${displayHeight}px`,
                      }}
                      className="relative bg-white rounded-md shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-black/10 dark:border-white/15 overflow-hidden flex-shrink-0"
                    >
                      {/* 1. High-DPI Razor-Sharp Canvas Layer */}
                      <canvas
                        ref={(el) => {
                          if (el) canvasMapRef.current.set(p.pageNum, el);
                          else canvasMapRef.current.delete(p.pageNum);
                        }}
                        className="block absolute inset-0 pointer-events-none w-full h-full"
                        style={{
                          width: '100%',
                          height: '100%',
                        }}
                      />

                      {/* 2. Official PDF.js Text Selection Layer */}
                      <div
                        ref={(el) => {
                          if (el) textLayerMapRef.current.set(p.pageNum, el);
                          else textLayerMapRef.current.delete(p.pageNum);
                        }}
                        className="textLayer"
                        style={{
                          width: `${displayWidth}px`,
                          height: `${displayHeight}px`,
                        }}
                      />

                      {/* 3. Interactive Markup & Annotation Overlay Layer */}
                      <AnnotationLayer
                        pageNum={p.pageNum}
                        width={displayWidth}
                        height={displayHeight}
                        activeTool={activeAnnotationTool}
                        activeColor={activeColor}
                        strokeWidth={strokeWidth}
                        annotations={annotations}
                        onAddAnnotation={handleAddAnnotation}
                        onUpdateAnnotation={handleUpdateAnnotation}
                        onDeleteAnnotation={handleDeleteAnnotation}
                        onOpenStickyNote={(ann) => setActiveStickyModalAnnId(ann.id)}
                        onToolUsed={() => setActiveAnnotationTool('select')}
                      />
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

      </div>

      {/* 5. Floating Bottom Unified Markup, Annotation & Zoom Toolbar (Hidden in Study Mode for distraction-free reading) */}
      {!isStudyMode && (
        <FloatingAnnotationToolbar
          activeTool={activeAnnotationTool}
          onSelectTool={setActiveAnnotationTool}
          activeColor={activeColor}
          onSelectColor={setActiveColor}
          strokeWidth={strokeWidth}
          onSelectStrokeWidth={setStrokeWidth}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClearPageAnnotations={handleClearPageAnnotations}
          onExportXFDF={handleExportXFDF}
          onExportJSON={handleExportJSON}
          onExportAnnotatedPDF={handleExportAnnotatedPDF}
          scale={scale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onSetScale={setScale}
          onFitWidth={handleFitWidth}
          onFitPage={handleFitPage}
          focusMode={focusMode}
        />
      )}

      {/* 7. Fullscreen Responsive Text Reflow Reader Modal */}
      <TextReflowView
        isOpen={isReflowOpen}
        onClose={() => setIsReflowOpen(false)}
        pagesText={pagesText}
        docTitle={doc.name}
        currentPage={currentPage}
        onNavigateToPage={scrollToPage}
      />

      {/* 8. Sticky Note & Voice Note Modal */}
      {activeStickyModalAnn ? (
        <StickyNoteModal
          annotation={activeStickyModalAnn}
          isOpen={true}
          onClose={() => setActiveStickyModalAnnId(null)}
          onUpdateAnnotation={handleUpdateAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
        />
      ) : null}

    </div>
  );
}
