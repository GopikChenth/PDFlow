import React, { useState, useRef, useEffect } from 'react';
import { 
  Highlighter, 
  Globe, 
  Copy, 
  Check, 
  StickyNote, 
  Search, 
  X,
  Palette
} from 'lucide-react';

export interface SelectionData {
  text: string;
  pageNum: number;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
  clientRect: {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
}

const HIGHLIGHT_COLORS = [
  { label: 'Yellow', hex: '#facc15' },
  { label: 'Green', hex: '#10b981' },
  { label: 'Sky Blue', hex: '#0ea5e9' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Purple', hex: '#8b5cf6' },
  { label: 'Amber', hex: '#f59e0b' },
] as const;

interface TextSelectionToolbarProps {
  selectionData: SelectionData | null;
  onHighlight: (color: string) => void;
  onSearchOnline: (text: string) => void;
  onSearchInDoc?: (text: string) => void;
  onAddStickyNote?: (text: string) => void;
  onClose: () => void;
  defaultColor?: string;
  isStudyMode?: boolean;
}

export default function TextSelectionToolbar({
  selectionData,
  onHighlight,
  onSearchOnline,
  onSearchInDoc,
  onAddStickyNote,
  onClose,
  defaultColor = '#facc15',
  isStudyMode = false,
}: TextSelectionToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [currentColor, setCurrentColor] = useState(defaultColor);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCopied(false);
    setShowPalette(false);
  }, [selectionData?.text]);

  if (!selectionData || !selectionData.text.trim()) {
    return null;
  }

  const { clientRect, text } = selectionData;

  // Position calculation in viewport coordinates
  // Clamp X so toolbar doesn't overflow screen
  const targetX = clientRect.left + clientRect.width / 2;
  const clampedX = Math.max(160, Math.min(window.innerWidth - 160, targetX));

  // Place above selection if there's enough space, otherwise place below
  const placeBelow = clientRect.top < 65;
  const targetY = placeBelow ? clientRect.bottom + 8 : clientRect.top - 8;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleQuickHighlight = (e: React.MouseEvent, color?: string) => {
    e.stopPropagation();
    const chosenColor = color || currentColor;
    setCurrentColor(chosenColor);
    onHighlight(chosenColor);
  };

  const handleSearchOnline = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSearchOnline(text);
  };

  return (
    <div
      ref={toolbarRef}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: `${clampedX}px`,
        top: `${targetY}px`,
        transform: placeBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
        backgroundColor: '#18181b',
      }}
      className="z-[90] flex flex-col gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-700/90 shadow-[0_16px_50px_rgba(0,0,0,0.65)] text-zinc-100 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Main Action Bar */}
      <div className="flex items-center gap-1">
        
        {/* 1. Highlight Button */}
        <div className="flex items-center rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 transition-colors p-0.5">
          <button
            type="button"
            onClick={(e) => handleQuickHighlight(e)}
            title={`Highlight text in ${currentColor} (Click to highlight)`}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-zinc-200 hover:text-white transition-colors"
          >
            <div 
              className="h-3 w-3 rounded-full shadow-xs ring-1 ring-black/40 flex-shrink-0"
              style={{ backgroundColor: currentColor }}
            />
            <Highlighter className="h-3.5 w-3.5 text-zinc-300" />
            <span>Highlight</span>
          </button>

          {/* Color Palette Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPalette((prev) => !prev);
            }}
            title="Choose highlight color"
            className="h-6 w-6 rounded flex items-center justify-center hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Palette className="h-3 w-3" />
          </button>
        </div>

        <div className="w-[1px] h-4 bg-zinc-800 mx-0.5" />

        {/* 2. Search Online (Web Search) */}
        <button
          type="button"
          onClick={handleSearchOnline}
          title="Search Google in new tab"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-medium transition-colors"
        >
          <Globe className="h-3.5 w-3.5 text-blue-400" />
          <span>Search Online</span>
        </button>

        {/* 3. Search in Document */}
        {onSearchInDoc && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSearchInDoc(text);
            }}
            title="Find all occurrences in this document (Ctrl+F)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-medium transition-colors"
          >
            <Search className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Find in Doc</span>
          </button>
        )}

        {/* 4. Add Sticky Note */}
        {onAddStickyNote && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddStickyNote(text);
            }}
            title="Create Sticky Note for this quote"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-medium transition-colors"
          >
            <StickyNote className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden md:inline">Note</span>
          </button>
        )}

        <div className="w-[1px] h-4 bg-zinc-800 mx-0.5" />

        {/* 5. Copy Text Button */}
        <button
          type="button"
          onClick={handleCopy}
          title="Copy selected text to clipboard"
          className="h-7 px-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>

        {/* Close button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="Dismiss selection menu"
          className="h-7 w-7 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors ml-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expandable Highlight Colors Strip */}
      {showPalette && (
        <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 border-t border-zinc-800/80 mt-0.5 bg-zinc-950/80 rounded-lg">
          <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">Highlight Color:</span>
          <div className="flex items-center gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={(e) => handleQuickHighlight(e, c.hex)}
                title={`Highlight in ${c.label}`}
                className={`h-5 w-5 rounded-full transition-all flex items-center justify-center ${
                  currentColor === c.hex
                    ? 'ring-2 ring-white scale-110 shadow-sm'
                    : 'hover:scale-110 opacity-85 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {currentColor === c.hex && <Check className="h-2.5 w-2.5 text-black stroke-[3]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Study Mode Indicator Badge */}
      {isStudyMode && (
        <div className="px-2 py-0.5 bg-blue-950/60 border-t border-blue-800/40 rounded-b-lg flex items-center justify-between text-[9px] font-mono text-blue-300">
          <span>Study Mode Active</span>
          <span>Instant Capture</span>
        </div>
      )}
    </div>
  );
}
