import { useState, useCallback } from 'react';
import { 
  MousePointer, 
  Highlighter, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Spline, 
  MessageSquareQuote, 
  PenTool, 
  Square, 
  ArrowUpRight, 
  Minus, 
  Plus,
  Hexagon, 
  Ruler, 
  DraftingCompass, 
  Type, 
  StickyNote, 
  Mic, 
  Undo2, 
  Redo2, 
  Download, 
  Trash2, 
  ChevronUp, 
  Palette
} from 'lucide-react';
import { AnnotationToolType } from '../../types';

// Hoisted constants outside component body (rerender-memo-with-default-value, rendering-hoist-jsx)
const ANNOTATION_COLORS = [
  { label: 'Yellow', hex: '#facc15' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Sky Blue', hex: '#0ea5e9' },
  { label: 'Purple', hex: '#8b5cf6' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Dark Charcoal', hex: '#18181b' },
] as const;

const STROKE_SIZES = [1, 2, 4, 6, 8] as const;

const TEXT_MARKUP_TOOLS = new Set<AnnotationToolType>([
  'highlight', 
  'underline', 
  'strikeout', 
  'squiggly', 
  'callout'
]);

const SHAPE_TOOLS = new Set<AnnotationToolType>([
  'pen', 
  'rectangle', 
  'arrow', 
  'line', 
  'polygon'
]);

const MEASURE_TOOLS = new Set<AnnotationToolType>([
  'measure-distance', 
  'measure-area'
]);

interface FloatingAnnotationToolbarProps {
  activeTool: AnnotationToolType;
  onSelectTool: (tool: AnnotationToolType) => void;
  activeColor: string;
  onSelectColor: (color: string) => void;
  strokeWidth: number;
  onSelectStrokeWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearPageAnnotations: () => void;
  onExportXFDF: () => void;
  onExportJSON: () => void;
  // Zoom & View Controls
  scale?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onSetScale?: (scale: number) => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  focusMode?: boolean;
}

export default function FloatingAnnotationToolbar({
  activeTool,
  onSelectTool,
  activeColor,
  onSelectColor,
  strokeWidth,
  onSelectStrokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearPageAnnotations,
  onExportXFDF,
  onExportJSON,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onSetScale,
  onFitWidth,
  onFitPage,
  focusMode,
}: FloatingAnnotationToolbarProps) {
  const [showMarkupMenu, setShowMarkupMenu] = useState(false);
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showMeasureMenu, setShowMeasureMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const closeAllMenus = useCallback(() => {
    setShowMarkupMenu(false);
    setShowShapesMenu(false);
    setShowMeasureMenu(false);
    setShowColorMenu(false);
    setShowExportMenu(false);
  }, []);

  const isTextMarkupActive = TEXT_MARKUP_TOOLS.has(activeTool);
  const isShapeActive = SHAPE_TOOLS.has(activeTool);
  const isMeasureActive = MEASURE_TOOLS.has(activeTool);

  return (
    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[96vw] overflow-x-auto no-scrollbar flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-2xl bg-card/95 dark:bg-card/95 border border-border shadow-2xl backdrop-blur-xl text-zinc-800 dark:text-zinc-200 select-none animate-in fade-in slide-in-from-bottom-3 duration-200 ${
      focusMode ? 'opacity-30 hover:opacity-100' : 'opacity-100'
    }`}>
      
      {/* 1. Pointer / Select Tool */}
      <button
        onClick={() => {
          onSelectTool('select');
          closeAllMenus();
        }}
        title="Select & Navigate (V)"
        className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
          activeTool === 'select' 
            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs font-bold' 
            : 'hover:bg-surface dark:hover:bg-surface text-zinc-600 dark:text-zinc-400'
        }`}
      >
        <MousePointer className="h-4 w-4" />
      </button>

      <div className="w-[1px] h-4 bg-border mx-0.5 flex-shrink-0" />

      {/* 2. Text Markup Group Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => {
            setShowMarkupMenu((p) => !p);
            setShowShapesMenu(false);
            setShowMeasureMenu(false);
            setShowColorMenu(false);
            setShowExportMenu(false);
          }}
          title="Text Markup Tools (Highlight, Underline, Strikeout, Squiggly, Callout)"
          className={`h-8 px-2.5 rounded-xl border flex items-center gap-1 text-xs font-semibold whitespace-nowrap transition-all ${
            isTextMarkupActive 
              ? 'bg-accent text-white border-accent shadow-xs' 
              : 'border-border hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'
          }`}
        >
          {activeTool === 'highlight' ? <Highlighter className="h-3.5 w-3.5" /> :
           activeTool === 'underline' ? <UnderlineIcon className="h-3.5 w-3.5" /> :
           activeTool === 'strikeout' ? <Strikethrough className="h-3.5 w-3.5" /> :
           activeTool === 'squiggly' ? <Spline className="h-3.5 w-3.5" /> :
           activeTool === 'callout' ? <MessageSquareQuote className="h-3.5 w-3.5" /> :
           <Highlighter className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline capitalize">
            {isTextMarkupActive ? activeTool : 'Markup'}
          </span>
          <ChevronUp className="h-3 w-3 opacity-60" />
        </button>

        {showMarkupMenu && (
          <div 
            onClick={() => setShowMarkupMenu(false)}
            className="absolute bottom-11 left-0 z-50 w-48 p-1.5 rounded-xl bg-card/95 dark:bg-card/95 border border-border shadow-2xl backdrop-blur-xl flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95"
          >
            <div className="px-2 py-1 text-[10px] font-mono text-zinc-400 uppercase font-semibold">Text Markup</div>
            <button
              onClick={() => onSelectTool('highlight')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${activeTool === 'highlight' ? 'bg-accent text-white font-bold' : 'hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'}`}
            >
              <Highlighter className="h-3.5 w-3.5 text-amber-500" />
              <span>Highlight</span>
            </button>
            <button
              onClick={() => onSelectTool('underline')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${activeTool === 'underline' ? 'bg-accent text-white font-bold' : 'hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'}`}
            >
              <UnderlineIcon className="h-3.5 w-3.5 text-emerald-500" />
              <span>Underline</span>
            </button>
            <button
              onClick={() => onSelectTool('strikeout')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${activeTool === 'strikeout' ? 'bg-accent text-white font-bold' : 'hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'}`}
            >
              <Strikethrough className="h-3.5 w-3.5 text-rose-500" />
              <span>Strikethrough</span>
            </button>
            <button
              onClick={() => onSelectTool('squiggly')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${activeTool === 'squiggly' ? 'bg-accent text-white font-bold' : 'hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'}`}
            >
              <Spline className="h-3.5 w-3.5 text-purple-500" />
              <span>Squiggly Underline</span>
            </button>
            <button
              onClick={() => onSelectTool('callout')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${activeTool === 'callout' ? 'bg-accent text-white font-bold' : 'hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'}`}
            >
              <MessageSquareQuote className="h-3.5 w-3.5 text-sky-500" />
              <span>Text Callout</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Drawing & Shapes Group Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => {
            setShowShapesMenu((p) => !p);
            setShowMarkupMenu(false);
            setShowMeasureMenu(false);
            setShowColorMenu(false);
            setShowExportMenu(false);
          }}
          title="Drawing & Shapes (Pen, Rectangle, Arrow, Line, Polygon)"
          className={`h-8 px-2.5 rounded-xl border flex items-center gap-1 text-xs font-semibold whitespace-nowrap transition-all ${
            isShapeActive 
              ? 'bg-accent text-white border-accent shadow-xs' 
              : 'border-border hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'
          }`}
        >
          {activeTool === 'pen' ? <PenTool className="h-3.5 w-3.5" /> :
           activeTool === 'rectangle' ? <Square className="h-3.5 w-3.5" /> :
           activeTool === 'arrow' ? <ArrowUpRight className="h-3.5 w-3.5" /> :
           activeTool === 'line' ? <Minus className="h-3.5 w-3.5" /> :
           activeTool === 'polygon' ? <Hexagon className="h-3.5 w-3.5" /> :
           <PenTool className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline capitalize">
            {isShapeActive ? activeTool : 'Shapes'}
          </span>
          <ChevronUp className="h-3 w-3 opacity-60" />
        </button>

        {showShapesMenu && (
          <div 
            onClick={() => setShowShapesMenu(false)}
            className="absolute bottom-11 left-0 z-50 w-48 p-1.5 rounded-xl bg-card/95 dark:bg-card/95 border border-border shadow-2xl backdrop-blur-xl flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95"
          >
            <div className="px-2 py-1 text-[10px] font-mono text-zinc-400 uppercase font-semibold">Drawing & Shapes</div>
            <button
              onClick={() => onSelectTool('pen')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${activeTool === 'pen' ? 'bg-accent text-white font-bold' : 'hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'}`}
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>Freehand Pen</span>
            </button>
            <button
              onClick={() => onSelectTool('rectangle')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${activeTool === 'rectangle' ? 'bg-accent text-white font-bold' : 'hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'}`}
            >
              <Square className="h-3.5 w-3.5" />
              <span>Rectangle</span>
            </button>
            <button
              onClick={() => onSelectTool('arrow')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${activeTool === 'arrow' ? 'bg-accent text-white font-bold' : 'hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'}`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Arrow Pointer</span>
            </button>
            <button
              onClick={() => onSelectTool('line')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${activeTool === 'line' ? 'bg-accent text-white font-bold' : 'hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'}`}
            >
              <Minus className="h-3.5 w-3.5" />
              <span>Straight Line</span>
            </button>
            <button
              onClick={() => onSelectTool('polygon')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${activeTool === 'polygon' ? 'bg-accent text-white font-bold' : 'hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'}`}
            >
              <Hexagon className="h-3.5 w-3.5" />
              <span>Polygon Area</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Measuring Tools Group Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => {
            setShowMeasureMenu((p) => !p);
            setShowMarkupMenu(false);
            setShowShapesMenu(false);
            setShowColorMenu(false);
            setShowExportMenu(false);
          }}
          title="Measuring Tools (Distance / Perimeter & Area)"
          className={`h-8 px-2.5 rounded-xl border flex items-center gap-1 text-xs font-semibold whitespace-nowrap transition-all ${
            isMeasureActive 
              ? 'bg-accent text-white border-accent shadow-xs' 
              : 'border-border hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'
          }`}
        >
          {activeTool === 'measure-distance' ? <Ruler className="h-3.5 w-3.5" /> : <DraftingCompass className="h-3.5 w-3.5" />}
          <span className="hidden md:inline">Measure</span>
          <ChevronUp className="h-3 w-3 opacity-60" />
        </button>

        {showMeasureMenu && (
          <div 
            onClick={() => setShowMeasureMenu(false)}
            className="absolute bottom-11 left-0 z-50 w-52 p-1.5 rounded-xl bg-card/95 dark:bg-card/95 border border-border shadow-2xl backdrop-blur-xl flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95"
          >
            <div className="px-2 py-1 text-[10px] font-mono text-zinc-400 uppercase font-semibold">Measuring Tools</div>
            <button
              onClick={() => onSelectTool('measure-distance')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${activeTool === 'measure-distance' ? 'bg-accent text-white font-bold' : 'hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'}`}
            >
              <Ruler className="h-3.5 w-3.5 text-accent" />
              <div>
                <div className="font-semibold">Distance & Perimeter</div>
                <div className="text-[10px] opacity-70 font-mono">Calibrated line length</div>
              </div>
            </button>
            <button
              onClick={() => onSelectTool('measure-area')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${activeTool === 'measure-area' ? 'bg-accent text-white font-bold' : 'hover:bg-surface dark:hover:bg-surface text-zinc-800 dark:text-zinc-200'}`}
            >
              <DraftingCompass className="h-3.5 w-3.5 text-accent" />
              <div>
                <div className="font-semibold">Area Calculation</div>
                <div className="text-[10px] opacity-70 font-mono">Multi-point surface area</div>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-border mx-0.5 flex-shrink-0" />

      {/* 5. Text Box Tool */}
      <button
        onClick={() => {
          onSelectTool('textbox');
          closeAllMenus();
        }}
        title="Text Box Tool (T) — Click anywhere on canvas to type"
        className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
          activeTool === 'textbox' 
            ? 'bg-accent text-white shadow-xs' 
            : 'hover:bg-surface dark:hover:bg-surface text-zinc-600 dark:text-zinc-400'
        }`}
      >
        <Type className="h-4 w-4" />
      </button>

      {/* 6. Sticky Note Tool */}
      <button
        onClick={() => {
          onSelectTool('sticky-note');
          closeAllMenus();
        }}
        title="Sticky Note (N) — Click anywhere to add a threaded comment pin"
        className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
          activeTool === 'sticky-note' 
            ? 'bg-amber-500 text-white shadow-xs' 
            : 'hover:bg-surface dark:hover:bg-surface text-zinc-600 dark:text-zinc-400'
        }`}
      >
        <StickyNote className="h-4 w-4" />
      </button>

      {/* 7. Voice Note Memo Tool */}
      <button
        onClick={() => {
          onSelectTool('voice-note');
          closeAllMenus();
        }}
        title="Voice Note (M) — Click anywhere to record an embedded voice comment"
        className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
          activeTool === 'voice-note' 
            ? 'bg-rose-500 text-white shadow-xs' 
            : 'hover:bg-surface dark:hover:bg-surface text-zinc-600 dark:text-zinc-400'
        }`}
      >
        <Mic className="h-4 w-4" />
      </button>

      <div className="w-[1px] h-4 bg-border mx-0.5 flex-shrink-0" />

      {/* 8. Color Palette & Stroke Picker Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => {
            setShowColorMenu((p) => !p);
            setShowMarkupMenu(false);
            setShowShapesMenu(false);
            setShowMeasureMenu(false);
            setShowExportMenu(false);
          }}
          title="Annotation Color & Stroke Width"
          className="h-8 px-2 rounded-xl border border-border hover:bg-surface dark:hover:bg-surface flex items-center gap-1.5 transition-all shadow-xs"
        >
          <div 
            className="h-3.5 w-3.5 rounded-full shadow-xs ring-1 ring-black/20"
            style={{ backgroundColor: activeColor }}
          />
          <span className="text-[11px] font-mono font-medium hidden sm:inline">{strokeWidth}px</span>
          <ChevronUp className="h-3 w-3 opacity-60" />
        </button>

        {showColorMenu && (
          <div 
            className="absolute bottom-11 right-0 z-50 w-52 p-3 rounded-2xl bg-card/95 dark:bg-card/95 border border-border shadow-2xl backdrop-blur-xl flex flex-col gap-3 text-xs animate-in fade-in zoom-in-95"
          >
            {/* Color Palette */}
            <div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase font-semibold mb-1.5 flex items-center gap-1">
                <Palette className="h-3 w-3" /> Color Palette
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ANNOTATION_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      onSelectColor(c.hex);
                      setShowColorMenu(false);
                    }}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                    className={`h-5 w-5 rounded-full transition-transform border border-black/15 dark:border-white/20 ${
                      activeColor === c.hex ? 'scale-125 ring-2 ring-zinc-900 dark:ring-zinc-100' : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Stroke Width Selector */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] font-mono text-zinc-400 uppercase font-semibold mb-1.5">
                Stroke Width
              </div>
              <div className="flex items-center justify-between gap-1 bg-zinc-50 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                {STROKE_SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      onSelectStrokeWidth(sz);
                      setShowColorMenu(false);
                    }}
                    className={`h-6 px-2 rounded-lg text-xs font-mono font-semibold transition-all ${
                      strokeWidth === sz ? 'bg-accent text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {sz}px
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5 flex-shrink-0" />

      {/* 9. Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo Annotation (⌘Z)"
        className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-600 dark:text-zinc-400 transition-colors flex-shrink-0"
      >
        <Undo2 className="h-4 w-4" />
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo Annotation (⌘⇧Z)"
        className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 text-zinc-600 dark:text-zinc-400 transition-colors flex-shrink-0"
      >
        <Redo2 className="h-4 w-4" />
      </button>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5 flex-shrink-0" />

      {/* 10. Export Annotations Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => {
            setShowExportMenu((p) => !p);
            setShowMarkupMenu(false);
            setShowShapesMenu(false);
            setShowMeasureMenu(false);
            setShowColorMenu(false);
          }}
          title="Export Annotations (XFDF / JSON)"
          className="h-8 px-2.5 rounded-xl border border-border hover:bg-surface dark:hover:bg-surface flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-zinc-700 dark:text-zinc-300 transition-all shadow-xs"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Export</span>
        </button>

        {showExportMenu && (
          <div 
            onClick={() => setShowExportMenu(false)}
            className="absolute bottom-11 right-0 z-50 w-52 p-1.5 rounded-xl bg-card/95 dark:bg-card/95 border border-border shadow-2xl backdrop-blur-xl flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95"
          >
            <div className="px-2 py-1 text-[10px] font-mono text-zinc-400 uppercase font-semibold">Export Annotations</div>
            <button
              onClick={onExportXFDF}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-white transition-colors group"
            >
              <Download className="h-3.5 w-3.5 text-accent group-hover:text-white" />
              <div>
                <div className="font-semibold">Adobe XFDF Format</div>
                <div className="text-[10px] opacity-70 font-mono">Compatible with Acrobat Pro</div>
              </div>
            </button>
            <button
              onClick={onExportJSON}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-accent hover:text-white transition-colors group"
            >
              <Download className="h-3.5 w-3.5 text-accent group-hover:text-white" />
              <div>
                <div className="font-semibold">Structured JSON Export</div>
                <div className="text-[10px] opacity-70 font-mono">Full annotations payload</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* 11. Clear Page Annotations */}
      <button
        onClick={onClearPageAnnotations}
        title="Clear annotations on this page"
        className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-rose-500/10 hover:text-rose-500 text-zinc-400 transition-colors flex-shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* 12. Zoom & Layout Controls (Unified inside same dock with clean layout) */}
      {typeof scale === 'number' && (
        <>
          <div className="w-[1px] h-5 bg-border mx-1 flex-shrink-0" />

          {onFitWidth && (
            <button
              onClick={onFitWidth}
              title="Fit to Width"
              className="h-8 px-2.5 rounded-xl border border-border hover:bg-surface dark:hover:bg-surface text-xs font-semibold whitespace-nowrap text-zinc-800 dark:text-zinc-200 transition-all flex items-center gap-1 flex-shrink-0"
            >
              <span>Fit W</span>
            </button>
          )}

          {onFitPage && (
            <button
              onClick={onFitPage}
              title="Fit to Page"
              className="h-8 px-2.5 rounded-xl border border-border hover:bg-surface dark:hover:bg-surface text-xs font-semibold whitespace-nowrap text-zinc-800 dark:text-zinc-200 transition-all hidden sm:inline-flex items-center gap-1 flex-shrink-0"
            >
              <span>Fit H</span>
            </button>
          )}

          {onZoomOut && (
            <button
              onClick={onZoomOut}
              disabled={scale <= 0.4}
              title="Zoom Out (-)"
              className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-surface dark:hover:bg-surface disabled:opacity-30 transition-colors text-zinc-700 dark:text-zinc-300 flex-shrink-0"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          )}

          {onSetScale && (
            <input
              type="range"
              min="40"
              max="250"
              step="1"
              value={Math.round(scale * 100)}
              onChange={(e) => onSetScale(parseFloat(e.target.value) / 100)}
              className="w-16 sm:w-20 md:w-24 h-1.5 bg-surface rounded-full appearance-none cursor-pointer accent-accent hidden md:inline-block flex-shrink-0 border border-border"
              title={`Zoom: ${Math.round(scale * 100)}%`}
            />
          )}

          {onZoomIn && (
            <button
              onClick={onZoomIn}
              disabled={scale >= 2.5}
              title="Zoom In (+)"
              className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-surface dark:hover:bg-surface disabled:opacity-30 transition-colors text-zinc-700 dark:text-zinc-300 flex-shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}

          {onZoomReset && (
            <button
              onClick={onZoomReset}
              title="Reset to 100%"
              className="h-8 px-2.5 rounded-xl bg-surface dark:bg-surface border border-border hover:border-accent text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 transition-all whitespace-nowrap shadow-2xs flex-shrink-0"
            >
              {Math.round(scale * 100)}%
            </button>
          )}
        </>
      )}

    </div>
  );
}
