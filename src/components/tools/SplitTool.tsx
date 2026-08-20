import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Scissors, 
  Download, 
  Sparkles, 
  FolderOpen, 
  Check, 
  FileText,
  ArrowRight
} from 'lucide-react';
import { LoadedPDF } from '../../types';
import EmptyState from '../EmptyState';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface SplitToolProps {
  initialDoc: LoadedPDF | null;
  onOpenExtractedDoc: (doc: LoadedPDF) => void;
}

export default function SplitTool({ initialDoc, onOpenExtractedDoc }: SplitToolProps) {
  const [doc, setDoc] = useState<LoadedPDF | null>(initialDoc);
  const [numPages, setNumPages] = useState<number>(0);
  const [splitMode, setSplitMode] = useState<'range' | 'selected' | 'burst'>('range');
  const [rangeInput, setRangeInput] = useState<string>('1-2');
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([1]));
  const [processing, setProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load document page count
  useEffect(() => {
    if (!doc) return;
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(doc.blobUrl);
        const pdf = await loadingTask.promise;
        setNumPages(pdf.numPages);
        if (pdf.numPages > 1) {
          setRangeInput(`1-${Math.min(3, pdf.numPages)}`);
        } else {
          setRangeInput('1');
        }
      } catch (err) {
        console.error('Error loading PDF in split tool:', err);
      }
    };
    loadPdf();
  }, [doc]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const blobUrl = URL.createObjectURL(file);
      const formatSize = (bytes: number) =>
        bytes < 1024 * 1024
          ? (bytes / 1024).toFixed(1) + ' KB'
          : (bytes / (1024 * 1024)).toFixed(1) + ' MB';

      setDoc({
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        size: formatSize(file.size),
        rawSize: file.size,
        blobUrl,
        file,
        loadedAt: new Date(),
      });
    }
  };

  // Parse Range String e.g. "1-3, 5, 8-10" into 0-indexed page numbers
  const parsePageRanges = (rangeStr: string, maxPages: number): number[] => {
    const pages = new Set<number>();
    const parts = rangeStr.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const from = Math.max(1, Math.min(start, end));
          const to = Math.min(maxPages, Math.max(start, end));
          for (let p = from; p <= to; p++) {
            pages.add(p - 1);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= maxPages) {
          pages.add(p - 1);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const togglePageSelection = (pageNum: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
  };

  // Execute Split via pdf-lib
  const handleExecuteSplit = useCallback(async (openDirectly: boolean = false) => {
    if (!doc) return;

    let targetIndices: number[] = [];
    if (splitMode === 'range') {
      targetIndices = parsePageRanges(rangeInput, numPages);
    } else if (splitMode === 'selected') {
      targetIndices = Array.from(selectedPages).map((p) => p - 1).sort((a, b) => a - b);
    } else {
      // burst mode - extract all pages individually or first chunk
      targetIndices = Array.from({ length: numPages }, (_, i) => i);
    }

    if (targetIndices.length === 0) {
      alert('Please select at least 1 valid page to extract.');
      return;
    }

    setProcessing(true);
    try {
      const arrayBuffer = await doc.file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const newDoc = await PDFDocument.create();

      const copiedPages = await newDoc.copyPages(srcDoc, targetIndices);
      copiedPages.forEach((page) => newDoc.addPage(page));

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const outputName = doc.name.replace(/\.pdf$/i, '') + '_Extracted.pdf';

      const formatSize = (bytes: number) =>
        bytes < 1024 * 1024
          ? (bytes / 1024).toFixed(1) + ' KB'
          : (bytes / (1024 * 1024)).toFixed(1) + ' MB';

      const resultDoc: LoadedPDF = {
        id: `${Date.now()}-${outputName}`,
        name: outputName,
        size: formatSize(pdfBytes.length),
        rawSize: pdfBytes.length,
        blobUrl,
        file: new File([blob], outputName, { type: 'application/pdf' }),
        loadedAt: new Date(),
      };

      if (openDirectly) {
        onOpenExtractedDoc(resultDoc);
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = outputName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        onOpenExtractedDoc(resultDoc);
      }
    } catch (err) {
      console.error('Error splitting PDF:', err);
      alert('Failed to split PDF. Please check your range values.');
    } finally {
      setProcessing(false);
    }
  }, [doc, splitMode, rangeInput, selectedPages, numPages, onOpenExtractedDoc]);

  return (
    <div className="w-full h-full flex flex-col bg-background text-zinc-800 dark:text-zinc-200 overflow-hidden">
      
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Toolbar */}
      <div className="h-14 border-b border-border bg-surface/70 dark:bg-surface/50 backdrop-blur-md px-6 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-sm">
            <Scissors className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Split & Extract Pages</h2>
            <p className="text-[10px] font-mono text-zinc-400">
              {doc ? `${doc.name} • ${numPages} Pages` : 'Extract custom page ranges into standalone PDFs'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface dark:bg-card border border-border hover:bg-card text-xs font-semibold transition-colors shadow-sm"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>{doc ? 'Change File' : 'Select PDF'}</span>
          </button>

          {doc && (
            <button
              onClick={() => handleExecuteSplit(true)}
              disabled={processing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-40"
            >
              {processing ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Extract & View</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 overflow-auto p-6 sm:p-8 flex flex-col items-center">
        {!doc ? (
          <EmptyState
            icon={Scissors}
            title="Select a PDF to Split or Extract"
            description="Choose specific page ranges or extract individual pages into a separate document."
            actionLabel="Browse PDF"
            onAction={() => fileInputRef.current?.click()}
          />
        ) : (
          <div className="max-w-3xl w-full flex flex-col gap-6">
            
            {/* Split Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface dark:bg-card border border-border">
              <button
                onClick={() => setSplitMode('range')}
                className={`py-2 px-4 rounded-lg text-xs font-semibold transition-all ${
                  splitMode === 'range'
                    ? 'bg-card dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-bold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Custom Range (e.g. 1-3, 5)
              </button>

              <button
                onClick={() => setSplitMode('selected')}
                className={`py-2 px-4 rounded-lg text-xs font-semibold transition-all ${
                  splitMode === 'selected'
                    ? 'bg-card dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-border font-bold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Visual Page Grid Selection
              </button>
            </div>

            {/* Mode 1: Range Input */}
            {splitMode === 'range' && (
              <div className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Enter Page Range
                  </label>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Total: {numPages} Pages in Document
                  </span>
                </div>

                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="e.g. 1-3, 5, 8-10"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                />

                <p className="text-[11px] text-zinc-500 font-mono">
                  Example: <code className="bg-surface px-1.5 py-0.5 rounded">1-4, 7, 9-12</code> will extract pages 1 to 4, page 7, and pages 9 to 12.
                </p>
              </div>
            )}

            {/* Mode 2: Visual Click Selector */}
            {splitMode === 'selected' && (
              <div className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Click Pages to Extract
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {selectedPages.size} of {numPages} pages selected
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPages(new Set(Array.from({ length: numPages }, (_, i) => i + 1)))}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => setSelectedPages(new Set())}
                      className="text-xs font-medium text-zinc-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-72 overflow-y-auto p-1">
                  {Array.from({ length: numPages }, (_, i) => {
                    const pageNum = i + 1;
                    const isSelected = selectedPages.has(pageNum);

                    return (
                      <button
                        key={pageNum}
                        onClick={() => togglePageSelection(pageNum)}
                        className={`aspect-[1/1.3] rounded-xl border flex flex-col items-center justify-center font-mono text-xs font-bold transition-all relative ${
                          isSelected
                            ? 'bg-accent text-white border-accent shadow-md scale-105'
                            : 'bg-surface text-zinc-700 dark:text-zinc-300 border-border hover:border-zinc-400'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-white text-accent flex items-center justify-center">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                        <span>{pageNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                <FileText className="h-4 w-4 text-zinc-400" />
                <span>Output: {doc.name.replace(/\.pdf$/i, '')}_Extracted.pdf</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExecuteSplit(false)}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border hover:bg-surface text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors shadow-sm disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => handleExecuteSplit(true)}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-40"
                >
                  <span>Extract & Open</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
