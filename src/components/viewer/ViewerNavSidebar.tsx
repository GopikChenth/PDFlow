import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Grid, 
  ListTree, 
  Bookmark, 
  Paperclip, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Trash2, 
  Download, 
  X,
  FileText,
  MessageSquare,
  Mic,
  PenTool,
  Highlighter,
  Square,
  Layers,
  Sun,
  Moon,
  Home,
  Columns,
  PanelLeftClose
} from 'lucide-react';
import { 
  NavSidebarTab, 
  PDFOutlineNode, 
  PDFBookmark, 
  PDFAttachment, 
  SearchMatch, 
  MultiDocSearchResult,
  PDFAnnotation
} from '../../types';

interface ThumbnailCardProps {
  pageNum: number;
  isCurrent: boolean;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  rotation: number;
  columns?: '1' | '2';
  sidebarWidth?: number;
  onSelect: (pageNum: number) => void;
}

const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  pageNum,
  isCurrent,
  pdfDoc,
  rotation,
  columns = '1',
  sidebarWidth = 280,
  onSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rendered, setRendered] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 150, height: 200 });

  // Reset rendered flag on layout, rotation, or sidebar width change
  useEffect(() => {
    setRendered(false);
  }, [columns, rotation, sidebarWidth]);

  // Auto-scroll the active thumbnail into view when current page changes (only if not already in view)
  useEffect(() => {
    if (isCurrent && containerRef.current) {
      const el = containerRef.current;
      const parent = el.closest('.overflow-y-auto');
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const isVisible = elRect.top >= parentRect.top && elRect.bottom <= parentRect.bottom;
        if (!isVisible) {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }
    }
  }, [isCurrent]);

  // Lazy render thumbnail canvas with native integer-pixel scale targets
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    let isCancelled = false;
    let renderTask: any = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting && !rendered && !isCancelled) {
            try {
              const page = await pdfDoc.getPage(pageNum);
              if (isCancelled || !canvasRef.current) return;

              const unscaledVp = page.getViewport({ scale: 1.0, rotation });
              const currentAspect = unscaledVp.width / unscaledVp.height;

              // 1. Native Integer-Pixel Target Width & Height (Dynamically adapts to sidebar expansion)
              const availableWidth = sidebarWidth - 44;
              const cssWidth = columns === '2' 
                ? Math.max(85, Math.floor((availableWidth - 14) / 2)) 
                : Math.min(Math.max(140, availableWidth - 16), 340);
              const cssHeight = Math.round(cssWidth / currentAspect);
              setDimensions({ width: cssWidth, height: cssHeight });

              const scale = cssWidth / unscaledVp.width;
              const viewport = page.getViewport({ scale, rotation });

              const outputScale = window.devicePixelRatio || 1;
              const canvas = canvasRef.current;
              
              // 2. Exact Integer Canvas Buffer (Physical Device Pixels)
              canvas.width = Math.round(viewport.width * outputScale);
              canvas.height = Math.round(viewport.height * outputScale);

              // 3. Exact Integer CSS Layout Size (1:1 with Screen Grid)
              canvas.style.width = `${Math.round(viewport.width)}px`;
              canvas.style.height = `${Math.round(viewport.height)}px`;

              const ctx = canvas.getContext('2d', { alpha: false });
              if (!ctx) return;

              // 4. Solid Opaque Paper Backing
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // 5. Native OutputScale Matrix Transform (Autohinted Vector Rasterization)
              const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

              renderTask = page.render({
                canvasContext: ctx,
                transform,
                viewport,
                canvas,
              });

              await renderTask.promise;
              if (!isCancelled) {
                setRendered(true);
              }
            } catch (err: any) {
              if (err?.name !== 'RenderingCancelledException') {
                console.error(`Thumbnail render error for page ${pageNum}:`, err);
              }
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '250px 0px 250px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      isCancelled = true;
      observer.disconnect();
      if (renderTask) {
        try { renderTask.cancel(); } catch {}
      }
    };
  }, [pdfDoc, pageNum, rotation, rendered, columns]);

  return (
    <div
      ref={containerRef}
      onClick={() => onSelect(pageNum)}
      className="group relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all cursor-pointer select-none"
    >
      {/* Paper Sheet Preview */}
      <div 
        className={`bg-white rounded-[3px] overflow-hidden relative transition-all duration-150 flex items-center justify-center ${
          isCurrent
            ? 'ring-2 ring-blue-600 dark:ring-blue-500 shadow-md'
            : 'border border-zinc-200 dark:border-zinc-700 shadow-xs group-hover:border-zinc-400 dark:group-hover:border-zinc-500 group-hover:shadow-sm'
        }`}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ imageRendering: '-webkit-optimize-contrast' }}
          className={`w-full h-full object-contain transition-opacity duration-200 ${
            rendered ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {!rendered && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40">
            <FileText className="h-5 w-5 opacity-30 animate-pulse" />
            <span className="text-[10px] font-mono opacity-50">{pageNum}</span>
          </div>
        )}
      </div>

      {/* Clean Centered Page Number */}
      <span
        className={`text-[11px] transition-colors font-medium ${
          isCurrent 
            ? 'text-blue-600 dark:text-blue-400 font-bold' 
            : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'
        }`}
      >
        {pageNum}
      </span>
    </div>
  );
};

interface ViewerNavSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavSidebarTab;
  onTabChange: (tab: NavSidebarTab) => void;
  
  // Document Info
  docName?: string;
  docSize?: string;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  rotation?: number;

  // Thumbnails Data
  totalPages: number;
  currentPage: number;
  onPageSelect: (pageNum: number) => void;

  // Outline Data
  outline: PDFOutlineNode[];
  onNavigateToDest: (dest: any, pageNumber?: number) => void;

  // Bookmarks Data
  bookmarks: PDFBookmark[];
  onAddBookmark: (pageNumber: number, title: string, color: string) => void;
  onRemoveBookmark: (id: string) => void;

  // Annotations & Comments Data
  annotations: PDFAnnotation[];
  onSelectAnnotation: (ann: PDFAnnotation) => void;
  onDeleteAnnotation: (id: string) => void;

  // Attachments Data
  attachments: PDFAttachment[];
  onDownloadAttachment: (att: PDFAttachment) => void;

  // Search Results
  searchQuery: string;
  inDocMatches: SearchMatch[];
  multiDocResults: MultiDocSearchResult[];
  isMultiDocSearch: boolean;
  onSelectMatch: (pageNum: number, matchIndex: number, docId?: string) => void;

  // Workspace Actions
  onBackToTools?: () => void;
  onOpenDocument?: () => void;
  onOpenOrganizer?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onReturnToCover?: () => void;
}

export default function ViewerNavSidebar({
  isOpen,
  onClose,
  activeTab,
  onTabChange: _onTabChange,
  docName: _docName,
  docSize: _docSize,
  pdfDoc,
  rotation = 0,
  totalPages,
  currentPage,
  onPageSelect,
  outline,
  onNavigateToDest,
  bookmarks,
  onAddBookmark,
  onRemoveBookmark,
  annotations,
  onSelectAnnotation,
  onDeleteAnnotation,
  attachments,
  onDownloadAttachment,
  searchQuery,
  inDocMatches,
  multiDocResults,
  isMultiDocSearch,
  onSelectMatch,
  onBackToTools: _onBackToTools,
  onOpenDocument: _onOpenDocument,
  onOpenOrganizer,
  darkMode,
  onToggleDarkMode,
  onReturnToCover,
}: ViewerNavSidebarProps) {
  // New bookmark state
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [newBookmarkColor, setNewBookmarkColor] = useState('#e63946');
  const [showAddBookmarkForm, setShowAddBookmarkForm] = useState(false);

  // Thumbnail columns view mode (1 column vs 2 columns - default 1 column per row)
  const [thumbnailColumns, setThumbnailColumns] = useState<'1' | '2'>('1');

  // Outline expansion toggle state
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) next.delete(nodeKey);
      else next.add(nodeKey);
      return next;
    });
  };

  const handleCreateBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookmarkTitle.trim()) return;
    onAddBookmark(currentPage, newBookmarkTitle.trim(), newBookmarkColor);
    setNewBookmarkTitle('');
    setShowAddBookmarkForm(false);
  };

  if (!isOpen) return null;

  // Recursive Tree Node Renderer
  const renderOutlineNode = (node: PDFOutlineNode, path: string = '0') => {
    const hasChildren = node.items && node.items.length > 0;
    const isExpanded = expandedNodes.has(path);

    return (
      <div key={path} className="flex flex-col">
        <div 
          onClick={() => onNavigateToDest(node.dest, node.pageNumber)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-surface dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer group transition-colors"
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(path);
              }}
              className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="w-4" />
          )}

          <span className="truncate flex-1 font-medium group-hover:text-accent transition-colors">
            {node.title}
          </span>

          {node.pageNumber && (
            <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
              p. {node.pageNumber}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="pl-3.5 flex flex-col border-l border-border/50 ml-2">
            {node.items!.map((child, idx) => renderOutlineNode(child, `${path}-${idx}`))}
          </div>
        )}
      </div>
    );
  };

  // Resizable sidebar width state (persisted in localStorage)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('pdflow_sidebar_width');
    return saved ? Math.max(200, Math.min(650, parseInt(saved, 10))) : 280;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(650, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem('pdflow_sidebar_width', sidebarWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, sidebarWidth]);

  return (
    <aside 
      style={{ width: `${sidebarWidth}px` }}
      className="h-full flex flex-col justify-between border-r border-border bg-surface/80 dark:bg-surface/50 flex-shrink-0 z-30 select-none relative group/sidebar"
    >
      {/* Interactive Drag Handle to Expand / Resize Sidebar */}
      <div
        onMouseDown={startResizing}
        onDoubleClick={() => setSidebarWidth(280)}
        title="Drag to resize sidebar • Double-click to reset"
        className={`absolute top-0 -right-1.5 w-3 h-full cursor-col-resize z-40 transition-colors flex items-center justify-center select-none ${
          isResizing ? 'bg-blue-500/30' : 'hover:bg-blue-500/20'
        }`}
      >
        <div className={`w-[2px] h-10 rounded-full transition-colors ${
          isResizing ? 'bg-blue-600 dark:bg-blue-400' : 'bg-transparent group-hover/sidebar:bg-zinc-400/50'
        }`} />
      </div>
      
      {/* 1. Sleek Fixed Header Bar */}
      <div className="px-3.5 py-2.5 border-b border-border/70 flex items-center justify-between bg-card/40 dark:bg-card/20 flex-shrink-0">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Pages <span className="text-zinc-400 font-mono text-[11px] font-normal">({totalPages})</span>
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-card/90 dark:bg-zinc-800/80 border border-border/80 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={() => setThumbnailColumns('1')}
              title="Single Column View (1 per row)"
              className={`p-1 rounded-md transition-colors ${thumbnailColumns === '1' ? 'bg-surface text-accent font-bold shadow-2xs' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              <Columns className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setThumbnailColumns('2')}
              title="2-Column Grid View"
              className={`p-1 rounded-md transition-colors ${thumbnailColumns === '2' ? 'bg-surface text-accent font-bold shadow-2xs' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Hide Sidebar Button */}
          {onClose && (
            <button
              onClick={onClose}
              title="Hide Sidebar (Ctrl+B)"
              className="p-1 rounded-md border border-border/70 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-card transition-colors shadow-2xs cursor-pointer"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Scrollable Thumbnails Content Area */}
      <div className="flex-1 overflow-y-auto p-3 overscroll-contain">
        
        {/* TAB 1: THUMBNAILS (PAGES) */}
        {activeTab === 'thumbnails' && (
          <div className={`grid gap-3.5 ${thumbnailColumns === '2' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <ThumbnailCard
                key={pageNum}
                pageNum={pageNum}
                isCurrent={pageNum === currentPage}
                pdfDoc={pdfDoc}
                rotation={rotation}
                columns={thumbnailColumns}
                sidebarWidth={sidebarWidth}
                onSelect={onPageSelect}
              />
            ))}
          </div>
        )}

        {/* TAB 2: DOCUMENT OUTLINE (TOC) */}
        {activeTab === 'outline' && (
          <div className="flex flex-col gap-1">
            {outline.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <ListTree className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No Document Outline</p>
                <p className="text-[11px] text-zinc-400 mt-1">This PDF does not contain an embedded table of contents.</p>
              </div>
            ) : (
              outline.map((node, idx) => renderOutlineNode(node, `${idx}`))
            )}
          </div>
        )}

        {/* TAB 3: ANNOTATIONS & THREADED COMMENTS */}
        {activeTab === 'annotations' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
              <span>{annotations.length} Annotations</span>
            </div>

            {annotations.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <MessageSquare className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No Annotations Yet</p>
                <p className="text-[11px] text-zinc-400 mt-1">Use the bottom toolbar to add markups, sticky notes, voice memos, or drawing shapes.</p>
              </div>
            ) : (
              annotations.map((ann) => (
                <div
                  key={ann.id}
                  onClick={() => onSelectAnnotation(ann)}
                  className="p-2.5 rounded-xl bg-card border border-border hover:border-accent cursor-pointer group shadow-xs transition-all flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
                      {ann.type === 'sticky-note' ? <Bookmark className="h-3.5 w-3.5 text-amber-500" /> :
                       ann.type === 'voice-note' ? <Mic className="h-3.5 w-3.5 text-rose-500" /> :
                       ann.type === 'highlight' ? <Highlighter className="h-3.5 w-3.5 text-amber-400" /> :
                       ann.type === 'pen' ? <PenTool className="h-3.5 w-3.5 text-accent" /> :
                       <Square className="h-3.5 w-3.5 text-zinc-400" />}
                      <span className="capitalize">{ann.type.replace('-', ' ')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-accent font-bold">p.{ann.pageNum}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAnnotation(ann.id);
                        }}
                        className="text-zinc-400 hover:text-rose-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {ann.text && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
                      {ann.text}
                    </p>
                  )}

                  {ann.measurementValue && (
                    <span className="text-[10px] font-mono text-zinc-400">
                      Measurement: {ann.measurementValue}
                    </span>
                  )}

                  {(ann.comments || []).length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 mt-0.5">
                      <MessageSquare className="h-2.5 w-2.5" />
                      <span>{ann.comments!.length} {ann.comments!.length === 1 ? 'reply' : 'replies'}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: BOOKMARKS */}
        {activeTab === 'bookmarks' && (
          <div className="flex flex-col gap-3">
            
            {/* Add Bookmark Action */}
            {!showAddBookmarkForm ? (
              <button
                onClick={() => {
                  setNewBookmarkTitle(`Bookmark on Page ${currentPage}`);
                  setShowAddBookmarkForm(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-card border border-border hover:border-accent text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-all shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 text-accent" />
                <span>Bookmark Page {currentPage}</span>
              </button>
            ) : (
              <form onSubmit={handleCreateBookmark} className="flex flex-col gap-2 p-2.5 rounded-lg bg-card border border-border shadow-sm animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <span>Add Bookmark (Page {currentPage})</span>
                  <button 
                    type="button" 
                    onClick={() => setShowAddBookmarkForm(false)}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <input
                  type="text"
                  value={newBookmarkTitle}
                  onChange={(e) => setNewBookmarkTitle(e.target.value)}
                  placeholder="Bookmark title..."
                  autoFocus
                  className="h-7 px-2 text-xs rounded border border-border bg-surface text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent"
                />

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#8338ec'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewBookmarkColor(c)}
                        style={{ backgroundColor: c }}
                        className={`h-4 w-4 rounded-full transition-transform ${newBookmarkColor === c ? 'scale-125 ring-2 ring-zinc-900 dark:ring-zinc-100' : 'opacity-70 hover:opacity-100'}`}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* Bookmark List */}
            {bookmarks.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Bookmark className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No Custom Bookmarks</p>
                <p className="text-[11px] text-zinc-400 mt-1">Bookmark important pages for fast retrieval.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    onClick={() => onPageSelect(bm.pageNumber)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer group shadow-xs transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: bm.color }} />
                      <div className="min-w-0">
                        <h5 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-accent transition-colors">
                          {bm.title}
                        </h5>
                        <p className="text-[10px] font-mono text-zinc-400">Page {bm.pageNumber}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveBookmark(bm.id);
                      }}
                      title="Delete Bookmark"
                      className="p-1 rounded hover:bg-rose-500/10 hover:text-rose-500 text-zinc-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 5: ATTACHMENTS */}
        {activeTab === 'attachments' && (
          <div className="flex flex-col gap-2">
            {attachments.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Paperclip className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No Embedded Files</p>
                <p className="text-[11px] text-zinc-400 mt-1">This PDF does not contain embedded file attachments.</p>
              </div>
            ) : (
              attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border hover:border-zinc-400 dark:hover:border-zinc-600 shadow-xs transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Paperclip className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <h5 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {att.filename}
                      </h5>
                      {att.size && (
                        <p className="text-[10px] font-mono text-zinc-400">{att.size}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onDownloadAttachment(att)}
                    title="Download Attachment"
                    className="p-1.5 rounded-lg bg-surface hover:bg-accent hover:text-white text-zinc-600 dark:text-zinc-300 transition-colors shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 6: SEARCH RESULTS */}
        {activeTab === 'search' && (
          <div className="flex flex-col gap-3">
            {!searchQuery.trim() ? (
              <div className="py-12 px-4 text-center">
                <Search className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Search In Document</p>
                <p className="text-[11px] text-zinc-400 mt-1">Press ⌘F / Ctrl+F or use the search bar to find words, phrases, or regex patterns.</p>
              </div>
            ) : isMultiDocSearch ? (
              /* Multi-Document Results */
              <div className="flex flex-col gap-3">
                <div className="text-xs font-mono font-semibold text-zinc-500">
                  <span>Results across {multiDocResults.length} files:</span>
                </div>

                {multiDocResults.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-6">No matching files found.</p>
                ) : (
                  multiDocResults.map((docResult) => (
                    <div key={docResult.docId} className="flex flex-col gap-1.5 p-2 rounded-lg bg-card border border-border">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                        <FileText className="h-3.5 w-3.5 text-accent" />
                        <span className="truncate">{docResult.docName}</span>
                        <span className="ml-auto text-[10px] font-mono text-zinc-400">({docResult.matches.length})</span>
                      </div>

                      <div className="flex flex-col gap-1 pl-2 border-l border-border/60">
                        {docResult.matches.map((m, mIdx) => (
                          <div
                            key={mIdx}
                            onClick={() => onSelectMatch(m.pageNum, m.matchIndex, docResult.docId)}
                            className="p-1.5 rounded hover:bg-surface dark:hover:bg-zinc-800 text-[11px] cursor-pointer group transition-colors"
                          >
                            <span className="font-mono text-accent font-bold mr-1">p.{m.pageNum}:</span>
                            <span className="text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">{m.textSnippet}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Single Document Results */
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-500 mb-1">
                  <span>{inDocMatches.length} Matches found</span>
                </div>

                {inDocMatches.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-6">No matches found in document.</p>
                ) : (
                  inDocMatches.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => onSelectMatch(m.pageNum, m.matchIndex)}
                      className="p-2 rounded-lg bg-card border border-border hover:border-accent cursor-pointer group shadow-xs transition-all"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-0.5">
                        <span className="font-semibold text-accent">Page {m.pageNum}</span>
                        <span>Match #{idx + 1}</span>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                        {m.textSnippet}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 3. Sidebar Footer Actions */}
      <div className="p-3 border-t border-border flex flex-col gap-2 flex-shrink-0 bg-surface/40">
        {onOpenOrganizer && (
          <button
            onClick={onOpenOrganizer}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border hover:border-accent text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-all shadow-xs group"
          >
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" />
              <span>Page Organizer</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400 group-hover:text-accent transition-colors">
              Reorder
            </span>
          </button>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-card border border-border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
            >
              {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-zinc-600" />}
              <span>{darkMode ? 'Light' : 'Dark'}</span>
            </button>
          )}

          {onReturnToCover && (
            <button
              onClick={onReturnToCover}
              className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors px-2 py-1 rounded hover:bg-card"
              title="Return to Presentation Cover"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Cover</span>
            </button>
          )}
        </div>
      </div>

    </aside>
  );
}
