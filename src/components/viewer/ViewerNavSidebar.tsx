import React, { useState } from 'react';
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
  Square
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

interface ViewerNavSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavSidebarTab;
  onTabChange: (tab: NavSidebarTab) => void;
  
  // Thumbnails Data
  totalPages: number;
  currentPage: number;
  onPageSelect: (pageNum: number) => void;
  thumbnailUrls?: Map<number, string>;

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
}

export default function ViewerNavSidebar({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  totalPages,
  currentPage,
  onPageSelect,
  thumbnailUrls,
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
}: ViewerNavSidebarProps) {
  // New bookmark state
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [newBookmarkColor, setNewBookmarkColor] = useState('#e63946');
  const [showAddBookmarkForm, setShowAddBookmarkForm] = useState(false);

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

  const navTabs: { id: NavSidebarTab; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { id: 'thumbnails', label: 'Thumbnails', icon: Grid, count: totalPages },
    { id: 'outline', label: 'Outline', icon: ListTree, count: outline.length },
    { id: 'annotations', label: 'Comments', icon: MessageSquare, count: annotations.length },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, count: bookmarks.length },
    { id: 'attachments', label: 'Files', icon: Paperclip, count: attachments.length },
    { id: 'search', label: 'Search', icon: Search, count: isMultiDocSearch ? multiDocResults.reduce((acc, r) => acc + r.matches.length, 0) : inDocMatches.length },
  ];

  return (
    <aside className="w-72 h-full flex flex-col border-r border-border bg-surface/70 dark:bg-surface/50 backdrop-blur-md flex-shrink-0 z-30 select-none">
      
      {/* 1. Header with Tab Switches & Close */}
      <div className="p-2.5 border-b border-border flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                title={tab.label}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                  isActive 
                    ? 'bg-card text-zinc-900 dark:text-zinc-100 border border-border shadow-xs font-semibold' 
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-card/40'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className="text-[10px] font-mono opacity-70">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          title="Close Navigation Drawer"
          className="h-7 w-7 rounded-lg hover:bg-card dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex-shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 2. Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-3 overscroll-contain">
        
        {/* TAB 1: THUMBNAILS */}
        {activeTab === 'thumbnails' && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const isCurrent = pageNum === currentPage;
              const thumbUrl = thumbnailUrls?.get(pageNum);

              return (
                <div
                  key={pageNum}
                  onClick={() => onPageSelect(pageNum)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer group ${
                    isCurrent 
                      ? 'border-accent bg-accent/5 ring-1 ring-accent' 
                      : 'border-border bg-card hover:border-zinc-400 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="w-full aspect-[1/1.3] bg-surface rounded-md border border-border flex items-center justify-center overflow-hidden relative shadow-xs">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={`Page ${pageNum}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-zinc-400">
                        <FileText className="h-5 w-5" />
                        <span className="text-[10px] font-mono">Page {pageNum}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[11px] font-mono font-medium ${isCurrent ? 'text-accent font-bold' : 'text-zinc-500'}`}>
                    {pageNum}
                  </span>
                </div>
              );
            })}
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

    </aside>
  );
}
