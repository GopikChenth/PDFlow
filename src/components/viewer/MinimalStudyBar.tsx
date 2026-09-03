import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Search,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
  Sun,
  Moon,
  BookOpen,
  FileText,
  Columns
} from 'lucide-react';
import { PageLayoutMode } from '../../types';
import PomodoroTimer from './PomodoroTimer';

interface MinimalStudyBarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onZoomReset: () => void;
  layoutMode: PageLayoutMode;
  onToggleLayoutMode: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  studyTint: 'default' | 'sepia' | 'dark';
  onSelectStudyTint: (tint: 'default' | 'sepia' | 'dark') => void;
  isPinned: boolean;
  onTogglePin: () => void;
  onExitStudyMode: () => void;
}

export default function MinimalStudyBar({
  currentPage,
  totalPages,
  onPageChange,
  scale,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onFitPage,
  onZoomReset,
  layoutMode,
  onToggleLayoutMode,
  isSidebarOpen,
  onToggleSidebar,
  isSearchOpen,
  onToggleSearch,
  studyTint,
  onSelectStudyTint,
  isPinned,
  onTogglePin,
  onExitStudyMode,
}: MinimalStudyBarProps) {
  const [inputVal, setInputVal] = useState<string>(String(currentPage));

  useEffect(() => {
    setInputVal(String(currentPage));
  }, [currentPage]);

  const handleInputSubmit = (e: React.FormEvent | React.KeyboardEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    const parsed = parseInt(inputVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      onPageChange(parsed);
    } else {
      setInputVal(String(currentPage));
    }
  };

  return (
    <div className="h-10 bg-zinc-950 border-b border-zinc-800/80 px-2 sm:px-4 flex items-center justify-between text-zinc-300 select-none shadow-lg z-50 flex-shrink-0">
      
      {/* Left: Sidebar toggle & Page Navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Hide Thumbnails Sidebar [B]" : "Show Thumbnails Sidebar [B]"}
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>

        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

        {/* Prev Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          title="Previous Page [← / PageUp]"
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page Input Box (Matches Firefox/Chrome minimal reader style) */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleInputSubmit}
            onBlur={handleInputSubmit}
            className="w-10 h-6 bg-zinc-900 border border-zinc-700/80 rounded text-center text-xs font-semibold text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 tabular-nums"
            title="Jump to page"
          />
          <span className="text-zinc-500 text-xs">of {totalPages || 1}</span>
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          title="Next Page [→ / PageDown]"
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-zinc-800 disabled:opacity-30 text-zinc-300 hover:text-white transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Center: Zoom Controls & Fit Presets */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={scale <= 0.4}
          title="Zoom Out [-]"
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onZoomReset}
          title="Reset Zoom to 100%"
          className="h-6 px-2 rounded-md hover:bg-zinc-800 text-[11px] font-mono font-semibold text-zinc-300 hover:text-white transition-colors tabular-nums"
        >
          {Math.round(scale * 100)}%
        </button>

        <button
          type="button"
          onClick={onZoomIn}
          disabled={scale >= 2.5}
          title="Zoom In [+]"
          className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-zinc-800 mx-1 hidden sm:block" />

        {/* Fit Width */}
        <button
          type="button"
          onClick={onFitWidth}
          title="Fit to Width [W]"
          className="h-6 px-2 rounded-md hover:bg-zinc-800 text-[11px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors hidden sm:inline-flex items-center"
        >
          Fit W
        </button>

        {/* Fit Page */}
        <button
          type="button"
          onClick={onFitPage}
          title="Fit Page [P]"
          className="h-6 px-2 rounded-md hover:bg-zinc-800 text-[11px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors hidden sm:inline-flex items-center"
        >
          Fit H
        </button>

        {/* Continuous vs Single Page toggle */}
        <button
          type="button"
          onClick={onToggleLayoutMode}
          title={layoutMode === 'continuous' ? "Switch to Single Page Presentation" : "Switch to Continuous Scroll"}
          className="h-7 px-2 rounded-md hover:bg-zinc-800 text-[11px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors hidden md:inline-flex items-center gap-1"
        >
          {layoutMode === 'continuous' ? (
            <>
              <Columns className="h-3 w-3" />
              <span>Continuous</span>
            </>
          ) : (
            <>
              <FileText className="h-3 w-3" />
              <span>Single</span>
            </>
          )}
        </button>
      </div>

      {/* Right: Pomodoro Timer, Study Tints, Search, Pin Toolbar, and Exit */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        
        {/* Pomodoro Study Timer with Custom Intervals */}
        <PomodoroTimer />

        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5 hidden sm:block" />

        {/* Study Tint Options (Eye Strain Protection) */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5" title="Reading Tint for Eye Comfort">
          <button
            type="button"
            onClick={() => onSelectStudyTint('default')}
            title="Natural Paper"
            className={`h-6 px-1.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
              studyTint === 'default'
                ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sun className="h-3 w-3" />
            <span className="hidden xl:inline">Normal</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectStudyTint('sepia')}
            title="Warm Paper (Sepia / Eye-Care)"
            className={`h-6 px-1.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
              studyTint === 'sepia'
                ? 'bg-amber-600 text-white font-semibold shadow-xs'
                : 'text-amber-500/80 hover:text-amber-400'
            }`}
          >
            <BookOpen className="h-3 w-3" />
            <span className="hidden xl:inline">Sepia</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectStudyTint('dark')}
            title="Dark Invert (Night Study)"
            className={`h-6 px-1.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
              studyTint === 'dark'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Moon className="h-3 w-3" />
            <span className="hidden xl:inline">Night</span>
          </button>
        </div>

        {/* Search */}
        <button
          type="button"
          onClick={onToggleSearch}
          title="Search Document [⌘F]"
          className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
            isSearchOpen
              ? 'bg-blue-600 text-white'
              : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
          }`}
        >
          <Search className="h-3.5 w-3.5" />
        </button>

        {/* Pin / Auto-Hide Top Bar */}
        <button
          type="button"
          onClick={onTogglePin}
          title={isPinned ? "Toolbar Pinned (Click to auto-hide while reading)" : "Toolbar Auto-Hiding (Click to pin)"}
          className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors hidden sm:flex ${
            isPinned 
              ? 'text-blue-400 hover:bg-zinc-800' 
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
          }`}
        >
          {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
        </button>

        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

        {/* Exit Study Mode */}
        <button
          type="button"
          onClick={onExitStudyMode}
          title="Exit Minimal Study Mode [Esc]"
          className="h-7 px-2.5 rounded-md bg-zinc-900 hover:bg-rose-500/20 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/40 text-xs font-medium text-zinc-300 transition-all flex items-center gap-1.5 shadow-xs"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          <span>Exit <kbd className="hidden md:inline text-[9px] font-mono opacity-70 bg-zinc-800 px-1 rounded">Esc</kbd></span>
        </button>
      </div>

    </div>
  );
}
