import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Stamp, 
  FolderOpen, 
  Download, 
  ArrowRight
} from 'lucide-react';
import { LoadedPDF } from '../../types';
import EmptyState from '../EmptyState';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface WatermarkToolProps {
  initialDoc: LoadedPDF | null;
  onOpenWatermarkedDoc: (doc: LoadedPDF) => void;
}

export default function WatermarkTool({ initialDoc, onOpenWatermarkedDoc }: WatermarkToolProps) {
  const [doc, setDoc] = useState<LoadedPDF | null>(initialDoc);
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [opacity, setOpacity] = useState<number>(0.25);
  const [rotationAngle, setRotationAngle] = useState<number>(-45);
  const [fontSize, setFontSize] = useState<number>(50);
  const [colorHex, setColorHex] = useState<string>('#e11d48'); // rose-600
  const [applying, setApplying] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState<boolean>(false);
  const [pageScale, setPageScale] = useState<number>(1.0);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const watermarkCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const blobUrl = URL.createObjectURL(file);
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

  // 1. Render Base PDF Page 1 ONCE when document is loaded
  useEffect(() => {
    if (!doc || !baseCanvasRef.current) return;
    let isCancelled = false;
    setPageLoading(true);

    const renderBasePage = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(doc.blobUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const pixelRatio = window.devicePixelRatio || 1;
        const targetWidth = 360 * pixelRatio;
        const baseVp = page.getViewport({ scale: 1.0 });
        const calculatedScale = targetWidth / baseVp.width;
        const viewport = page.getViewport({ scale: calculatedScale });

        const baseCanvas = baseCanvasRef.current;
        if (!baseCanvas || isCancelled) return;

        baseCanvas.width = viewport.width;
        baseCanvas.height = viewport.height;

        const ctx = baseCanvas.getContext('2d');
        if (!ctx) return;

        // Clean opaque white backing
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        await page.render({ canvasContext: ctx, viewport, canvas: baseCanvas }).promise;

        if (!isCancelled) {
          setPageScale(calculatedScale);
          setCanvasSize({ width: viewport.width, height: viewport.height });
          setPageLoading(false);
        }
      } catch (err) {
        console.error('Error rendering base PDF page preview:', err);
        if (!isCancelled) setPageLoading(false);
      }
    };

    renderBasePage();
    return () => {
      isCancelled = true;
    };
  }, [doc]);

  // 2. Instant Real-Time Watermark Drawing (Zero PDF re-render latency)
  const drawWatermark = useCallback(() => {
    const canvas = watermarkCanvasRef.current;
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return;

    if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!watermarkText.trim()) return;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotationAngle * Math.PI) / 180);
    ctx.font = `bold ${(fontSize * pageScale * 0.9)}px sans-serif`;
    ctx.fillStyle = colorHex;
    ctx.globalAlpha = opacity;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(watermarkText, 0, 0);
    ctx.restore();
  }, [canvasSize, watermarkText, rotationAngle, fontSize, pageScale, colorHex, opacity]);

  useEffect(() => {
    const animId = requestAnimationFrame(drawWatermark);
    return () => cancelAnimationFrame(animId);
  }, [drawWatermark]);

  // Convert hex color to rgb numbers for pdf-lib
  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return rgb(r || 0, g || 0, b || 0);
  };

  // Apply Watermark to all pages in-memory via pdf-lib
  const handleApplyWatermark = useCallback(async (openDirectly: boolean = false) => {
    if (!doc) return;
    setApplying(true);

    try {
      const arrayBuffer = await doc.file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pages = pdfDoc.getPages();
      const color = hexToRgb(colorHex);

      for (const page of pages) {
        const { width, height } = page.getSize();
        const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);
        const textHeight = helveticaFont.heightAtSize(fontSize);

        // Center calculation
        page.drawText(watermarkText, {
          x: width / 2 - (textWidth / 2) * Math.cos((rotationAngle * Math.PI) / 180),
          y: height / 2 - (textHeight / 2) * Math.sin((rotationAngle * Math.PI) / 180),
          size: fontSize,
          font: helveticaFont,
          color,
          opacity,
          rotate: degrees(rotationAngle),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const outputName = doc.name.replace(/\.pdf$/i, '') + '_Watermarked.pdf';

      const result: LoadedPDF = {
        id: `${Date.now()}-${outputName}`,
        name: outputName,
        size: formatSize(pdfBytes.length),
        rawSize: pdfBytes.length,
        blobUrl,
        file: new File([blob], outputName, { type: 'application/pdf' }),
        loadedAt: new Date(),
      };

      if (openDirectly) {
        onOpenWatermarkedDoc(result);
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = outputName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        onOpenWatermarkedDoc(result);
      }
    } catch (err) {
      console.error('Error applying watermark:', err);
      alert('Failed to apply watermark.');
    } finally {
      setApplying(false);
    }
  }, [doc, watermarkText, fontSize, colorHex, opacity, rotationAngle, onOpenWatermarkedDoc]);

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
      <div className="h-12 border-b border-border bg-surface/95 dark:bg-surface/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs">
            <Stamp className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Watermark Document</h2>
            <p className="text-[10px] font-mono text-zinc-400">
              Apply custom diagonal or centered security watermarks across all pages
            </p>
          </div>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface dark:bg-card border border-border hover:bg-card text-xs font-semibold transition-colors shadow-sm"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span>{doc ? 'Change File' : 'Select PDF'}</span>
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 overflow-auto p-6 sm:p-8 flex flex-col items-center">
        {!doc ? (
          <EmptyState
            icon={Stamp}
            title="Select a PDF to Watermark"
            description="Add text watermarks with customizable opacity, rotation, and colors."
            actionLabel="Browse PDF"
            onAction={() => fileInputRef.current?.click()}
          />
        ) : (
          <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Watermark Controls */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              {/* Text Input */}
              <div className="p-4 rounded-xl bg-card border border-border flex flex-col gap-2.5 shadow-sm">
                <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="e.g. CONFIDENTIAL"
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
                />

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['CONFIDENTIAL', 'DRAFT', 'COPY', 'SAMPLE', 'DO NOT COPY', 'INTERNAL USE'].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setWatermarkText(chip)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-surface border border-border hover:border-accent text-zinc-600 dark:text-zinc-300 transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders Configuration */}
              <div className="p-4 rounded-xl bg-card border border-border flex flex-col gap-4 shadow-sm">
                
                {/* Opacity Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    <span>Opacity</span>
                    <span className="font-mono text-zinc-400 tabular-nums">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="95"
                    step="1"
                    value={Math.round(opacity * 100)}
                    onChange={(e) => setOpacity(parseInt(e.target.value, 10) / 100)}
                    aria-label="Watermark Opacity"
                    className="w-full h-2 bg-zinc-200 dark:bg-zinc-700/80 rounded-full appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                  />
                </div>

                {/* Angle Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    <span>Rotation Angle</span>
                    <span className="font-mono text-zinc-400 tabular-nums">{rotationAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="1"
                    value={rotationAngle}
                    onChange={(e) => setRotationAngle(parseInt(e.target.value, 10))}
                    aria-label="Watermark Rotation Angle"
                    className="w-full h-2 bg-zinc-200 dark:bg-zinc-700/80 rounded-full appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                  />
                </div>

                {/* Font Size Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    <span>Font Size</span>
                    <span className="font-mono text-zinc-400 tabular-nums">{fontSize} pt</span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="120"
                    step="1"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    aria-label="Watermark Font Size"
                    className="w-full h-2 bg-zinc-200 dark:bg-zinc-700/80 rounded-full appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                  />
                </div>

                {/* Color Palette */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Stamp Color</span>
                  <div className="flex items-center gap-2">
                    {[
                      { name: 'Rose Red', hex: '#e11d48' },
                      { name: 'Charcoal', hex: '#3f3f46' },
                      { name: 'Navy Blue', hex: '#2563eb' },
                      { name: 'Emerald', hex: '#059669' },
                      { name: 'Amber', hex: '#d97706' },
                    ].map((col) => (
                      <button
                        key={col.hex}
                        onClick={() => setColorHex(col.hex)}
                        title={col.name}
                        style={{ backgroundColor: col.hex }}
                        className={`h-6 w-6 rounded-full transition-transform ${
                          colorHex === col.hex ? 'ring-2 ring-accent ring-offset-2 scale-110' : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => handleApplyWatermark(false)}
                  disabled={applying}
                  className="flex-1 py-2.5 rounded-xl border border-border hover:bg-surface text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => handleApplyWatermark(true)}
                  disabled={applying}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-40"
                >
                  {applying ? (
                    <>
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      <span>Stamping...</span>
                    </>
                  ) : (
                    <>
                      <span>Apply & Open</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Right Column: Live Preview Box */}
            <div className="lg:col-span-5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-zinc-100">
                <span>Page 1 Live Preview</span>
                <span className="text-[10px] font-mono text-zinc-400">Real-Time Overlay</span>
              </div>

              <div className="w-full aspect-[1/1.3] rounded-2xl bg-zinc-100 dark:bg-zinc-950/60 border border-border shadow-inner p-4 flex items-center justify-center overflow-hidden relative">
                {pageLoading && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs">
                    <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    <span className="text-xs font-medium text-zinc-500">Loading Preview…</span>
                  </div>
                )}

                <div 
                  className="relative max-w-full max-h-full rounded-sm overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800 bg-white"
                  style={{
                    width: canvasSize.width ? `${canvasSize.width / (window.devicePixelRatio || 1)}px` : undefined,
                    height: canvasSize.height ? `${canvasSize.height / (window.devicePixelRatio || 1)}px` : undefined,
                  }}
                >
                  {/* Layer 1: Base PDF Page */}
                  <canvas 
                    ref={baseCanvasRef} 
                    className="w-full h-full block object-contain" 
                    style={{ imageRendering: '-webkit-optimize-contrast' }}
                  />

                  {/* Layer 2: Live Real-Time Watermark Overlay */}
                  <canvas 
                    ref={watermarkCanvasRef} 
                    className="absolute inset-0 w-full h-full pointer-events-none" 
                  />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
