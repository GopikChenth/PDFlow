import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  Plus, 
  FolderOpen, 
  Home, 
  ChevronLeft, 
  FileText, 
  Trash2, 
  Clock, 
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { NAV_ITEMS, TOOL_ITEMS } from '../constants/mockData';
import { LoadedPDF } from '../types';
import PDFViewer from '../components/PDFViewer';
import PageOrganizer from '../components/PageOrganizer';
import EmptyState from '../components/EmptyState';
import MergeTool from '../components/tools/MergeTool';
import SplitTool from '../components/tools/SplitTool';
import CompressTool from '../components/tools/CompressTool';
import WatermarkTool from '../components/tools/WatermarkTool';
import ProtectTool from '../components/tools/ProtectTool';

interface WorkspacePageProps {
  onReturnToCover: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  controlledActiveTab?: string;
  onActiveTabChange?: (tab: string) => void;
  onActiveDocChange?: (docName: string | null) => void;
}

export default function WorkspacePage({ 
  onReturnToCover, 
  darkMode, 
  onToggleDarkMode,
  controlledActiveTab,
  onActiveTabChange,
  onActiveDocChange,
}: WorkspacePageProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<string>('recent');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = useCallback((tab: string) => {
    setInternalActiveTab(tab);
    if (onActiveTabChange) onActiveTabChange(tab);
  }, [onActiveTabChange]);

  const [openDocs, setOpenDocs] = useState<LoadedPDF[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  const activeDoc = React.useMemo(() => {
    if (!activeDocId && openDocs.length > 0) return openDocs[0];
    return openDocs.find((d) => d.id === activeDocId) || null;
  }, [openDocs, activeDocId]);

  useEffect(() => {
    if (onActiveDocChange) {
      onActiveDocChange(activeDoc ? activeDoc.name : null);
    }
  }, [activeDoc, onActiveDocChange]);

  const [recentDocs, setRecentDocs] = useState<LoadedPDF[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Open Document handler: triggers the system file picker
  const handleTriggerOpenFile = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  // Process chosen File(s)
  const processFiles = useCallback((files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      alert('Please select valid PDF file(s).');
      return;
    }

    const newDocs: LoadedPDF[] = validFiles.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${file.name}`,
      name: file.name,
      size: formatFileSize(file.size),
      rawSize: file.size,
      blobUrl: URL.createObjectURL(file),
      file,
      loadedAt: new Date(),
    }));

    setOpenDocs((prev) => {
      const existingNames = new Set(prev.map((d) => d.name));
      const toAdd = newDocs.filter((d) => !existingNames.has(d.name));
      return [...prev, ...(toAdd.length > 0 ? toAdd : newDocs)];
    });

    setRecentDocs((prev) => [
      ...newDocs,
      ...prev.filter((d) => !newDocs.some((nd) => nd.name === d.name)),
    ]);

    setActiveDocId(newDocs[newDocs.length - 1].id);
    setActiveTab('viewer');
  }, [setActiveTab]);

  // File input change event
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  // Keyboard shortcut: ⌘O / Ctrl+O to open file dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        handleTriggerOpenFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTriggerOpenFile]);

  // Tab switching
  const handleSelectTabDoc = useCallback((doc: LoadedPDF) => {
    setOpenDocs((prev) => {
      if (!prev.some((d) => d.id === doc.id)) {
        return [...prev, doc];
      }
      return prev;
    });
    setActiveDocId(doc.id);
    setActiveTab('viewer');
  }, [setActiveTab]);

  // Tab closing
  const handleCloseTabDoc = useCallback((docId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setOpenDocs((prev) => {
      const targetIndex = prev.findIndex((d) => d.id === docId);
      if (targetIndex === -1) return prev;
      const remaining = prev.filter((d) => d.id !== docId);

      // If active doc was closed, pick adjacent tab
      if (activeDocId === docId) {
        if (remaining.length > 0) {
          const nextIndex = Math.min(targetIndex, remaining.length - 1);
          setActiveDocId(remaining[nextIndex].id);
        } else {
          setActiveDocId(null);
          setActiveTab('recent');
        }
      }
      return remaining;
    });
  }, [activeDocId, setActiveTab]);

  // Open New Tab
  const handleNewTab = useCallback(() => {
    handleTriggerOpenFile();
  }, [handleTriggerOpenFile]);

  // Re-open recent document
  const handleOpenRecentDoc = useCallback((doc: LoadedPDF) => {
    handleSelectTabDoc(doc);
  }, [handleSelectTabDoc]);

  // Remove document from recent list
  const handleRemoveRecentDoc = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentDocs((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) {
        try {
          URL.revokeObjectURL(target.blobUrl);
        } catch {}
      }
      return prev.filter((d) => d.id !== id);
    });

    handleCloseTabDoc(id);
  }, [handleCloseTabDoc]);

  // Close active document in viewer
  const handleCloseViewer = useCallback(() => {
    if (activeDoc) {
      handleCloseTabDoc(activeDoc.id);
    } else {
      setActiveTab('recent');
    }
  }, [activeDoc, handleCloseTabDoc, setActiveTab]);

  // Callback to register and view newly generated/modified tool documents
  const handleRegisterAndOpenDoc = useCallback((generatedDoc: LoadedPDF) => {
    setOpenDocs((prev) => [...prev.filter((d) => d.id !== generatedDoc.id), generatedDoc]);
    setRecentDocs((prev) => [generatedDoc, ...prev.filter((d) => d.id !== generatedDoc.id)]);
    setActiveDocId(generatedDoc.id);
    setActiveTab('viewer');
  }, [setActiveTab]);

  return (
    <div 
      className="flex w-full h-full overflow-hidden bg-background text-zinc-800 dark:text-zinc-200"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden Native File Input with Multiple Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. Left Sidebar Navigation (Hidden when viewing an active document in PDF Viewer so PDF Pages sidebar is primary) */}
      {!(activeTab === 'viewer' && activeDoc) && (
        <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-border bg-surface/95 dark:bg-surface/95 backdrop-blur-md p-4">
          <div className="flex flex-col gap-6">
            
            {/* Brand Header with Home Action */}
            <button 
              onClick={onReturnToCover}
              className="flex items-center gap-3 px-2 text-left hover:opacity-80 transition-opacity group"
              title="Return to Presentation Cover"
            >
              <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 flex items-center justify-center font-extrabold text-sm shadow-md group-hover:bg-accent group-hover:text-white transition-colors">
                P
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">PDF Studio</h1>
                  <ChevronLeft className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                </div>
              </div>
            </button>

            {/* Primary Action Button: Open Document */}
            <button 
              onClick={handleTriggerOpenFile}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-sm group active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Open Document
              </span>
              <span className="text-[10px] font-mono opacity-60 bg-black/20 dark:bg-white/20 px-1.5 py-0.5 rounded">
                ⌘O
              </span>
            </button>

            {/* Workspace Nav Group */}
            <div className="flex flex-col gap-1">
              <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                Workspace
              </span>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const count = item.id === 'recent' ? recentDocs.length : item.id === 'viewer' ? openDocs.length : undefined;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive 
                        ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-semibold' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-card/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" /> {item.label}
                    </span>
                    {typeof count === 'number' && count > 0 && (
                      <span className="text-[10px] font-mono bg-zinc-200/80 dark:bg-surface px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Offline Tools Nav Group */}
            <div className="flex flex-col gap-1">
              <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                Offline Tools
              </span>
              {TOOL_ITEMS.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTab === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTab(tool.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive 
                        ? 'bg-card text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-semibold' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-card/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {tool.label}
                  </button>
                );
              })}
            </div>

          </div>

          {/* Sidebar Footer */}
          <div className="flex flex-col gap-2 pt-3 pb-1 border-t border-border flex-shrink-0">
            <div className="flex items-center justify-between gap-2 px-1">
              <button
                onClick={onToggleDarkMode}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-card border border-border hover:bg-surface dark:hover:bg-surface transition-colors shadow-xs"
              >
                {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-zinc-600" />}
                <span>{darkMode ? 'Light' : 'Dark'}</span>
              </button>

              <button
                onClick={onReturnToCover}
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors px-2 py-1 rounded hover:bg-card"
                title="Return to Presentation Cover"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Cover</span>
              </button>
            </div>
          </div>

        </aside>
      )}

      {/* 2. Main Workspace Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Drag Overlay Indicator */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-accent/10 backdrop-blur-sm border-2 border-dashed border-accent m-4 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
            <div className="h-16 w-16 rounded-2xl bg-accent text-white flex items-center justify-center shadow-lg mb-3 animate-bounce">
              <UploadCloud className="h-8 w-8" />
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Drop PDF file(s) to open as tabs
            </p>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              In-Memory Local Processing • Multi-Tab View
            </p>
          </div>
        )}

        {/* Top App Header Bar (Shown when not in full integrated viewer or organizer mode) */}
        {!((activeTab === 'viewer' || activeTab === 'organizer') && activeDoc) && (
          <header className="h-12 border-b border-border flex items-center justify-between px-6 bg-surface/40 backdrop-blur-md flex-shrink-0 z-20">
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500 min-w-0">
              <button 
                onClick={onReturnToCover}
                className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex-shrink-0"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Cover</span>
              </button>
              <span>/</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex-shrink-0">Workspace</span>
              <span>/</span>
              <span className="capitalize">{activeTab.replace('-', ' ')}</span>
            </div>

            <button
              onClick={handleTriggerOpenFile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Open PDF</span>
            </button>
          </header>
        )}

        {/* Workspace Canvas Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col p-0 m-0">
          
          {/* TAB 1: PDF Viewer */}
          {activeTab === 'viewer' ? (
            activeDoc ? (
              <PDFViewer 
                key={activeDoc.id} 
                doc={activeDoc} 
                allDocs={openDocs}
                onClose={handleCloseViewer} 
                onSelectDoc={handleSelectTabDoc}
                onCloseDoc={handleCloseTabDoc}
                onNewTab={handleNewTab}
                onBackToTools={() => setActiveTab('recent')}
                onOpenDocument={handleTriggerOpenFile}
                onOpenOrganizer={() => setActiveTab('organizer')}
                darkMode={darkMode}
                onToggleDarkMode={onToggleDarkMode}
                onReturnToCover={onReturnToCover}
              />
            ) : (
              <EmptyState
                icon={FolderOpen}
                title="Select a PDF to view"
                description="Click to open file manager or drag and drop one or more PDF documents anywhere into the workspace."
                actionLabel="Browse Local Files"
                onAction={handleTriggerOpenFile}
              />
            )
          ) : activeTab === 'organizer' ? (
            /* TAB 2: Page Organizer */
            activeDoc ? (
              <PageOrganizer
                key={activeDoc.id}
                doc={activeDoc}
                onSaveModifiedDoc={(updatedDoc) => {
                  handleRegisterAndOpenDoc(updatedDoc);
                }}
                onOpenInViewer={() => setActiveTab('viewer')}
              />
            ) : (
              <EmptyState
                icon={Layers}
                title="Select a PDF to organize"
                description="Reorder pages with drag & drop, rotate individual pages, delete unwanted sheets, or extract sections."
                actionLabel="Browse Local Files"
                onAction={handleTriggerOpenFile}
              />
            )
          ) : activeTab === 'recent' ? (
            /* TAB 3: Recent Documents View */
            <div className="flex-1 overflow-auto p-8 flex flex-col">
              {recentDocs.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No documents open"
                  description="Click 'Open Document' or drag and drop a PDF file anywhere into the window to begin viewing."
                  actionLabel="Browse Local Files"
                  onAction={handleTriggerOpenFile}
                />
              ) : (
                <div className="max-w-4xl mx-auto w-full flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        Recent Documents in Session
                      </h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Locally loaded PDF documents stored in-memory.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">
                      {recentDocs.length} {recentDocs.length === 1 ? 'Document' : 'Documents'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {recentDocs.map((doc) => {
                      const isCurrentlyActive = activeDoc?.id === doc.id;

                      return (
                        <div
                          key={doc.id}
                          onClick={() => handleOpenRecentDoc(doc)}
                          className={`flex items-center justify-between p-4 rounded-xl bg-card border transition-all shadow-sm cursor-pointer group ${
                            isCurrentlyActive 
                              ? 'border-accent/60 bg-accent/[0.03]' 
                              : 'border-border hover:border-accent/40'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                              isCurrentlyActive 
                                ? 'bg-accent text-white' 
                                : 'bg-surface text-zinc-700 dark:text-zinc-300 group-hover:bg-accent/10 group-hover:text-accent'
                            }`}>
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-accent transition-colors truncate">
                                  {doc.name}
                                </h4>
                                {isCurrentlyActive && (
                                  <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle2 className="h-3 w-3" /> Active
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                                <span>{doc.size}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {doc.loadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => handleRemoveRecentDoc(doc.id, e)}
                              title="Remove from session"
                              className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 flex items-center justify-center text-zinc-400 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                            <button 
                              onClick={() => handleOpenRecentDoc(doc)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-colors"
                            >
                              <span>{isCurrentlyActive ? 'View' : 'Open'}</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'merge' ? (
            /* TAB 4: Merge Tool */
            <MergeTool initialDoc={activeDoc} onOpenMergedDoc={handleRegisterAndOpenDoc} />
          ) : activeTab === 'split' ? (
            /* TAB 5: Split & Extract Tool */
            <SplitTool initialDoc={activeDoc} onOpenExtractedDoc={handleRegisterAndOpenDoc} />
          ) : activeTab === 'compress' ? (
            /* TAB 6: Compress Tool */
            <CompressTool initialDoc={activeDoc} onOpenCompressedDoc={handleRegisterAndOpenDoc} />
          ) : activeTab === 'watermark' ? (
            /* TAB 7: Watermark Tool */
            <WatermarkTool initialDoc={activeDoc} onOpenWatermarkedDoc={handleRegisterAndOpenDoc} />
          ) : activeTab === 'protect' ? (
            /* TAB 8: Protect & Unlock Tool */
            <ProtectTool initialDoc={activeDoc} onOpenProtectedDoc={handleRegisterAndOpenDoc} />
          ) : null}

        </div>

      </main>

    </div>
  );
}
