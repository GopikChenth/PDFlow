import { useState } from 'react';
import { 
  BookOpen, 
  Minus, 
  Plus, 
  X, 
  Copy, 
  Check,
  ArrowRight
} from 'lucide-react';
import { ReflowSettings } from '../../types';

interface PageTextData {
  pageNum: number;
  text: string;
}

interface TextReflowViewProps {
  isOpen: boolean;
  onClose: () => void;
  pagesText: PageTextData[];
  docTitle: string;
  currentPage: number;
  onNavigateToPage: (pageNum: number) => void;
}

export default function TextReflowView({
  isOpen,
  onClose,
  pagesText,
  docTitle,
  currentPage,
  onNavigateToPage,
}: TextReflowViewProps) {
  const [settings, setSettings] = useState<ReflowSettings>({
    fontSize: 16,
    lineHeight: 1.8,
    fontFamily: 'serif',
    maxWidth: 760,
  });

  const [copiedPage, setCopiedPage] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopyText = (text: string, pageNum: number) => {
    navigator.clipboard.writeText(text);
    setCopiedPage(pageNum);
    setTimeout(() => setCopiedPage(null), 2000);
  };

  const getFontFamilyClass = (family: 'sans' | 'serif' | 'mono') => {
    switch (family) {
      case 'serif':
        return 'font-serif';
      case 'mono':
        return 'font-mono';
      case 'sans':
      default:
        return 'font-sans';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in duration-200 text-zinc-900 dark:text-zinc-100">
      
      {/* 1. Header with Reader Controls */}
      <header className="h-14 border-b border-border px-6 flex items-center justify-between gap-4 bg-surface dark:bg-surface flex-shrink-0">
        
        {/* Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs flex-shrink-0">
            <BookOpen className="h-4 w-4 text-accent" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{docTitle}</h3>
            <p className="text-[10px] font-mono text-zinc-400">Text-Reflow Responsive Reader Mode (Page {currentPage})</p>
          </div>
        </div>

        {/* Reader Typography Controls */}
        <div className="flex items-center gap-3">
          
          {/* Font Size */}
          <div className="flex items-center gap-1 bg-surface dark:bg-card border border-border rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setSettings((s) => ({ ...s, fontSize: Math.max(12, s.fontSize - 2) }))}
              title="Decrease Font Size"
              className="h-7 w-7 rounded flex items-center justify-center hover:bg-surface dark:hover:bg-surface transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-semibold">{settings.fontSize}px</span>
            <button
              onClick={() => setSettings((s) => ({ ...s, fontSize: Math.min(28, s.fontSize + 2) }))}
              title="Increase Font Size"
              className="h-7 w-7 rounded flex items-center justify-center hover:bg-surface dark:hover:bg-surface transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Font Family Switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-surface dark:bg-card border border-border rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setSettings((s) => ({ ...s, fontFamily: 'serif' }))}
              className={`px-2 py-1 rounded text-xs transition-colors ${settings.fontFamily === 'serif' ? 'bg-card font-bold shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
            >
              Serif
            </button>
            <button
              onClick={() => setSettings((s) => ({ ...s, fontFamily: 'sans' }))}
              className={`px-2 py-1 rounded text-xs transition-colors ${settings.fontFamily === 'sans' ? 'bg-card font-bold shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
            >
              Sans
            </button>
            <button
              onClick={() => setSettings((s) => ({ ...s, fontFamily: 'mono' }))}
              className={`px-2 py-1 rounded text-xs transition-colors ${settings.fontFamily === 'mono' ? 'bg-card font-bold shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
            >
              Mono
            </button>
          </div>

          {/* Column Width */}
          <div className="hidden md:flex items-center gap-1 bg-surface dark:bg-card border border-border rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setSettings((s) => ({ ...s, maxWidth: 640 }))}
              title="Narrow Column"
              className={`px-2 py-1 rounded text-xs transition-colors ${settings.maxWidth === 640 ? 'bg-card font-bold shadow-xs' : 'text-zinc-500'}`}
            >
              Narrow
            </button>
            <button
              onClick={() => setSettings((s) => ({ ...s, maxWidth: 760 }))}
              title="Standard Column"
              className={`px-2 py-1 rounded text-xs transition-colors ${settings.maxWidth === 760 ? 'bg-card font-bold shadow-xs' : 'text-zinc-500'}`}
            >
              Standard
            </button>
            <button
              onClick={() => setSettings((s) => ({ ...s, maxWidth: 960 }))}
              title="Wide Column"
              className={`px-2 py-1 rounded text-xs transition-colors ${settings.maxWidth === 960 ? 'bg-card font-bold shadow-xs' : 'text-zinc-500'}`}
            >
              Wide
            </button>
          </div>

          {/* Close Reflow Mode */}
          <button
            onClick={onClose}
            title="Exit Reflow Mode (Esc)"
            className="h-8 px-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center gap-1.5 text-xs font-semibold hover:bg-accent dark:hover:bg-accent dark:hover:text-white transition-all shadow-xs"
          >
            <X className="h-3.5 w-3.5" />
            <span>Close Reader</span>
          </button>
        </div>

      </header>

      {/* 2. Reader Body */}
      <div className="flex-1 overflow-y-auto py-12 px-6 flex justify-center bg-background">
        <div 
          style={{ 
            maxWidth: `${settings.maxWidth}px`,
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
          }}
          className={`w-full flex flex-col gap-12 ${getFontFamilyClass(settings.fontFamily)}`}
        >
          {pagesText.length === 0 ? (
            <div className="text-center py-20 text-zinc-400">
              <p>Extracting text from PDF...</p>
            </div>
          ) : (
            pagesText.map((p) => (
              <article key={p.pageNum} className="flex flex-col gap-4 border-b border-border pb-10">
                {/* Page Breadcrumb Header */}
                <div className="flex items-center justify-between text-xs font-mono opacity-60">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">PAGE {p.pageNum}</span>
                    <button
                      onClick={() => {
                        onNavigateToPage(p.pageNum);
                        onClose();
                      }}
                      className="flex items-center gap-1 text-[11px] underline hover:opacity-100 transition-opacity"
                    >
                      <span>Jump to Canvas</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyText(p.text, p.pageNum)}
                      className="flex items-center gap-1 hover:opacity-100 transition-opacity"
                    >
                      {copiedPage === p.pageNum ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedPage === p.pageNum ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Reflowed Text Content */}
                <div className="whitespace-pre-wrap leading-relaxed tracking-wide">
                  {p.text ? p.text : <span className="italic opacity-40">[No text found on this page or scanned bitmap image]</span>}
                </div>
              </article>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
