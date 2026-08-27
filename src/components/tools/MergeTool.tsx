import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Combine, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  FileText, 
  Download, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { LoadedPDF } from '../../types';
import EmptyState from '../EmptyState';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface MergeItem {
  id: string;
  file: File;
  name: string;
  size: string;
  rawSize: number;
  pages: number;
}

interface MergeToolProps {
  initialDoc: LoadedPDF | null;
  onOpenMergedDoc: (doc: LoadedPDF) => void;
}

export default function MergeTool({ initialDoc, onOpenMergedDoc }: MergeToolProps) {
  const [items, setItems] = useState<MergeItem[]>([]);
  const [merging, setMerging] = useState<boolean>(false);
  const [outputName, setOutputName] = useState<string>('Merged_Document.pdf');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Add initialDoc to merge list if provided on first load
  useEffect(() => {
    if (initialDoc && items.length === 0) {
      const getInitialPageCount = async () => {
        try {
          const loadingTask = pdfjsLib.getDocument(initialDoc.blobUrl);
          const pdf = await loadingTask.promise;
          setItems([
            {
              id: `${Date.now()}-${initialDoc.name}`,
              file: initialDoc.file,
              name: initialDoc.name,
              size: initialDoc.size,
              rawSize: initialDoc.rawSize,
              pages: pdf.numPages,
            },
          ]);
        } catch {
          setItems([
            {
              id: `${Date.now()}-${initialDoc.name}`,
              file: initialDoc.file,
              name: initialDoc.name,
              size: initialDoc.size,
              rawSize: initialDoc.rawSize,
              pages: 1,
            },
          ]);
        }
      };
      getInitialPageCount();
    }
  }, [initialDoc]);

  // Process incoming files
  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const newItems: MergeItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) continue;

      let pageCount = 1;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pageCount = pdf.numPages;
      } catch {
        pageCount = 1;
      }

      newItems.push({
        id: `${Date.now()}-${file.name}-${Math.random()}`,
        file,
        name: file.name,
        size: formatSize(file.size),
        rawSize: file.size,
        pages: pageCount,
      });
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleMove = useCallback((index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    setItems((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  }, [items.length]);

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const totalPages = items.reduce((acc, curr) => acc + curr.pages, 0);
  const totalSize = items.reduce((acc, curr) => acc + curr.rawSize, 0);

  // Execute Merge via pdf-lib
  const handleExecuteMerge = useCallback(async (openDirectly: boolean = false) => {
    if (items.length < 2) {
      alert('Please add at least 2 PDF documents to merge.');
      return;
    }

    setMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of items) {
        const arrayBuffer = await item.file.arrayBuffer();
        const srcDoc = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const cleanName = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;

      const newDoc: LoadedPDF = {
        id: `${Date.now()}-${cleanName}`,
        name: cleanName,
        size: formatSize(pdfBytes.length),
        rawSize: pdfBytes.length,
        blobUrl,
        file: new File([blob], cleanName, { type: 'application/pdf' }),
        loadedAt: new Date(),
      };

      if (openDirectly) {
        onOpenMergedDoc(newDoc);
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = cleanName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        onOpenMergedDoc(newDoc);
      }
    } catch (err) {
      console.error('Error merging PDFs:', err);
      alert('Failed to merge PDFs. Please ensure valid PDF files.');
    } finally {
      setMerging(false);
    }
  }, [items, outputName, onOpenMergedDoc]);

  return (
    <div className="w-full h-full flex flex-col bg-background text-zinc-800 dark:text-zinc-200 overflow-hidden">
      
      {/* Hidden File Picker for multiple files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Toolbar */}
      <div className="h-14 border-b border-border bg-surface/95 dark:bg-surface/95 backdrop-blur-md px-6 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-sm">
            <Combine className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Merge PDF Files</h2>
            <p className="text-[10px] font-mono text-zinc-400">
              Combine multiple documents in custom sequence • In-Memory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface dark:bg-card border border-border hover:bg-card text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Files</span>
          </button>

          <button
            onClick={() => handleExecuteMerge(true)}
            disabled={items.length < 2 || merging}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-40"
          >
            {merging ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span>Merging...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Merge & View</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace Canvas */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="flex-1 overflow-auto p-6 sm:p-8 flex flex-col items-center"
      >
        <div className="max-w-3xl w-full flex flex-col gap-6">
          
          {/* Dropzone prompt when empty */}
          {items.length === 0 ? (
            <EmptyState
              icon={Combine}
              title="Select or Drop PDF Files to Merge"
              description="Add 2 or more PDF documents. You can reorder them before merging into a single file."
              actionLabel="Browse Files"
              onAction={() => fileInputRef.current?.click()}
            />
          ) : (
            <>
              {/* Queue List */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Files to Merge ({items.length})
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-border text-zinc-500">
                    {totalPages} Total Pages • {formatSize(totalSize)}
                  </span>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add more files
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-sm group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-6 w-6 rounded-md bg-surface font-mono text-[11px] font-bold text-zinc-500 flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="h-9 w-9 rounded-lg bg-surface flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold text-xs flex-shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.name}
                        </h4>
                        <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                          {item.pages} Pages • {item.size}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Reorder Buttons */}
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        title="Move Up"
                        className="h-7 w-7 rounded-lg hover:bg-surface text-zinc-500 disabled:opacity-20 transition-colors flex items-center justify-center"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === items.length - 1}
                        title="Move Down"
                        className="h-7 w-7 rounded-lg hover:bg-surface text-zinc-500 disabled:opacity-20 transition-colors flex items-center justify-center"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>

                      <div className="w-[1px] h-4 bg-border mx-1" />

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemove(item.id)}
                        title="Remove file"
                        className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 transition-colors flex items-center justify-center"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Output Configuration Card */}
              <div className="p-4 rounded-xl bg-card border border-border flex flex-col gap-3 shadow-sm mt-2">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Merged Output Filename
                </label>
                <input
                  type="text"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                  placeholder="Merged_Document.pdf"
                />

                <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
                  <span className="text-[11px] font-mono text-zinc-500">
                    Combined: {totalPages} pages from {items.length} files
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExecuteMerge(false)}
                      disabled={items.length < 2 || merging}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-surface text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors shadow-sm disabled:opacity-40"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PDF</span>
                    </button>

                    <button
                      onClick={() => handleExecuteMerge(true)}
                      disabled={items.length < 2 || merging}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-40"
                    >
                      <span>Merge & Open</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

    </div>
  );
}
